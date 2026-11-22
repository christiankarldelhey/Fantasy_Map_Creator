// ============================================================================
// Seasonal/weather variants of region descriptions
// ----------------------------------------------------------------------------
// Decides which variant a narrated day falls under and resolves the matching
// seeded phrases. Both phrase sources live in places_narration (#104):
//
//   - scope-bound dep:biome:* depictions' variants (terrain/road categories)
//   - the region depiction's variants      (the "lands crossed" summary)
//
// Both are resolved here in Node because the day generator already knows the
// date and the sampled weather; the mind-engine then sees plain phrase
// lists, same shape as before — no contract change, and a database that
// predates the variant column simply yields base phrases.
//
// Variant keys: 'spring' | 'summer' | 'autumn' | 'winter' (season, always
// present — the day-order never lacks a season) plus the weather keys
// 'rain' | 'snow' | 'cold' | 'heat' | 'wind'.
// ('base' is the fallback, never stored explicitly here.)
//
// Pick order, most specific first:
//   snow, rain, wind, extreme heat/cold, season, mild cold/heat, base
// So a clear winter day reads as 'winter', a snowy winter day as 'snow',
// and an autumn cold snap as 'cold' rather than swallowing the season.
// Thresholds mirror mind-engine/app/natural_language/climate_notes.py.
// ============================================================================

import pool from '../../../../db.js';
import { innerClimate } from '../../../map/services/data/climateData.js';

const SNOW_TEMP_MAX = 1.0;
const RAIN_TOTAL_MIN = 1.5;
const RAIN_SAMPLE_MIN = 0.5;
const HEAT_EXTREME_MIN = 30;
const COLD_EXTREME_MAX = -5;
const HEAT_MILD_MIN = 27;
const COLD_MILD_MAX = 6;
const WIND_MIN = 18;

/**
 * 'spring' | 'summer' | 'autumn' | 'winter' from a YYYY-MM-DD date — the
 * single season selector, deterministic and total: every real date maps to
 * exactly one season. Middle-earth seasons follow the northern hemisphere.
 */
export function seasonOfDate(dateISO) {
  const month = Number(String(dateISO || '').slice(5, 7));
  if (!month) return null;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

function weatherSignature(climateArray) {
  const records = (Array.isArray(climateArray) ? climateArray : [])
    .map(innerClimate)
    .filter(Boolean);
  const temps = records
    .map((w) => w.temperature_2m)
    .filter((v) => typeof v === 'number');
  // Liquid precipitation only: precipitation below the snow line counts
  // toward snow, not rain.
  const rainPrecips = records
    .filter((w) => typeof w.temperature_2m !== 'number' || w.temperature_2m > SNOW_TEMP_MAX)
    .map((w) => w.precipitation || 0)
    .filter((v) => typeof v === 'number');
  const winds = records
    .map((w) => w.wind_speed_10m)
    .filter((v) => typeof v === 'number');

  return {
    meanTemp: temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : null,
    meanWind: winds.length ? winds.reduce((a, b) => a + b, 0) / winds.length : null,
    totalPrecip: rainPrecips.reduce((a, b) => a + b, 0),
    maxSamplePrecip: rainPrecips.length ? Math.max(...rainPrecips) : 0,
    snow: records.some(
      (w) => typeof w.temperature_2m === 'number'
        && w.temperature_2m <= SNOW_TEMP_MAX
        && (w.precipitation || 0) > 0
    ),
  };
}

/**
 * Ordered variant keys for the day, 'base' last. For each (region, category)
 * cell the first variant with seeded phrases wins; cells without one fall
 * through to the next — a snowy winter day can still use 'winter' for
 * categories that have no 'snow' rows.
 * @param {string} dateISO YYYY-MM-DD
 * @param {Array} climate day.climate samples
 * @returns {string[]} e.g. ['snow', 'winter', 'base']
 */
export function variantOrderForDay(dateISO, climate) {
  const sig = weatherSignature(climate);
  const order = [];

  if (sig.snow) order.push('snow');
  if (sig.totalPrecip >= RAIN_TOTAL_MIN || sig.maxSamplePrecip >= RAIN_SAMPLE_MIN) order.push('rain');
  if (sig.meanWind !== null && sig.meanWind >= WIND_MIN) order.push('wind');
  if (sig.meanTemp !== null && sig.meanTemp >= HEAT_EXTREME_MIN) order.push('heat');
  if (sig.meanTemp !== null && sig.meanTemp <= COLD_EXTREME_MAX) order.push('cold');

  const season = seasonOfDate(dateISO);
  if (season) order.push(season);

  if (sig.meanTemp !== null && sig.meanTemp <= COLD_MILD_MAX && !order.includes('cold')) order.push('cold');
  if (sig.meanTemp !== null && sig.meanTemp >= HEAT_MILD_MIN && !order.includes('heat')) order.push('heat');

  order.push('base');
  return order;
}

/**
 * Pick a seasonal/weather summary for a region, or null when none applies.
 * @param {Object} summariesMap { regionName: { variant: [phrase, ...] } }
 * @param {string[]} variantOrder output of variantOrderForDay
 */
export function pickSeasonalSummary(summariesMap, regionName, variantOrder, rng = Math.random) {
  const byVariant = (summariesMap || {})[regionName];
  if (!byVariant) return null;
  for (const variant of variantOrder) {
    if (variant === 'base') continue;
    const phrases = byVariant[variant];
    if (Array.isArray(phrases) && phrases.length > 0) {
      return phrases[Math.floor(rng() * phrases.length)];
    }
  }
  return null;
}

/**
 * Load seasonal/weather summary variants for a set of regions.
 * @returns {Promise<Object>} { regionName: { variant: [phrase, ...] } }
 */
export async function loadSeasonalSummaries(regionNames) {
  if (!Array.isArray(regionNames) || regionNames.length === 0) {
    return {};
  }
  try {
    const { rows } = await pool.query(
      `SELECT r.name AS region_name, rd.variants AS variants
       FROM regions r
       JOIN places_narration rd ON rd.id = r.depiction_id
       WHERE r.name = ANY($1::text[])
         AND rd.variants IS NOT NULL`,
      [regionNames]
    );
    const map = {};
    for (const row of rows) {
      // variants column is [{id, tags, phrases}] (ADR-0015; legacy `key` = `id`).
      // An `id` may be a list — one entry answering several keys (a phrase
      // authored for 'autumn_and_winter' serves both seasons).
      const keyed = {};
      for (const v of row.variants || []) {
        const id = v && (v.id ?? v.key);
        for (const k of Array.isArray(id) ? id : [id]) {
          if (k != null) keyed[k] = v.phrases;
        }
      }
      if (Object.keys(keyed).length) map[row.region_name] = keyed;
    }
    return map;
  } catch (err) {
    if (err.code !== '42P01') {
      console.warn('⚠️ Could not load seasonal summaries:', err.message);
    }
    return {};
  }
}
