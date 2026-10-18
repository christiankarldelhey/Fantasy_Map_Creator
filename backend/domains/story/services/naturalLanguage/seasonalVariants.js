// ============================================================================
// Seasonal/weather variants of region descriptions
// ----------------------------------------------------------------------------
// Decides which variant a narrated day falls under and resolves the matching
// seeded phrases. Two phrase sources exist:
//
//   - region_biome_descriptions.variant   (terrain/road categories)
//   - region_seasonal_descriptions.variant (the "lands crossed" summary)
//
// Both are resolved here in Node because the day generator already knows the
// date and the sampled weather; the story-engine then sees plain phrase
// lists, same shape as before — no contract change, and a database that
// predates the variant column simply yields base phrases.
//
// Variant keys: 'summer' | 'winter' | 'rain' | 'snow' | 'cold' | 'heat'
// ('base' is the fallback, never stored explicitly here.)
//
// Pick order, most specific first:
//   snow, rain, extreme heat/cold, season, mild cold/heat, base
// So a clear winter day reads as 'winter', a snowy winter day as 'snow',
// and an autumn cold snap as 'cold' rather than swallowing the season.
// Thresholds mirror story-engine/app/natural_language/climate_notes.py.
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

const VARIANT_KEYS = ['summer', 'winter', 'rain', 'snow', 'cold', 'heat'];

/**
 * 'winter' | 'summer' | null from a YYYY-MM-DD date.
 * Middle-earth seasons follow the northern hemisphere.
 */
export function seasonOfDate(dateISO) {
  const month = Number(String(dateISO || '').slice(5, 7));
  if (!month) return null;
  if (month === 12 || month <= 2) return 'winter';
  if (month >= 6 && month <= 8) return 'summer';
  return null;
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

  return {
    meanTemp: temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : null,
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
      `SELECT region_name, variant, phrases
       FROM region_seasonal_descriptions
       WHERE region_name = ANY($1::text[])`,
      [regionNames]
    );
    const map = {};
    for (const row of rows) {
      if (!map[row.region_name]) map[row.region_name] = {};
      map[row.region_name][row.variant] = row.phrases || [];
    }
    return map;
  } catch (err) {
    if (err.code !== '42P01') {
      console.warn('⚠️ Could not load seasonal summaries:', err.message);
    }
    return {};
  }
}
