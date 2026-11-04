// ============================================================================
// Weather notes, one short phrase per narrative phase and multi-day states
// ----------------------------------------------------------------------------
// Restored to Node as part of the world-voice migration (issue #52): the
// mind-engine Python twin was removed in #54 — this module is the only copy.
// Weather is atmosphere, never a report: no figures and no clock times leave
// this module.
// ============================================================================

import { innerClimate, meanOf, sumOf } from './climateSamples.js';
import {
  NARRATIVE_PHASES,
  emptyPhaseBuckets,
  phaseForClimateSample,
} from './dayPhases.js';
import { joinList, pick } from './text.js';

const TEMPERATURE_BANDS = [
  { below: 2, phrase: 'bitter cold', phrases: [
    'bitter cold', 'a killing cold', 'a cold that bites to the bone',
  ] },
  { below: 8, phrase: 'cold', phrases: [
    'cold', 'a raw cold', 'a chill that does not lift',
  ] },
  { below: 15, phrase: 'cool', phrases: [
    'cool', 'a cool air', 'cool and grey',
  ] },
  { below: 22, phrase: 'mild', phrases: [
    'mild', 'mild and open', 'a mild air',
  ] },
  { below: 29, phrase: 'warm', phrases: [
    'warm', 'a warm sun', 'warm and bright',
  ] },
  { below: Infinity, phrase: 'hot', phrases: [
    'hot', 'a parching heat', 'heat that does not relent',
  ] },
];

const CLOUD_BANDS = [
  { below: 25, phrase: 'clear skies', phrases: [
    'clear skies', 'a cloudless sky', 'sky swept clean',
  ] },
  { below: 60, phrase: 'partly cloudy', phrases: [
    'partly cloudy', 'a sky of drifting cloud', 'sun and moving cloud',
  ] },
  { below: 90, phrase: 'mostly overcast', phrases: [
    'mostly overcast', 'a low grey sky', 'a sky of gathering grey',
  ] },
  { below: Infinity, phrase: 'heavy cloud cover', phrases: [
    'heavy cloud cover', 'a sky shut like a lid', 'cloud piled dark on cloud',
  ] },
];

const WINDY_SPEED_MIN = 18;
const WET_PRECIPITATION_MIN = 0.2;
// Phase-total precipitation that reads as a real downpour rather than rain.
const PHASE_HEAVY_PRECIP_MIN = 4.0;
// Mean phase temperature at or below which precipitation falls as snow.
const PHASE_SNOW_TEMP_MAX = 1.0;

// Precipitation intensity tiers — fragments, so they join a comma-list like
// "cold, heavy cloud cover, a driving rain". Pools, not single words: the
// narrator should not wear the same word every wet day.
const PRECIP_SNOW_PHRASES = [
  'falling snow',
  'snow in the air',
  'a light snow',
  'snow sifting down',
];
const PRECIP_HEAVY_PHRASES = [
  'a driving rain',
  'a drenching downpour',
  'rain that means to last',
  'a grey, beating rain',
];
const PRECIP_WET_PHRASES = [
  'a steady rain',
  'a cold drizzle',
  'soft rain',
  'wet',
];
const PRECIP_SHOWER_PHRASES = [
  'a passing shower',
  'a brief shower',
  'a scatter of rain',
];
const WINDY_PHRASES = [
  'windy',
  'a wind that does not rest',
  'a searching wind',
  'a whistling wind',
];

/** First band whose threshold the value falls under, or null for missing data. */
function bandPhrase(bands, value, rng = Math.random) {
  if (value == null) return null;
  for (const b of bands) {
    if (value < b.below) {
      return Array.isArray(b.phrases) && b.phrases.length > 0
        ? b.phrases[Math.floor(rng() * b.phrases.length)]
        : b.phrase;
    }
  }
  return null;
}

export function summariseWeather(records, rng = Math.random) {
  const meanTemp = meanOf(records.map((w) => w.temperature_2m));
  const meanCloud = meanOf(records.map((w) => w.cloud_cover));
  const meanWind = meanOf(records.map((w) => w.wind_speed_10m));
  const totalPrec = sumOf(records.map((w) => w.precipitation || 0));

  const parts = [
    bandPhrase(TEMPERATURE_BANDS, meanTemp, rng),
    bandPhrase(CLOUD_BANDS, meanCloud, rng),
    meanWind != null && meanWind > WINDY_SPEED_MIN ? pick(WINDY_PHRASES, rng) : null,
  ].filter(Boolean);

  if (totalPrec > 0 && meanTemp != null && meanTemp <= PHASE_SNOW_TEMP_MAX) {
    parts.push(pick(PRECIP_SNOW_PHRASES, rng));
  } else if (totalPrec >= PHASE_HEAVY_PRECIP_MIN) {
    parts.push(pick(PRECIP_HEAVY_PHRASES, rng));
  } else if (totalPrec > WET_PRECIPITATION_MIN) {
    parts.push(pick(PRECIP_WET_PHRASES, rng));
  } else if (totalPrec > 0) {
    parts.push(pick(PRECIP_SHOWER_PHRASES, rng));
  }

  return parts.length ? joinList(parts) : null;
}

/**
 * Group weather into the three narrative phases and return one summary
 * phrase per phase (null when there is no data for it).
 */
export function collectClimateNotesByPhase(climateArray, moon = null, rng = Math.random) {
  const notes = { morning: null, afternoon: null, night: null };
  if (!Array.isArray(climateArray) || climateArray.length === 0) {
    return notes;
  }

  const byPhase = emptyPhaseBuckets();
  for (const sample of climateArray) {
    const weather = innerClimate(sample);
    if (weather) {
      byPhase[phaseForClimateSample(sample)].push(weather);
    }
  }

  for (const phase of NARRATIVE_PHASES) {
    if (!byPhase[phase].length) continue;
    let summary = summariseWeather(byPhase[phase], rng);
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
// ============================================================================

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
  "Storm after storm has harried the journey; the wind seems to know the traveller's name.",
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

/** Summarise a single day by its worst (or most defining) weather impression. */
export function dayWeatherSignature(climate = null) {
  const samples = (climate || []).map(innerClimate).filter(Boolean);
  if (samples.length === 0) {
    return {
      snow: false, heavyRain: false, storm: false, deepCold: false,
      scorching: false, meanTemp: null, maxWind: null, totalPrecip: 0,
    };
  }

  const temps = samples.map((s) => s.temperature_2m).filter((n) => typeof n === 'number');
  const winds = samples.map((s) => s.wind_speed_10m).filter((n) => typeof n === 'number');
  const precs = samples.map((s) => s.precipitation || 0).filter((n) => typeof n === 'number');

  const meanTemp = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
  const maxWind = winds.length ? Math.max(...winds) : null;
  const totalPrecip = precs.reduce((a, b) => a + b, 0);

  const snow = samples.some(
    (s) => typeof s.temperature_2m === 'number'
      && s.temperature_2m <= SNOW_TEMP_MAX
      && (s.precipitation || 0) > 0,
  );
  const heavyRain = samples.some((s) => (s.precipitation || 0) >= HEAVY_RAIN_MIN);
  const storm = maxWind != null && maxWind >= STORM_WIND_MIN;
  const deepCold = meanTemp != null && meanTemp <= DEEP_COLD_MAX;
  const scorching = meanTemp != null && meanTemp >= SCORCHING_MIN;

  return {
    snow, heavyRain, storm, deepCold, scorching, meanTemp, maxWind, totalPrecip,
  };
}

/**
 * Detect persistent multi-day climate states from recent days.
 * @param {Array<{climate: Array}>} recentDays newest last; include today at the end.
 */
export function resolveClimateState(recentDays = [], rng = Math.random) {
  if (!recentDays.length) {
    return { active: [], narrative: '', dominant: null };
  }

  const signatures = recentDays.map((d) => dayWeatherSignature(d.climate));

  const streak = (predicate) => {
    let c = 0;
    for (let i = signatures.length - 1; i >= 0; i -= 1) {
      if (!predicate(signatures[i])) break;
      c += 1;
    }
    return c;
  };

  const active = [];
  const bits = [];

  if (streak((s) => s.snow) >= CONSECUTIVE_DAYS) {
    active.push('snowbound');
    bits.push(pick(SNOWBOUND_PHRASES, rng));
  }
  if (streak((s) => s.heavyRain) >= CONSECUTIVE_DAYS) {
    active.push('drenched');
    bits.push(pick(DRENCHED_PHRASES, rng));
  }
  if (streak((s) => s.storm) >= CONSECUTIVE_DAYS) {
    active.push('storm_lashed');
    bits.push(pick(STORM_LASHED_PHRASES, rng));
  }
  if (streak((s) => s.deepCold) >= CONSECUTIVE_DAYS) {
    active.push('frozen');
    bits.push(pick(FROZEN_PHRASES, rng));
  }
  if (streak((s) => s.scorching) >= CONSECUTIVE_DAYS) {
    active.push('scorched');
    bits.push(pick(SCORCHED_PHRASES, rng));
  }

  return {
    active,
    narrative: bits.length ? `=== CLIMATE STATE ===\n${bits.join('\n')}\n` : '',
    dominant: active[0] || null,
  };
}

// ============================================================================
// Moon phase phrase for the night weather line
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
 * Short moon phrase for the night weather line, or null when the moon is
 * not worth mentioning.
 */
export function formatMoonNightPhrase(moon, meanCloud) {
  if (!moon || !moon.phase) return null;
  if (moon.phase === 'new_moon') return MOON_NIGHT_PHRASES.new_moon;
  if (moon.phase !== 'full_moon') return null;
  if (typeof meanCloud === 'number' && meanCloud >= HEAVY_CLOUD_COVER) return null;
  return MOON_NIGHT_PHRASES.full_moon;
}

// ============================================================================
// Perception contract (#53): declared weather tiers + one-line readings
// ----------------------------------------------------------------------------
// A climate event carries aggregated numbers; the host — not the mind —
// turns them into meaning. `weatherTags` declares the tiers the mind's
// wiring keys against ('tag:weather:storm' severity floors, affect
// valences, pattern streaks); `weatherReading` is the same one-line
// perception the old resolver composed from the band tables.
// ============================================================================

const STORM_PRECIP_MIN = 8.0;

/**
 * 'weather:*' tags for one aggregated climate event
 * {temperature_2m, precipitation, wind_speed_10m}. Severe tiers first —
 * a snow day is also freezing, both tags apply.
 */
export function weatherTags(data = {}) {
  const temp = data.temperature_2m;
  const prec = data.precipitation;
  const wind = data.wind_speed_10m;
  const tags = [];
  if (temp != null && temp <= SNOW_TEMP_MAX && prec != null
      && prec >= WET_PRECIPITATION_MIN) tags.push('weather:snow');
  if (temp != null && temp <= DEEP_COLD_MAX) tags.push('weather:deep_cold');
  if (temp != null && temp >= SCORCHING_MIN) tags.push('weather:scorching');
  if ((wind != null && wind >= STORM_WIND_MIN)
      || (prec != null && prec >= STORM_PRECIP_MIN)) tags.push('weather:storm');
  if (temp != null && temp <= SNOW_TEMP_MAX) tags.push('weather:freezing');
  if (prec != null && prec >= WET_PRECIPITATION_MIN) tags.push('weather:wet');
  if (wind != null && wind >= WINDY_SPEED_MIN) tags.push('weather:windy');
  return tags;
}

/**
 * One-line reading of an aggregated climate event — the deterministic
 * band composition the mind used to perform itself.
 */
export function weatherReading(data = {}, rng = Math.random) {
  const parts = [
    bandPhrase(TEMPERATURE_BANDS, data.temperature_2m, rng),
    bandPhrase(CLOUD_BANDS, data.cloud_cover, rng),
  ];
  const wind = data.wind_speed_10m;
  if (wind != null && wind > WINDY_SPEED_MIN) parts.push('windy');
  const prec = data.precipitation;
  if (prec != null) {
    if (prec > WET_PRECIPITATION_MIN) parts.push('wet');
    else if (prec > 0) parts.push('a passing shower');
  }
  return parts.filter(Boolean).join(', ') || null;
}
