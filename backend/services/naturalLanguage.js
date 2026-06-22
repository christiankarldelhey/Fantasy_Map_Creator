// ============================================================================
// Natural Language service (NO AI)
// ----------------------------------------------------------------------------
// Deterministic, rule-based interpreters that turn the raw day data (climate,
// regions, biomes, altitude, locations, roads) into plain English text for the
// prompt. No exact figures or clock times are emitted for the weather — the
// LLM is told elsewhere never to report numbers.
// ============================================================================

import { WALK_START_HOUR, WALK_END_HOUR } from './tripDay.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map a clock hour (float) to a coarse time-of-day phrase. */
function timeOfDayPhrase(hourFloat) {
  if (hourFloat == null) return 'somewhere along the way';
  if (hourFloat < 9) return 'in the early morning';
  if (hourFloat < 11) return 'in the mid-morning';
  if (hourFloat < 13) return 'toward midday';
  if (hourFloat < 15) return 'in the early afternoon';
  if (hourFloat < 17) return 'in the late afternoon';
  if (hourFloat < WALK_END_HOUR) return 'as evening drew near';
  return 'after dark';
}

function avg(nums) {
  const xs = nums.filter((n) => typeof n === 'number' && Number.isFinite(n));
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Pull the inner weather record from a climate sample (handles nesting). */
function innerClimate(sample) {
  if (!sample) return null;
  const c = sample.climate || sample;
  return c.climate || c;
}

// ---------------------------------------------------------------------------
// Climate
// ---------------------------------------------------------------------------

/**
 * Turn the hourly climate array into one or two atmospheric sentences.
 * No numbers, no hours — just mood and weather shifts across the day.
 * @param {Array<{time:string, climate:object}>} climateArray
 * @returns {string}
 */
export function describeClimate(climateArray) {
  if (!Array.isArray(climateArray) || climateArray.length === 0) {
    return 'The weather leaves little mark on the day.';
  }

  const samples = climateArray
    .map((s) => ({ time: s.time, w: innerClimate(s) }))
    .filter((s) => s.w);

  if (samples.length === 0) return 'The weather leaves little mark on the day.';

  const temps = samples.map((s) => s.w.temperature_2m);
  const precs = samples.map((s) => s.w.precipitation || 0);
  const clouds = samples.map((s) => s.w.cloud_cover);
  const winds = samples.map((s) => s.w.wind_speed_10m);

  const meanTemp = avg(temps);
  const meanCloud = avg(clouds);
  const meanWind = avg(winds);
  const totalPrec = precs.reduce((a, b) => a + b, 0);

  const parts = [];

  // Temperature feel
  if (meanTemp != null) {
    if (meanTemp < 2) parts.push('a bitter, frost-bound day');
    else if (meanTemp < 8) parts.push('a cold day');
    else if (meanTemp < 15) parts.push('a cool, grey-tempered day');
    else if (meanTemp < 22) parts.push('a mild day');
    else if (meanTemp < 29) parts.push('a warm day');
    else parts.push('a hot, heavy day');
  }

  // Sky
  if (meanCloud != null) {
    if (meanCloud < 25) parts.push('the sky clear and open');
    else if (meanCloud < 60) parts.push('clouds drifting and parting');
    else if (meanCloud < 90) parts.push('the sky mostly overcast');
    else parts.push('a low, unbroken ceiling of cloud');
  }

  let sentence = parts.length ? parts.join(', ') : 'an unremarkable day';
  sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';

  // Precipitation arc: compare first third vs last third
  const third = Math.max(1, Math.floor(samples.length / 3));
  const early = precs.slice(0, third).reduce((a, b) => a + b, 0);
  const late = precs.slice(-third).reduce((a, b) => a + b, 0);
  const meanTempBelowZero = meanTemp != null && meanTemp <= 1;
  const wet = meanTempBelowZero ? 'snow' : 'rain';

  if (totalPrec > 0.2) {
    if (late > early * 1.5 && late > 0.2) {
      sentence += ` Dry at dawn, but the ${wet} gathered as the day wore on.`;
    } else if (early > late * 1.5 && early > 0.2) {
      sentence += ` ${wet === 'snow' ? 'Snow' : 'Rain'} in the morning that thinned and cleared by nightfall.`;
    } else {
      sentence += ` A persistent ${wet} kept company with the march.`;
    }
  } else if (totalPrec > 0) {
    sentence += ' Only a passing spit of rain, soon gone.';
  }

  // Wind
  if (meanWind != null) {
    if (meanWind > 30) sentence += ' A hard wind harried the road.';
    else if (meanWind > 18) sentence += ' A steady wind kept at their backs.';
  }

  return sentence;
}

// ---------------------------------------------------------------------------
// Regions
// ---------------------------------------------------------------------------

/**
 * Lands crossed in order, each with its character (description_text).
 * @param {Array<{name:string, description_text?:string}>} regions
 * @returns {string}
 */
export function describeRegions(regions) {
  if (!Array.isArray(regions) || regions.length === 0) {
    return 'The day passes through unnamed country.';
  }

  const lines = regions.map((r) => {
    const name = typeof r === 'string' ? r : r.name;
    const desc = typeof r === 'string' ? null : r.description_text;
    if (desc && desc.trim()) {
      return `- ${name}: ${desc.trim()}`;
    }
    return `- ${name}`;
  });

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Landscape (biomes + altitude layers)
// ---------------------------------------------------------------------------

const BIOME_PHRASES = {
  forest: 'woodland',
  marsh: 'marshes and wet ground',
  desert: 'barren, arid waste',
};

const ALTITUDE_PHRASES = {
  hills: 'rolling hills',
  mountains_low: 'the lower mountain slopes',
  mountains_med: 'high mountain country',
  mountains_high: 'the high peaks',
};

/**
 * Describe the terrain crossed: biomes and altitude layers entered.
 * @param {string[]} biomes
 * @param {string[]} altitude
 * @returns {string}
 */
export function describeLandscape(biomes, altitude) {
  const parts = [];

  const bs = (biomes || []).map((b) => BIOME_PHRASES[b] || b).filter(Boolean);
  if (bs.length) {
    parts.push(`The road passes through ${joinList(bs)}.`);
  }

  const as = (altitude || []).map((a) => ALTITUDE_PHRASES[a] || a).filter(Boolean);
  if (as.length) {
    const climbed = (altitude || []).some((a) => String(a).startsWith('mountains'));
    const lead = climbed ? 'The way climbs into' : 'The way crosses';
    parts.push(`${lead} ${joinList(as)}.`);
  }

  if (parts.length === 0) {
    return 'Open, even country, with no great rise or wood to speak of.';
  }
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

/**
 * Places passed near, with a rough time-of-day (no exact clock times).
 * @param {Array<{name:string, type?:string, hour_float?:number, distance_km?:number}>} locations
 * @returns {string}
 */
export function describeLocations(locations) {
  if (!Array.isArray(locations) || locations.length === 0) {
    return 'No settlement or landmark of note stands near the day\'s road.';
  }

  const lines = locations.map((l) => {
    const when = timeOfDayPhrase(l.hour_float);
    const near = (l.distance_km != null && l.distance_km > 1)
      ? 'passed at some distance'
      : 'passed close by';
    const kind = l.type ? ` (${String(l.type).replace(/_/g, ' ')})` : '';
    return `- ${l.name}${kind}: ${near}, ${when}.`;
  });

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Roads
// ---------------------------------------------------------------------------

const ROAD_PHRASES = {
  road: 'made roads',
  trail: 'tracks and trails',
  off_road: 'open country, cross-country',
};

/**
 * What the traveller treads on, and the lands they tread it in.
 * @param {Object} roadTypes - { road, trail, off_road } in km
 * @param {Array} regions
 * @returns {string}
 */
export function describeRoads(roadTypes, regions) {
  const entries = Object.entries(roadTypes || {}).filter(([, km]) => km > 0);
  if (entries.length === 0) return 'The path is faint, mostly open ground.';

  entries.sort((a, b) => b[1] - a[1]);
  const phrases = entries.map(([type]) => ROAD_PHRASES[type] || type);

  let sentence;
  if (phrases.length === 1) {
    sentence = `The whole day is spent on ${phrases[0]}.`;
  } else {
    const main = phrases[0];
    const rest = phrases.slice(1);
    sentence = `Most of the way runs on ${main}, with stretches of ${joinList(rest)}.`;
  }

  return sentence;
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

function joinList(arr) {
  const xs = arr.filter(Boolean);
  if (xs.length === 0) return '';
  if (xs.length === 1) return xs[0];
  if (xs.length === 2) return `${xs[0]} and ${xs[1]}`;
  return `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

export { timeOfDayPhrase };
