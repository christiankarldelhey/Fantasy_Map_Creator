// ============================================================================
// Weather notes, one short phrase per narrative phase and multi-day states
// ----------------------------------------------------------------------------
// Weather is atmosphere, never a report: no figures and no clock times leave
// this module. The night phrase may carry a moon note when the sky allows it.
//
// This file also holds *climate states*: persistent multi-day and unusual
// weather patterns (snowbound, storm-lashed, drenched, frozen, scorched) that
// should colour the narrator's view of the journey.
// ============================================================================

import { innerClimate, meanOf, sumOf } from '../climateSample.js';
import { NARRATIVE_PHASES, emptyPhaseBuckets, phaseForClimateSample } from './dayPhases.js';
import { joinList, pick } from './text.js';

const TEMPERATURE_BANDS = [
  { below: 2, phrase: 'bitter cold' },
  { below: 8, phrase: 'cold' },
  { below: 15, phrase: 'cool' },
  { below: 22, phrase: 'mild' },
  { below: 29, phrase: 'warm' },
  { below: Infinity, phrase: 'hot' },
];

const CLOUD_BANDS = [
  { below: 25, phrase: 'clear skies' },
  { below: 60, phrase: 'partly cloudy' },
  { below: 90, phrase: 'mostly overcast' },
  { below: Infinity, phrase: 'heavy cloud cover' },
];

const WINDY_SPEED_MIN = 18;
const WET_PRECIPITATION_MIN = 0.2;

/** First band whose threshold the value falls under, or null for missing data. */
function bandPhrase(bands, value) {
  if (value == null) return null;
  return bands.find((b) => value < b.below)?.phrase ?? null;
}

/**
 * Summarise weather records into a short phrase like "cool, partly cloudy".
 * @param {Array} records - unwrapped weather records
 * @returns {string|null}
 */
export function summariseWeather(records) {
  const meanTemp = meanOf(records.map((w) => w.temperature_2m));
  const meanCloud = meanOf(records.map((w) => w.cloud_cover));
  const meanWind = meanOf(records.map((w) => w.wind_speed_10m));
  const totalPrec = sumOf(records.map((w) => w.precipitation || 0));

  const parts = [
    bandPhrase(TEMPERATURE_BANDS, meanTemp),
    bandPhrase(CLOUD_BANDS, meanCloud),
    meanWind != null && meanWind > WINDY_SPEED_MIN ? 'windy' : null,
  ].filter(Boolean);

  if (totalPrec > WET_PRECIPITATION_MIN) parts.push('wet');
  else if (totalPrec > 0) parts.push('a passing shower');

  return parts.length ? joinList(parts) : null;
}

/**
 * Group weather into the three narrative phases and return one summary phrase
 * per phase (null when there is no data for it).
 * @param {Array} climateArray - hourly samples as stored on trip_days.climate
 * @param {{phase:string, illumination:number}} [moon]
 * @returns {{morning: string|null, afternoon: string|null, night: string|null}}
 */
export function collectClimateNotesByPhase(climateArray, moon = null) {
  const notes = { morning: null, afternoon: null, night: null };
  if (!Array.isArray(climateArray) || climateArray.length === 0) return notes;

  const byPhase = emptyPhaseBuckets();
  for (const sample of climateArray) {
    const weather = innerClimate(sample);
    if (weather) byPhase[phaseForClimateSample(sample)].push(weather);
  }

  for (const phase of NARRATIVE_PHASES) {
    if (!byPhase[phase].length) continue;
    let summary = summariseWeather(byPhase[phase]);
    if (phase === 'night' && summary && moon) {
      const meanCloud = meanOf(byPhase.night.map((w) => w.cloud_cover));
      const moonPhrase = formatMoonNightPhrase(moon, meanCloud);
      if (moonPhrase) summary = `${summary} — ${moonPhrase}`;
    }
    notes[phase] = summary;
  }

  return notes;
}

// ============================================================================
// Multi-day and unusual climate states
// ----------------------------------------------------------------------------
// Persistent weather patterns (snowbound, storm-lashed, drenched, frozen,
// scorched) colour the narrator's view and, eventually, may feed back into the
// day-resolution engine for mechanical costs.
// ============================================================================

// Thresholds for state detection (temperatures in °C, precipitation in mm/h)
const SNOW_TEMP_MAX = 1.0;
const HEAVY_RAIN_MIN = 0.4;
const STORM_WIND_MIN = 25;
const DEEP_COLD_MAX = -10;
const SCORCHING_MIN = 32;

// Minimum consecutive days to become a *state* rather than a one-day note.
const CONSECUTIVE_DAYS = 2;

const SNOWBOUND_PHRASES = [
  'The snow has followed the road for days now; the way grows harder to read with each white mile.',
  'Snow lies deep and unbroken; every step costs more breath, more warmth, more will.',
  'Drifts are closing the lower paths. The world has narrowed to what the traveller can still break through.',
];

const DRENCHED_PHRASES = [
  'Rain has not let up for days; cloak, boots and spirit are all sodden through.',
  'The sky has wept without rest; the road runs with mud and the camp is a swamp.',
  'Water finds every seam: the traveller has forgotten what it is to be dry.',
];

const STORM_LASHED_PHRASES = [
  'Storm after storm has harried the journey; the wind seems to know the traveller\'s name.',
  'The days have been loud with thunder and the nights uneasy with flying rain.',
  'It is as if the weather has turned deliberately hostile; each dawn brings a new assault from the sky.',
];

const FROZEN_PHRASES = [
  'A killing cold has settled in and will not lift; fingers stiffen, breath smokes, metal bites the skin.',
  'The frost has lasted so long that even the fires at night feel thin.',
  'Every water skin is slush by morning; the cold has become a companion no one asked for.',
];

const SCORCHED_PHRASES = [
  'The heat has beaten down for days; the land is pale, the throat parched, the shadows the only mercy.',
  'Sun and dust have ruled the road; the traveller moves in the stunned hours of early and late day.',
  'The air shimmers and does not cool; rest is shallow and the nights offer little relief.',
];

/**
 * Summarise a single day by its worst (or most defining) weather impression.
 * @param {Array} climate - hourly samples for one day
 * @returns {{
 *   snow: boolean,
 *   heavyRain: boolean,
 *   storm: boolean,
 *   deepCold: boolean,
 *   scorching: boolean,
 *   meanTemp: number|null,
 *   maxWind: number|null,
 *   totalPrecip: number
 * }}
 */
export function dayWeatherSignature(climate = []) {
  const samples = (climate || []).map((s) => innerClimate(s)).filter(Boolean);
  if (samples.length === 0) {
    return { snow: false, heavyRain: false, storm: false, deepCold: false, scorching: false, meanTemp: null, maxWind: null, totalPrecip: 0 };
  }
  const temps = samples.map((s) => s.temperature_2m).filter(Number.isFinite);
  const winds = samples.map((s) => s.wind_speed_10m).filter(Number.isFinite);
  const precs = samples.map((s) => s.precipitation || 0).filter(Number.isFinite);

  const meanTemp = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
  const maxWind = winds.length ? Math.max(...winds) : null;
  const totalPrecip = precs.reduce((a, b) => a + b, 0);

  const snow = samples.some((s) => Number.isFinite(s.temperature_2m) && s.temperature_2m <= SNOW_TEMP_MAX && (s.precipitation || 0) > 0);
  const heavyRain = samples.some((s) => (s.precipitation || 0) >= HEAVY_RAIN_MIN);
  const storm = maxWind != null && maxWind >= STORM_WIND_MIN;
  const deepCold = Number.isFinite(meanTemp) && meanTemp <= DEEP_COLD_MAX;
  const scorching = Number.isFinite(meanTemp) && meanTemp >= SCORCHING_MIN;

  return { snow, heavyRain, storm, deepCold, scorching, meanTemp, maxWind, totalPrecip };
}

/**
 * Detect persistent multi-day climate states from recent days.
 * @param {Array<{climate:Array}>} recentDays - newest last; include today at the end
 * @param {function} [rng] - Math.random or seeded rng
 * @returns {{
 *   active: string[],
 *   narrative: string,
 *   dominant: string|null
 * }}
 */
export function resolveClimateState(recentDays = [], rng = Math.random) {
  if (recentDays.length === 0) return { active: [], narrative: '', dominant: null };

  const signatures = recentDays.map((d) => dayWeatherSignature(d.climate));

  const streak = (predicate) => {
    let c = 0;
    for (let i = signatures.length - 1; i >= 0; i--) {
      if (predicate(signatures[i])) c++;
      else break;
    }
    return c;
  };

  const active = [];
  const bits = [];

  const snowStreak = streak((s) => s.snow);
  if (snowStreak >= CONSECUTIVE_DAYS) {
    active.push('snowbound');
    bits.push(pick(SNOWBOUND_PHRASES, rng));
  }

  const rainStreak = streak((s) => s.heavyRain);
  if (rainStreak >= CONSECUTIVE_DAYS) {
    active.push('drenched');
    bits.push(pick(DRENCHED_PHRASES, rng));
  }

  const stormStreak = streak((s) => s.storm);
  if (stormStreak >= CONSECUTIVE_DAYS) {
    active.push('storm_lashed');
    bits.push(pick(STORM_LASHED_PHRASES, rng));
  }

  const coldStreak = streak((s) => s.deepCold);
  if (coldStreak >= CONSECUTIVE_DAYS) {
    active.push('frozen');
    bits.push(pick(FROZEN_PHRASES, rng));
  }

  const heatStreak = streak((s) => s.scorching);
  if (heatStreak >= CONSECUTIVE_DAYS) {
    active.push('scorched');
    bits.push(pick(SCORCHED_PHRASES, rng));
  }

  const narrative = bits.length ? `=== CLIMATE STATE ===\n${bits.join('\n')}\n` : '';
  const dominant = active[0] || null;

  return { active, narrative, dominant };
}

// ============================================================================
// Moon phase phrase for the night weather line
// ----------------------------------------------------------------------------
// Only the two phases the traveller would actually notice are surfaced: the new
// moon (absolute dark, always worth saying) and the full moon (only when the sky
// is open enough to see it).
// ============================================================================

const MOON_NIGHT_PHRASES = {
  new_moon: 'no moon rises; the dark is absolute away from the fire',
  waxing_crescent: 'a thin waxing crescent follows the sunset',
  first_quarter: 'the moon stands at first quarter, half-lit in the south',
  waxing_gibbous: 'a waxing gibbous moon brightens the east',
  full_moon: 'the full moon is bright; the land lies pale and open',
  waning_gibbous: 'a waning gibbous moon lights the camp early, then dims',
  last_quarter: 'the last-quarter moon rises late and cold',
  waning_crescent: 'a waning crescent fades before dawn',
};

const HEAVY_CLOUD_COVER = 70;

/**
 * Short moon phrase for the night weather line, or null when the moon is not
 * worth mentioning.
 * @param {{phase:string, illumination:number}|null} moon
 * @param {number|null} meanCloud - mean night cloud cover (%)
 * @returns {string|null}
 */
export function formatMoonNightPhrase(moon, meanCloud) {
  if (!moon?.phase) return null;
  if (moon.phase === 'new_moon') return MOON_NIGHT_PHRASES.new_moon;
  if (moon.phase !== 'full_moon') return null;
  if (typeof meanCloud === 'number' && meanCloud >= HEAVY_CLOUD_COVER) return null;
  return MOON_NIGHT_PHRASES.full_moon;
}
