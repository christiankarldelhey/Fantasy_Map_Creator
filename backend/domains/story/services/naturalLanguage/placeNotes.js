// ============================================================================
// Place notes: lands crossed, settlements passed, and the overnight camp
// ----------------------------------------------------------------------------
// Restored to Node as part of the world-voice migration (issue #52): the
// mind-engine Python twin was removed in #54 — this module is the only copy.
// ============================================================================

import { timeOfDayPhrase } from './dayPhases.js';
import { descriptionSuffix, readableType } from './text.js';

// Beyond this distance the traveller only sees the place on the horizon.
export const DISTANT_SIGHTING_KM = 1;

// The silhouette a kind gives from beyond reach, before the place is
// known — the whole far-face channel (#187 dropped the never-authored
// sighted_far override; the derived shape covers it).
// Two states per kind: what life gives away at distance (smoke, lamps,
// banners, movement) or — when the place is dead — its absence, which
// is what the eye actually reads. A burned inn shows no smoke; a sacked
// wall shows no watch-fires. `live`/`dead` per kind.
const SIGHTED_SHAPES = {
  'fortified city': {
    live: 'walls and a haze of chimney-smoke',
    dead: 'walls standing open — no smoke above them, no guard-fires',
  },
  'fortified town': {
    live: 'walls and a haze of chimney-smoke',
    dead: 'walls standing open — no smoke above them, no guard-fires',
  },
  'fortified village': {
    live: 'rooftops behind a palisade, a thread of smoke',
    dead: 'a palisade with no smoke behind it',
  },
  citadel: {
    live: 'walls and a haze of chimney-smoke',
    dead: 'walls standing open — no smoke above them, no guard-fires',
  },
  city: {
    live: 'walls and a haze of chimney-smoke',
    dead: 'walls standing open — no smoke above them, no guard-fires',
  },
  fortress: {
    live: 'a keep against the sky, banners on the wall',
    dead: 'a keep against the sky — no banners, no watch-fires',
  },
  castle: {
    live: 'a keep against the sky, banners on the wall',
    dead: 'a keep against the sky — no banners, no watch-fires',
  },
  tower: {
    live: 'a tall shape against the sky',
    dead: 'a broken crown against the sky',
  },
  watchtower: {
    live: 'a tall shape against the sky',
    dead: 'a broken crown against the sky',
  },
  lookout: {
    live: 'a high perch against the sky',
    dead: 'a broken perch against the sky',
  },
  town: {
    live: 'rooftops and a thread of smoke',
    dead: 'rooftops, and no smoke above them — nothing moves',
  },
  village: {
    live: 'rooftops and a thread of smoke',
    dead: 'rooftops, and no smoke above them — nothing moves',
  },
  settlement: {
    live: 'rooftops and a thread of smoke',
    dead: 'rooftops, and no smoke above them — nothing moves',
  },
  inn: {
    live: 'rooftops and a thread of smoke',
    dead: 'a blackened roofline — no smoke, no lamps',
  },
  tavern: {
    live: 'rooftops and a thread of smoke',
    dead: 'a blackened roofline — no smoke, no lamps',
  },
  manor: {
    live: 'rooftops and a thread of smoke',
    dead: 'a great house, and no lamps lit',
  },
  mansion: {
    live: 'rooftops and a thread of smoke',
    dead: 'a great house, and no lamps lit',
  },
  seat: {
    live: 'rooftops and a thread of smoke',
    dead: 'a great house, and no lamps lit',
  },
  hall: {
    live: 'a long roof and a thread of smoke',
    dead: 'a long roof, and no lamps lit',
  },
  house: {
    live: 'a lone roof under a thread of smoke',
    dead: 'a lone roof — no smoke, the door standing open',
  },
  cottage: {
    live: 'a lone roof under a thread of smoke',
    dead: 'a lone roof — no smoke, the door standing open',
  },
  farm: {
    live: 'a lone roof under a thread of smoke',
    dead: 'a lone roof — no smoke, no stock in the field',
  },
  refuge: {
    live: 'a low roof tucked in the lee, a thread of smoke',
    dead: 'a low roof in the lee, its door open to the weather',
  },
  shelter: {
    live: 'a low roof tucked in the lee, a thread of smoke',
    dead: 'a low roof in the lee, its door open to the weather',
  },
  camp: {
    live: 'a scatter of tents and fires',
    dead: 'fire-rings gone cold, and nobody by them',
  },
  mill: {
    live: 'a wheel turning on the water',
    dead: 'a wheel dead on the water',
  },
  bridge: {
    live: 'a span across the water',
    dead: 'a span broken at the water',
  },
  crossing: {
    live: 'a way over the water',
    dead: 'a way broken at the water',
  },
  port: {
    live: 'masts and a haze of smoke by the water',
    dead: 'empty wharves, and no masts',
  },
  harbour: {
    live: 'masts and a haze of smoke by the water',
    dead: 'empty wharves, and no masts',
  },
  mine: {
    live: 'workings in the hillside, smoke and carts',
    dead: 'workings gone quiet — no smoke, no carts',
  },
  ruin: {
    live: 'a broken shape against the sky',
    dead: 'a broken shape against the sky',
  },
  ruins: {
    live: 'a broken shape against the sky',
    dead: 'a broken shape against the sky',
  },
  'major ruin': {
    live: 'a field of mounds where a city stood — one wall still upright',
    dead: 'a field of mounds where a city stood — one wall still upright',
  },
  barrow: {
    live: 'a green mound against the sky',
    dead: 'a green mound against the sky',
  },
  'standing stones': {
    live: 'stones leaning on the hilltop',
    dead: 'stones leaning on the hilltop',
  },
  beacon: {
    live: 'a bare height with a cold fire-basket',
    dead: 'a bare height with a cold fire-basket',
  },
  monument: {
    live: 'a stone raised against the sky',
    dead: 'a stone raised against the sky',
  },
};

// Kinds in the wild are compositional — 'enemy watchtower', 'manor
// ruins', 'tower and village', 'beacon cape'. The first structure word
// in the string wins, because that is the thing the eye would catch
// first. Each maps onto the canonical silhouette above.
const STRUCTURE_KIND = [
  ['watchtower', 'watchtower'], ['standing stones', 'standing stones'],
  ['fortified city', 'fortified city'], ['fortified town', 'fortified town'],
  ['fortified village', 'fortified village'], ['citadel', 'citadel'],
  ['fortress', 'fortress'], ['castle', 'castle'], ['beacon', 'beacon'],
  ['tower', 'tower'], ['lookout', 'lookout'], ['city', 'city'],
  ['town', 'town'], ['village', 'village'], ['settlement', 'settlement'],
  ['settlements', 'settlement'], ['hamlet', 'village'], ['inn', 'inn'],
  ['tavern', 'tavern'], ['lodging', 'inn'], ['manor', 'manor'], ['mansion', 'mansion'],
  ['estate', 'manor'], ['seat', 'seat'], ['hall', 'hall'],
  ['temple', 'hall'], ['shrine', 'standing stones'], ['sacred', 'standing stones'],
  ['ritual', 'standing stones'], ['oracle', 'standing stones'],
  ['monument', 'monument'], ['memorial', 'monument'], ['stones', 'standing stones'],
  ['house', 'house'], ['cottage', 'cottage'], ['smial', 'house'],
  ['lodge', 'house'], ['farm', 'farm'], ['refuge', 'refuge'],
  ['shelter', 'shelter'], ['camp', 'camp'], ['sawmill', 'mill'],
  ['mill', 'mill'], ['forge', 'mill'], ['smithy', 'mill'],
  ['shipyard', 'port'], ['lighthouse', 'tower'], ['bridge', 'bridge'],
  ['crossing', 'crossing'], ['ford', 'crossing'], ['port', 'port'],
  ['harbour', 'harbour'], ['mine', 'mine'], ['hold', 'fortress'],
  ['post', 'camp'], ['garrison', 'fortress'], ['ruin', 'ruin'],
];

// No roofline to see, but still a shape the horizon carries.
const LANDSCAPE_SHAPE = [
  ['waterfall', 'a white thread on the rock'],
  ['forest', 'a dark line of trees'],
  ['copse', 'a stand of trees'],
  ['clearing', 'a break in the trees'],
  ['lake', 'water under the sky'],
  ['water', 'water under the sky'],
  ['moor', 'open moor to the sky'],
  ['marsh', 'wet ground under a low sky'],
  ['desert', 'bare ground to the horizon'],
  ['hill', 'a bare rise'],
  ['valley', 'the fall of a valley'],
  ['passage', 'a notch in the ridge'],
  ['pass', 'a notch in the ridge'],
  ['coast', 'the line where land meets water'],
  ['ledge', 'a shelf on the rock'],
  ['cavern', 'a dark mouth in the rock'],
  ['tree', 'a great tree against the sky'],
  ['battlefield', 'open ground where something happened'],
  ['road', 'the line of an old road'],
  ['landmark', 'a shape you could steer by'],
  ['border', 'the line where the land changes'],
  ['boundary', 'the line where the land changes'],
  ['threshold', 'the line where the land changes'],
  ['limit', 'the line where the land changes'],
  ['work', 'workings against the sky'],
  ['landscape', 'open country under the sky'],
  ['terrain', 'open ground under the sky'],
  ['difficult', 'rough ground, hard going'],
  ['ground', 'open ground'],
];

const STRUCTURE_RE = new RegExp(
  `\\b(${STRUCTURE_KIND.map(([w]) => w).join('|')})\\b`);
const LANDSCAPE_RE = new RegExp(
  `\\b(${LANDSCAPE_SHAPE.map(([w]) => w).join('|')})\\b`);
const STRUCTURE_OF = Object.fromEntries(STRUCTURE_KIND);
const LANDSCAPE_OF = Object.fromEntries(LANDSCAPE_SHAPE);

// Words that mark a place as dead before you are near enough to know:
// in the name ('The Burned Inn'), the record's kind ('ruin'), or the
// closed-registry tags ('ruins'). And the words that override it — an
// 'inhabited ruin' shows smoke among the stones, not a dead shape.
const DEAD_PLACE = /burn|char|ruin|abandon|dead|fallen|sack|destroy|desert|collaps|blight|forsaken|overgrown|broken/i;
const STILL_LIVED = /inhabit|occupi|habitab|working|functional|recycl|surviv|taken|kept/i;

/** Whether the place is alive or dead as far as the eye can tell —
 * a burned inn shows a blackened roofline, not a thread of smoke. */
export function isDeadPlace(location) {
  const hay = [
    location?.type, location?.narration_type, location?.name,
    ...(location?.record_tags || []),
  ].filter(Boolean).join(' ');
  return DEAD_PLACE.test(hay) && !STILL_LIVED.test(hay);
}

/** What a place reads as from beyond its reach when nothing is authored:
 * its kind's silhouette in the state the eye can actually see. The
 * record's authored kind ('major ruin') knows the place better than the
 * gazetteer's coarse class ('ruin') — it speaks first; inside either
 * string, the first structure word wins ('beacon tower' reads as the
 * beacon, 'manor ruins' as the dead manor). */
export function sightedShape(location) {
  for (const raw of [location?.narration_type, location?.type]) {
    const kind = String(raw || '').toLowerCase().replace(/\*/g, '');
    if (!kind) continue;
    let shape = SIGHTED_SHAPES[kind];
    if (!shape) {
      const built = kind.match(STRUCTURE_RE);
      if (built) shape = SIGHTED_SHAPES[STRUCTURE_OF[built[1]]];
    }
    if (!shape) {
      const land = kind.match(LANDSCAPE_RE);
      if (land) shape = { live: LANDSCAPE_OF[land[1]], dead: LANDSCAPE_OF[land[1]] };
    }
    if (shape) return isDeadPlace(location) ? shape.dead : shape.live;
  }
  return isDeadPlace(location)
    ? 'a shape on the horizon, nothing moving'
    : 'a shape on the horizon';
}

const PLURAL_SIGHTED = new Set(['ruins']);

/** The anonymous subject a distant sighting gets: 'a town', 'some ruins'. */
function sightedSubject(location) {
  const kindWord = readableType(location?.type) || 'place';
  const article = PLURAL_SIGHTED.has(location?.type) ? 'some'
    : /^[aeiou]/i.test(kindWord) ? 'an' : 'a';
  return `${article} ${kindWord}`;
}

/** A place met only from afar: never inside its size radius, never
 * within sighting detail — whatever the flags say, distance is the fact. */
export function isDistantSighting(location) {
  return !location?.entered && !location?.visited
    && location?.distance_km != null
    && location.distance_km > DISTANT_SIGHTING_KM;
}

const PROXIMITY_THROUGH = 'passes through';
const PROXIMITY_CLOSE = 'passed close by';
const PROXIMITY_DISTANT = 'passed at some distance';

/** How the traveller met this place, from its distance to the road. Within
 * the place's authored size radius counts as through — a town's footprint,
 * not just its centre point. */
function proximityPhrase(distanceKm, sizeRadiusKm) {
  if (distanceKm === 0 || (sizeRadiusKm != null && distanceKm != null && distanceKm <= sizeRadiusKm)) {
    return PROXIMITY_THROUGH;
  }
  if (distanceKm != null && distanceKm > DISTANT_SIGHTING_KM) return PROXIMITY_DISTANT;
  return PROXIMITY_CLOSE;
}

/** The lands crossed in order, each with its character (description_summary).
 *  `enteredNames` marks the lands the road reached for the first time today —
 *  a border crossing is a moment, not just context. */
export function describeRegions(regions, enteredNames = null) {
  if (!Array.isArray(regions) || regions.length === 0) {
    return 'The day passes through unnamed country.';
  }

  const lines = [];
  for (const region of regions) {
    const name = typeof region === 'string' ? region : region.name;
    const summary = typeof region === 'string' ? null : region.description_summary;
    const marker = enteredNames?.has(name) ? ' (entered today — a new land)' : '';
    if (summary && summary.trim()) {
      lines.push(`- ${name}${marker}: ${summary.trim()}`);
    } else {
      lines.push(`- ${name}${marker}`);
    }
  }
  return lines.join('\n');
}

/** Bullet-ready notes on the settlements and landmarks along the day's road. */
export function collectLocationNotes(locations) {
  if (!Array.isArray(locations) || locations.length === 0) {
    return ['- No settlements or landmarks of note.'];
  }

  const notes = [];
  for (const l of locations) {
    const kind = l.type ? ` (${readableType(l.type)})` : '';
    // 'entered' beats distance math: the traveller walked IN, whatever
    // the off-route metres say. 'hostile' is the opposite — an enemy
    // place skirted from outside, never entered.
    const when = timeOfDayPhrase(l.hour_float);
    // A place the road never reaches is first sighted when the leg crosses
    // into its influence circle — the horizon moment precedes the passing.
    const sight = l.sighted
      ? `sighted far off${l.sighted_direction ? ` to the ${l.sighted_direction}` : ''}, ${timeOfDayPhrase(l.sighted_hour_float)} — `
      : '';
    let proximity;
    if (l.entered) {
      proximity = `reaches it ${when} and stays — the day ends here`;
    } else if (l.hostile) {
      proximity = `${sight}passed outside, ${when} — enemy country, no welcome there`;
    } else {
      // A sighting clause already carries its hour ('sighted far off to
      // the southwest, in the early morning — …'); the passing needs no
      // second stamp.
      const time = sight ? '' : `, ${when}`;
      proximity = `${sight}${proximityPhrase(l.distance_km, l.size_radius_km)}${time}`;
    }
    // From beyond its reach a place is only its silhouette — anonymous,
    // read from its kind (sightedShape, #187: the authored override
    // column is gone, the derived shape is the whole far-face). aspect
    // is the face seen from outside up close; presence is being there.
    const distant = isDistantSighting(l);
    const subject = distant ? sightedSubject(l) : `${l.name}${kind}`;
    const prose = distant
      ? sightedShape(l)
      : (l.visited || l.entered) ? (l.presence || l.aspect) : l.aspect;
    notes.push(`- ${subject}: ${proximity}${prose ? descriptionSuffix(prose) : '.'}`);
  }
  return notes;
}

/** The shelter (or lack of it) the location offers for the night. */
function shelterPhrase(location) {
  if (location.indoor) {
    return `There is likely a tavern, inn or hall where ${location.name} offers shelter and warmth for the night.`;
  }
  return 'The character may shelter within its walls or in its shadow for the night.';
}

const NO_SHELTER_NOTE = "No shelter of note lies near the day's end. The night is spent under open sky, with whatever cover the land affords.";

/**
 * Describe where the character spends the night, plus any reference
 * material from the resolved overnight interaction record.
 */
export function describeOvernightLocation(location, interaction = null) {
  let text = NO_SHELTER_NOTE;

  if (location) {
    const kind = location.type ? readableType(location.type) : 'place';
    const description = location.presence || location.aspect;
    const firstSentence = description && description.trim()
      ? ` ${description.trim().split('.')[0]}.`
      : '';
    text = `Before nightfall, the road reaches ${location.name} (${kind}), ${location.distance_km} km from the day's end.${firstSentence} ${shelterPhrase(location)}`;
  }

  if (interaction && interaction.description) {
    const title = interaction.title ? `Title: ${interaction.title}\n` : '';
    text += `\n\nOvernight reference material (render fresh — never copy the wording):\n${title}${interaction.description}`;
  }

  return text;
}
