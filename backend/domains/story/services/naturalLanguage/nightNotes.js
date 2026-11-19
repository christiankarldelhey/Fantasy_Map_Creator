// ============================================================================
// Nighttime conditions at camp
// ----------------------------------------------------------------------------
// Restored to Node as part of the world-voice migration (issue #52): the
// mind-engine Python twin was removed in #54 — this module is the only copy.
// ============================================================================

import { meanOf, sumOf, timedClimateRecords } from './climateSamples.js';
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
  'Frost forms on cloak and grass through the depth of the night.',
];

const CHILLY_PHRASES = [
  'The night is cold enough that the traveller curls closer to the embers.',
  'A chill settles after sunset and never truly leaves.',
];

const CALM_PHRASES = [
  'The night passes quietly, the stars clear and untroubled.',
  'A calm, uneventful night leaves the traveller rested by morning.',
];

// A shelterless night, host-side (#53): the world voice — not the mind —
// owns how open sky reads.
export const REST_OPEN_SKY =
  'No specific resting place presents itself. The night is spent under '
  + 'open sky, with whatever shelter the land and the weather allow.';

const REST_PAID_PHRASES = [
  'A bed bought for coin at {place}: a roof, a locked door, the murmur of the common room below.',
  'Coin buys the night at {place} — a real bed, and sleep that comes easy under a roof.',
];

const REST_CHARITY_PHRASES = [
  'Strangers share what they have at {place} — a corner by the fire, freely given.',
  'No coin changes hands at {place}; kindness opens a door instead.',
];

const REST_TURNED_AWAY_PHRASES = [
  'The door of {place} shut on an empty purse; the night is spent under open sky.',
  'No welcome at {place} — the cold ground outside its lights is all the night offers.',
];

function placeName(overnight) {
  return overnight?.title || overnight?.name || 'the settlement';
}

/**
 * The night's own reading (ADR-0016): one verbalization that feeds the
 * chapter AND the memory. How the night was secured leads (a paid bed, a
 * stranger's mercy, a door shut in the face), then the place's authored
 * prose — and when the night is spent rough, the nighttime conditions
 * join, because a sleeper under open sky lives the weather an indoor bed
 * muffles.
 */
export function restReading({ overnight, lodging = {}, conditions = [], rng = Math.random }) {
  const parts = [];
  if (lodging.paid) {
    parts.push(pick(REST_PAID_PHRASES, rng).replace('{place}', placeName(overnight)));
  } else if (lodging.charity) {
    parts.push(pick(REST_CHARITY_PHRASES, rng).replace('{place}', placeName(overnight)));
  } else if (lodging.turnedAway) {
    parts.push(pick(REST_TURNED_AWAY_PHRASES, rng).replace('{place}', placeName(overnight)));
  }

  // The authored night prose — a turned-away traveller does NOT get to
  // live the inn's description; the door's shut is their whole night.
  if (!lodging.turnedAway && overnight?.description) {
    parts.push(overnight.description);
  }

  if (!parts.length) parts.push(REST_OPEN_SKY);

  for (const c of conditions) {
    parts.push(c.replace(/^-\s*/, ''));
  }
  return parts.join(' ');
}

/** Aggregate the overnight samples into the few numbers the rules need. */
function nightWeatherSummary(samples) {
  const winds = samples
    .map((s) => s.weather.wind_speed_10m)
    .filter((n) => typeof n === 'number');

  let dawnPrecipitation = 0;
  for (const hour of DAWN_HOURS) {
    const atHour = samples.filter((s) => hourOfTimestamp(s.time) === hour);
    const last = atHour[atHour.length - 1];
    dawnPrecipitation += last ? last.weather.precipitation || 0 : 0;
  }

  return {
    meanTemp: meanOf(samples.map((s) => s.weather.temperature_2m)),
    maxWind: winds.length ? Math.max(...winds) : null,
    totalPrecipitation: sumOf(samples.map((s) => s.weather.precipitation || 0)),
    dawnPrecipitation,
  };
}

/** Bullet-ready notes on how the night affected the sleeping traveller. */
export function collectNighttimeConditions(nighttimeClimateArray, rng = Math.random) {
  const samples = timedClimateRecords(nighttimeClimateArray);
  if (samples.length === 0) return [];

  const { meanTemp, maxWind, totalPrecipitation, dawnPrecipitation } =
    nightWeatherSummary(samples);

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
    if (maxWind > HARD_WIND_MIN) {
      conditions.push(pick(HARD_WIND_PHRASES, rng));
    } else if (maxWind > RESTLESS_WIND_MIN) {
      conditions.push(pick(RESTLESS_WIND_PHRASES, rng));
    }
  }

  if (meanTemp != null) {
    if (meanTemp < 2) {
      conditions.push(pick(FREEZING_PHRASES, rng));
    } else if (meanTemp < 8) {
      conditions.push(pick(CHILLY_PHRASES, rng));
    }
  }

  if (conditions.length === 0) conditions.push(pick(CALM_PHRASES, rng));

  return conditions.map((c) => `- ${c}`);
}
