// ============================================================================
// Natural Language service (NO AI)
// ----------------------------------------------------------------------------
// Deterministic, rule-based interpreters that turn the raw day data (climate,
// regions, biomes, altitude, locations, roads) into plain English text for the
// prompt. No exact figures or clock times are emitted for the weather — the
// LLM is told elsewhere never to report numbers.
// ============================================================================

import { WALK_START_HOUR, WALK_END_HOUR } from './tripDay.js';
import { pickPhraseForRegions } from './terrainPhrases.js';

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

/** Pick a random element from an array using the provided rng. */
function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
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
export function describeClimate(climateArray, rng = Math.random) {
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
    if (meanTemp < 2) parts.push(pick([
      'a bitter, frost-bound day',
      'a day of hard frost and biting air',
      'cold enough to crack stone — the air cuts like iron',
    ], rng));
    else if (meanTemp < 8) parts.push(pick([
      'a cold day',
      'a raw, grey cold through all the hours',
      'the cold sat in the bones from dawn',
    ], rng));
    else if (meanTemp < 15) parts.push(pick([
      'a cool, grey-tempered day',
      'a chill in the air that never quite lifted',
      'cool and overcast, the kind of day that tires without drama',
    ], rng));
    else if (meanTemp < 22) parts.push(pick([
      'a mild day',
      'pleasant enough weather for the road',
      'a temperate day, neither too warm nor sharp',
    ], rng));
    else if (meanTemp < 29) parts.push(pick([
      'a warm day',
      'the heat building through the morning hours',
      'a drowsy warmth that slowed the pace',
    ], rng));
    else parts.push(pick([
      'a hot, heavy day',
      'a stifling heat that pressed down on the road',
      'the sun merciless, the air thick and still',
    ], rng));
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
    if (meanWind > 30) sentence += ' ' + pick([
      'A hard wind harried the road.',
      'The wind came hard and unrelenting.',
      'Gusts cut across the way, making every mile harder.',
    ], rng);
    else if (meanWind > 18) sentence += ' ' + pick([
      'A steady wind kept at their backs.',
      'A persistent breeze followed the march all day.',
      'The wind was constant, neither hindrance nor help.',
    ], rng);
  }

  return sentence;
}

// ---------------------------------------------------------------------------
// Regions
// ---------------------------------------------------------------------------

/**
 * Lands crossed in order, each with its character (description_summary).
 * @param {Array<{name:string, description_summary?:string}>} regions
 * @returns {string}
 */
export function describeRegions(regions) {
  if (!Array.isArray(regions) || regions.length === 0) {
    return 'The day passes through unnamed country.';
  }

  const lines = regions.map((r) => {
    const name = typeof r === 'string' ? r : r.name;
    const desc = typeof r === 'string' ? null : r.description_summary;
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
  plain: 'open grasslands',
};

const ALTITUDE_PHRASES = {
  hills: 'rolling hills',
  mountains_low: 'the lower mountain slopes',
  mountains_med: 'high mountain country',
  mountains_high: 'the high peaks',
};

/**
 * Describe the terrain crossed: biomes and altitude layers entered.
 * Uses region-specific phrases when available; falls back to generic phrases.
 * @param {string[]} biomes
 * @param {string[]} altitude
 * @param {Array<{name:string}>} [regions]
 * @param {Object} [terrainPhrases]
 * @param {() => number} [rng]
 * @returns {string}
 */
export function describeLandscape(biomes, altitude, regions = [], terrainPhrases = {}, rng = Math.random) {
  const parts = [];
  const regionNames = regions.map((r) => (typeof r === 'string' ? r : r.name));

  const presentBiomes = (biomes || []).filter(Boolean);
  const presentAltitude = (altitude || []).filter(Boolean);

  if (presentBiomes.length) {
    const biomePhrases = presentBiomes.map((b) => {
      const regional = pickPhraseForRegions(terrainPhrases, regionNames, b, rng);
      return regional || BIOME_PHRASES[b] || b;
    });
    parts.push(`The road passes through ${joinList(biomePhrases)}.`);
  }

  if (presentAltitude.length) {
    const climbed = presentAltitude.some((a) => String(a).startsWith('mountains'));
    const lead = climbed ? 'The way climbs into' : 'The way crosses';
    const altitudePhrases = presentAltitude.map((a) => {
      const regional = pickPhraseForRegions(terrainPhrases, regionNames, a, rng);
      return regional || ALTITUDE_PHRASES[a] || a;
    });
    parts.push(`${lead} ${joinList(altitudePhrases)}.`);
  }

  // Mountain danger note — highest severity wins
  const hasHigh = presentAltitude.includes('mountains_high');
  const hasMed = presentAltitude.includes('mountains_med');
  if (hasHigh) {
    parts.push(pick([
      'These are high and dangerous ways: precipices drop to either side, and the cold is punishing.',
      'The peaks loom close. Ice and rock; a single misstep here is not forgiven.',
      'No shelter exists at this height. The wind screams off the summits and the cold can kill.',
    ], rng));
  } else if (hasMed) {
    parts.push(pick([
      'The passes are steep and the footing treacherous on loose stone.',
      'Cold clings to the high slopes; the wind here has an edge to it.',
      'At this height the air thins, and the path narrows to a ledge in places.',
    ], rng));
  }

  if (parts.length === 0) {
    // No specific biome or altitude — describe the plains/open country regionally.
    const plainPhrase = pickPhraseForRegions(terrainPhrases, regionNames, 'plain', rng);
    return plainPhrase || 'Open, even country, with no great rise or wood to speak of.';
  }
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

/**
 * Places passed near, with a rough time-of-day (no exact clock times).
 * @param {Array<{name:string, type?:string, hour_float?:number, distance_km?:number, description?:string}>} locations
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
    const desc = l.description && l.description.trim() ? ` — ${l.description.trim()}` : '';
    return `- ${l.name}${kind}: ${near}, ${when}.${desc}`;
  });

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Overnight location
// ---------------------------------------------------------------------------

/**
 * Describe where the character spends the night.
 * @param {Object|null} loc - { name, type, distance_km, description, indoor }
 * @returns {string}
 */
export function describeOvernightLocation(loc) {
  if (!loc) {
    return 'No shelter of note lies near the day\'s end. The night is spent under open sky, with whatever cover the land affords.';
  }

  const kind = loc.type ? String(loc.type).replace(/_/g, ' ') : 'place';
  const descSnippet = loc.description && loc.description.trim()
    ? ` ${loc.description.trim().split('.')[0]}.`
    : '';

  let rest;
  if (loc.indoor) {
    rest = `There is likely a tavern, inn or hall where ${loc.name} offers shelter and warmth for the night.`;
  } else {
    rest = `The character may shelter within its walls or in its shadow for the night.`;
  }

  return `Before nightfall, the road reaches ${loc.name} (${kind}), ${loc.distance_km} km from the day's end.${descSnippet} ${rest}`;
}

// ---------------------------------------------------------------------------
// Elevation effort
// ---------------------------------------------------------------------------

/**
 * Describe the physical effort of elevation change if significant (>150m total).
 * Returns null if the terrain is flat enough to not warrant mention.
 * @param {{ total_gain_m:number, total_loss_m:number, significant:boolean }|null} profile
 * @returns {string|null}
 */
export function describeElevation(profile, rng = Math.random) {
  const parts = [];

  // --- Effort from gain/loss ---
  if (profile && profile.significant) {
    const { total_gain_m: gain, total_loss_m: loss } = profile;
    const heavy = 300;

    if (gain > heavy && loss > heavy) {
      parts.push(pick([
        'The road rises and falls hard through the day — a gruelling march of ascent and descent that leaves the legs heavy by evening.',
        'Climb follows descent follows climb; the legs are never given peace.',
        'The way offers no level ground. Every hour is either up or down, and the body pays for it.',
      ], rng));
    } else if (gain > heavy) {
      parts.push(pick([
        'The way climbs hard for much of the day — a long, taxing ascent that tests the lungs and legs.',
        'A relentless uphill march; the ground rises and does not level.',
        'The ascent is long and unforgiving — lungs labouring, pace reduced to a grind.',
      ], rng));
    } else if (loss > heavy) {
      parts.push(pick([
        'The road descends steeply and at length — knees and balance are tested on rough, falling ground.',
        'A long downhill that punishes the joints as surely as any climb.',
        'The descent is steep and relentless; loose stone and the angle of the slope demand constant care.',
      ], rng));
    } else if (gain > loss) {
      parts.push(pick([
        'The way rises through the day, a steady climb that makes the miles feel longer than they are.',
        'A gradual but persistent ascent runs through most of the day.',
        'The road trends upward all morning; by afternoon the altitude is felt in the step.',
      ], rng));
    } else {
      parts.push(pick([
        'The road loses height through the day, a long descent that eases the pace but tires the joints.',
        'A steady descent through most of the march — easier on the lungs, harder on the knees.',
        'The way falls away gradually; the valley below grows closer with every hour.',
      ], rng));
    }
  }

  // --- Absolute altitude note ---
  if (profile) {
    const maxElev = Math.max(
      profile.dawn_m || 0,
      profile.midday_m || 0,
      profile.dusk_m || 0
    );

    if (maxElev >= 2000) {
      parts.push(pick([
        'Two thousand metres above the lowlands — a height where few roads run and fewer travellers pass. The cold is punishing and the air thin enough to slow thought as well as foot.',
        'At this altitude the world below is lost in haze; the cold here is not weather but a permanent condition of the stone.',
        'Above two thousand metres: the peaks are no longer above but around. Survival demands attention to every step.',
      ], rng));
    } else if (maxElev >= 1500) {
      parts.push(pick([
        'Fifteen hundred metres and more: the lungs work harder, the cold bites deeper, and the sky feels closer than the earth.',
        'At this height clouds pass at eye level; the body labours for air it cannot quite find.',
        'The road climbs into the realm of snow and bare rock, where breath comes short and the cold is constant.',
      ], rng));
    } else if (maxElev >= 1000) {
      parts.push(pick([
        'The road at its highest runs above a thousand metres of open sky — the air noticeably thinner and the cold sharper.',
        'Above a thousand metres, the world opens wide below; the wind carries no warmth up here.',
        'The highest point of the day sits well above the tree-line; the air is clear and thin.',
      ], rng));
    }
  }

  return parts.length ? parts.join(' ') : null;
}

// ---------------------------------------------------------------------------
// Water crossings
// ---------------------------------------------------------------------------

/**
 * Describe rivers and streams crossed during the day.
 * @param {Array<{name:string|null, type:string, crossing_type:string, hour_float:number}>} crossings
 * @returns {string|null}
 */
export function describeWaterCrossings(crossings, rng = Math.random) {
  if (!Array.isArray(crossings) || crossings.length === 0) return null;

  const lines = crossings.map((c) => {
    const when = timeOfDayPhrase(c.hour_float);
    const hasName = c.name && c.name.toLowerCase() !== 'river' && c.name.toLowerCase() !== 'stream';
    const named = hasName ? c.name : null;

    if (c.crossing_type === 'bridge') {
      const subject = named || 'A river';
      const river = named || 'a river';
      return '- ' + pick([
        `${subject} is crossed by a stone bridge ${when}.`,
        `A bridge carries the road over ${river} ${when}.`,
        `${river.charAt(0).toUpperCase() + river.slice(1)} runs swift beneath a wooden bridge, crossed ${when}.`,
      ], rng);
    } else {
      // streams: ~30% chance of a small plank bridge
      const subject = named || 'A stream';
      const stream = named || 'a stream';
      const useBridge = rng() < 0.3;
      if (useBridge) {
        return '- ' + pick([
          `A rough plank bridge spans ${stream} ${when}.`,
          `A low timber crossing takes the road over ${stream} ${when}.`,
        ], rng);
      } else {
        return '- ' + pick([
          `${subject} is forded ${when} — the water cold and quick underfoot.`,
          `A shallow crossing of ${stream} ${when}; the stones slippery beneath.`,
          `${stream.charAt(0).toUpperCase() + stream.slice(1)} must be waded ${when}, the current pulling at the ankles.`,
        ], rng);
      }
    }
  });

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Roads
// ---------------------------------------------------------------------------

const ROAD_PHRASES = {
  road_major: 'well-kept royal roads',
  road: 'made roads',
  trail: 'rough trails and paths',
  off_road: 'open country, cross-country',
};

/**
 * What the traveller treads on, and the lands they tread it in.
 * Uses region-specific phrases for `road` and `trail` when available.
 * @param {Object} roadTypes - { road_major, road, trail, off_road } in km
 * @param {Array} regions
 * @param {Object} [terrainPhrases]
 * @param {() => number} [rng]
 * @returns {string}
 */
export function describeRoads(roadTypes, regions, terrainPhrases = {}, rng = Math.random) {
  const entries = Object.entries(roadTypes || {}).filter(([, km]) => km > 0);
  if (entries.length === 0) return 'The path is faint, mostly open ground.';

  const regionNames = (regions || []).map((r) => (typeof r === 'string' ? r : r.name));

  entries.sort((a, b) => b[1] - a[1]);
  const phrases = entries.map(([type]) => {
    const regional = (type === 'road' || type === 'trail')
      ? pickPhraseForRegions(terrainPhrases, regionNames, type, rng)
      : null;
    return regional || ROAD_PHRASES[type] || type;
  });

  let sentence;
  if (phrases.length === 1) {
    sentence = `The whole day is spent on ${phrases[0]}.`;
  } else {
    const main = phrases[0];
    const rest = phrases.slice(1);
    sentence = `Most of the way runs on ${main}, with stretches of ${joinList(rest)}.`;
  }

  // If trail accounts for more than 30% of the day's distance, add a note
  const totalKm = Object.values(roadTypes || {}).reduce((a, b) => a + b, 0);
  const trailKm = roadTypes?.trail || 0;
  if (totalKm > 0 && trailKm / totalKm > 0.3) {
    sentence += ' ' + pick([
      'Some stretches are faint and easily lost without care — the trail demands attention.',
      'The path thins at times to little more than a game track; lose it and the country offers no clear way.',
      'The trail is uncertain in places — the traveller must read the land rather than any road.',
    ], rng);
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

// ---------------------------------------------------------------------------
// Reference notes for the new prompt structure
// ---------------------------------------------------------------------------

const WAY_IN_FOCI = [
  'the sound of the place — what the traveller hears, not what he sees',
  'the light — how the day opens, turns, and closes',
  'the body of the traveller — weariness, breath, the weight of the pack',
  'a small object or detail on the road — a stone, a track, a snapped branch',
  'the silence or absence — what is not there, what the land withholds',
];

/**
 * Pick a narrative focus for the day opening.
 * @param {() => number} rng
 * @returns {string}
 */
export function pickTodaysWayIn(rng = Math.random) {
  return pick(WAY_IN_FOCI, rng);
}

/**
 * Collect region-specific terrain notes for the reference section.
 * Returns an array of bullet-ready strings like "- hills: ...".
 * @param {Array} biomes - array of objects with type, area_km2, and hour_float
 * @param {string[]} altitude
 * @param {Array} regions
 * @param {Object} terrainPhrases
 * @param {() => number} [rng]
 * @returns {string[]}
 */
export function collectTerrainNotes(biomes, altitude, regions = [], terrainPhrases = {}, rng = Math.random) {
  const regionNames = (regions || []).map((r) => (typeof r === 'string' ? r : r.name));
  const notes = [];

  const presentBiomes = (biomes || []).filter(Boolean);
  const presentAltitude = (altitude || []).filter(Boolean);

  for (const b of presentBiomes) {
    const biomeType = typeof b === 'string' ? b : b.type;
    const areaKm2 = typeof b === 'object' && b.area_km2 != null ? b.area_km2 : null;
    const isSmall = areaKm2 != null && areaKm2 < 10;
    const hourFloat = typeof b === 'object' && b.hour_float != null ? b.hour_float : null;
    const when = hourFloat != null ? ` (${timeOfDayPhrase(hourFloat)})` : '';

    const phrase = pickPhraseForRegions(terrainPhrases, regionNames, biomeType, rng) || BIOME_PHRASES[biomeType] || biomeType;
    const prefix = isSmall ? 'pequeño ' : '';
    notes.push(`- ${prefix}${biomeType}${when}: ${phrase}`);
  }

  for (const a of presentAltitude) {
    const phrase = pickPhraseForRegions(terrainPhrases, regionNames, a, rng) || ALTITUDE_PHRASES[a] || a;
    notes.push(`- ${a}: ${phrase}`);
  }

  if (notes.length === 0) {
    const plain = pickPhraseForRegions(terrainPhrases, regionNames, 'plain', rng) || BIOME_PHRASES.plain || 'open country';
    notes.push(`- plain: ${plain}`);
  }

  return notes;
}

/**
 * Collect region-specific road notes for the reference section.
 * @param {Object} roadTypes
 * @param {Array} regions
 * @param {Object} terrainPhrases
 * @param {() => number} [rng]
 * @returns {string[]}
 */
export function collectRoadNotes(roadTypes, regions = [], terrainPhrases = {}, rng = Math.random) {
  const regionNames = (regions || []).map((r) => (typeof r === 'string' ? r : r.name));
  const notes = [];
  const entries = Object.entries(roadTypes || {}).filter(([, km]) => km > 0);

  for (const [type, km] of entries) {
    let phrase = null;
    if (type === 'road' || type === 'trail') {
      phrase = pickPhraseForRegions(terrainPhrases, regionNames, type, rng);
    }
    phrase = phrase || ROAD_PHRASES[type] || type;
    notes.push(`- ${type}: ${phrase} (${km.toFixed(1)} km)`);
  }

  return notes;
}

/**
 * Collect weather notes split by time of day.
 * @param {Array} climateArray
 * @param {() => number} [rng]
 * @returns {string[]}
 */
export function collectClimateNotes(climateArray, rng = Math.random) {
  if (!Array.isArray(climateArray) || climateArray.length === 0) {
    return ['- The weather leaves little mark on the day.'];
  }

  const samples = climateArray
    .map((s) => ({ time: s.time, w: innerClimate(s) }))
    .filter((s) => s.w);

  if (samples.length === 0) {
    return ['- The weather leaves little mark on the day.'];
  }

  const timeOfDay = (hour) => {
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  };

  const byPhase = {};
  for (const s of samples) {
    const h = new Date(s.time).getHours();
    const phase = timeOfDay(h);
    if (!byPhase[phase]) byPhase[phase] = [];
    byPhase[phase].push(s.w);
  }

  const notes = [];
  const phases = ['morning', 'afternoon', 'evening', 'night'];

  for (const phase of phases) {
    const ws = byPhase[phase];
    if (!ws || ws.length === 0) continue;

    const temps = ws.map((w) => w.temperature_2m).filter((n) => typeof n === 'number');
    const clouds = ws.map((w) => w.cloud_cover).filter((n) => typeof n === 'number');
    const winds = ws.map((w) => w.wind_speed_10m).filter((n) => typeof n === 'number');
    const precips = ws.map((w) => w.precipitation || 0).filter((n) => typeof n === 'number');

    const meanTemp = avg(temps);
    const meanCloud = avg(clouds);
    const meanWind = avg(winds);
    const totalPrec = precips.reduce((a, b) => a + b, 0);

    const parts = [];
    if (meanTemp != null) {
      if (meanTemp < 2) parts.push('bitter cold');
      else if (meanTemp < 8) parts.push('cold');
      else if (meanTemp < 15) parts.push('cool');
      else if (meanTemp < 22) parts.push('mild');
      else if (meanTemp < 29) parts.push('warm');
      else parts.push('hot');
    }
    if (meanCloud != null) {
      if (meanCloud < 25) parts.push('clear skies');
      else if (meanCloud < 60) parts.push('partly cloudy');
      else if (meanCloud < 90) parts.push('mostly overcast');
      else parts.push('heavy cloud cover');
    }
    if (meanWind != null && meanWind > 18) parts.push('windy');
    if (totalPrec > 0.2) parts.push('wet');
    else if (totalPrec > 0) parts.push('a passing shower');

    if (parts.length) {
      notes.push(`- ${phase}: ${joinList(parts)}`);
    }
  }

  return notes.length ? notes : ['- The weather leaves little mark on the day.'];
}

/**
 * Collect location notes for the reference section.
 * @param {Array} locations
 * @returns {string[]}
 */
export function collectLocationNotes(locations) {
  if (!Array.isArray(locations) || locations.length === 0) {
    return ['- No settlements or landmarks of note.'];
  }

  return locations.map((l) => {
    const when = timeOfDayPhrase(l.hour_float);
    let near;
    if (l.distance_km === 0) {
      near = 'passes through';
    } else if (l.distance_km != null && l.distance_km > 1) {
      near = 'passed at some distance';
    } else {
      near = 'passed close by';
    }
    const kind = l.type ? ` (${String(l.type).replace(/_/g, ' ')})` : '';
    const desc = l.description && l.description.trim() ? ` — ${l.description.trim()}` : '';
    return `- ${l.name}${kind}: ${near}, ${when}.${desc}`;
  });
}

export { timeOfDayPhrase };
