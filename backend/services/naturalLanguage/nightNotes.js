// ============================================================================
// Nighttime conditions at camp
// ----------------------------------------------------------------------------
// Turns the overnight climate samples (20:00 -> 07:00) into felt, physical notes
// about how the night treated a sleeping traveller. No numbers, no hours.
// The conditions are evaluated in order of impression: a storm dominates, then
// rain toward dawn, then wind, then cold; a calm night is the fallback.
// ============================================================================

import { meanOf, sumOf, timedClimateRecords } from '../data/climateData.js';
import { hourOfTimestamp } from './dayPhases.js';
import { pick } from './text.js';

const STORM_PRECIPITATION_MIN = 1;
const STORM_WIND_MIN = 25;
const HARD_WIND_MIN = 30;
const RESTLESS_WIND_MIN = 18;
const SOAKING_DAWN_RAIN_MIN = 0.5;
const DAWN_HOURS = [5, 7];

const STORM_PHRASES = [
  'A storm bursts after dark; the traveller must find what shelter they can.',
  'Thunder and wind force the camp to huddle behind rocks or trees.',
  'The night turns violent — rain and gusts make sleep impossible until the storm passes.',
];

const SOAKING_DAWN_RAIN_PHRASES = [
  'Toward dawn a steady rain soaks the camp, waking the traveller with cold drops.',
  'A grey rain moves in before first light, pattering against cloak and canvas.',
  'The traveller wakes to the sound of rain in the small hours, the ground turning soft.',
];

const LIGHT_DAWN_RAIN_PHRASES = [
  'A faint drizzle brushes the camp near dawn.',
  'A light, passing shower stirs the sleeper once before morning.',
];

const HARD_WIND_PHRASES = [
  'In the depth of night the wind rises, tearing at the camp and making sleep fitful.',
  'Gusts slam across the sleeping place, rattling gear and demanding attention.',
];

const RESTLESS_WIND_PHRASES = [
  'A restless wind keeps the traveller half-awake through the watches of the night.',
  'The night air moves constantly, carrying the smell of rain or pine through the camp.',
];

const FREEZING_PHRASES = [
  'The cold sinks deep; sleep comes in shivers until the fire dies entirely.',
  'Frost forms on cloak and grass, and the traveller wakes stiff and slow.',
];

const CHILLY_PHRASES = [
  'The night is cold enough that the traveller curls closer to the embers.',
  'A chill settles after sunset and never truly leaves.',
];

const CALM_PHRASES = [
  'The night passes quietly, the stars clear and untroubled.',
  'A calm, uneventful night leaves the traveller rested by morning.',
];

/** Aggregate the overnight samples into the few numbers the rules need. */
function nightWeatherSummary(samples) {
  const winds = samples
    .map((s) => s.weather.wind_speed_10m)
    .filter((w) => Number.isFinite(w));

  const dawnPrecipitation = DAWN_HOURS.reduce((total, hour) => {
    const atHour = samples.filter((s) => hourOfTimestamp(s.time) === hour).at(-1);
    return total + (atHour?.weather.precipitation || 0);
  }, 0);

  return {
    meanTemp: meanOf(samples.map((s) => s.weather.temperature_2m)),
    maxWind: winds.length ? Math.max(...winds) : null,
    totalPrecipitation: sumOf(samples.map((s) => s.weather.precipitation || 0)),
    dawnPrecipitation,
  };
}

/**
 * Bullet-ready notes on how the night affected the sleeping traveller.
 * @param {Array} nighttimeClimateArray - overnight samples (20:00 -> 07:00)
 * @param {() => number} [rng]
 * @returns {string[]}
 */
export function collectNighttimeConditions(nighttimeClimateArray, rng = Math.random) {
  const samples = timedClimateRecords(nighttimeClimateArray);
  if (samples.length === 0) return [];

  const { meanTemp, maxWind, totalPrecipitation, dawnPrecipitation } = nightWeatherSummary(samples);
  const stormy = totalPrecipitation > STORM_PRECIPITATION_MIN
    && maxWind != null && maxWind > STORM_WIND_MIN;

  const conditions = [];

  if (stormy) conditions.push(pick(STORM_PHRASES, rng));

  if (dawnPrecipitation > SOAKING_DAWN_RAIN_MIN) {
    conditions.push(pick(SOAKING_DAWN_RAIN_PHRASES, rng));
  } else if (dawnPrecipitation > 0) {
    conditions.push(pick(LIGHT_DAWN_RAIN_PHRASES, rng));
  }

  // Wind only gets its own note when the storm phrase did not already cover it.
  if (!stormy && maxWind != null) {
    if (maxWind > HARD_WIND_MIN) conditions.push(pick(HARD_WIND_PHRASES, rng));
    else if (maxWind > RESTLESS_WIND_MIN) conditions.push(pick(RESTLESS_WIND_PHRASES, rng));
  }

  if (meanTemp != null) {
    if (meanTemp < 2) conditions.push(pick(FREEZING_PHRASES, rng));
    else if (meanTemp < 8) conditions.push(pick(CHILLY_PHRASES, rng));
  }

  if (conditions.length === 0) conditions.push(pick(CALM_PHRASES, rng));

  return conditions.map((c) => `- ${c}`);
}
