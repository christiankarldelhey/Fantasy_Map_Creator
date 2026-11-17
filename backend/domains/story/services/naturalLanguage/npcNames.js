// ============================================================================
// NPC names — who the thinking beings ARE (ADR-0015 voice layer)
// ----------------------------------------------------------------------------
// An encounter with a thinking being should give the mind somebody to hold:
// 'Hal the hobbit', not 'a man'. Pools live in npc-names.json beside this
// curated per people from the pnj-names seed; a canon-name blocklist keeps
// 'Frodo' and 'Thorin' out of the draw — names that ARE somebody already.
//
// Two resolution paths:
//   npcForEncounter — drawn with the day's seeded rng: the same dunlending
//     band met again is a different person, so a new draw.
//   hostForPlace    — hashed off the place: the widow of the deep smial
//     keeps her name across visits, because the house keeps the person.
//
// A name is only earned when words pass — dialogue_content present, or an
// authored keeper behind the door. Sign-read orcs stay nameless.
// ============================================================================

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isDeadPlace } from './placeNotes.js';

const POOLS = JSON.parse(readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)),
    './npc-names.json'),
  'utf8'
));

// Kinds of being that can hold a name — the mind keeps 'npc' for authored
// characters; trolls ride the orcish pool (group 7 of the seed file).
const NAMEABLE_TYPES = new Set([
  'humans', 'elves', 'dwarves', 'hobbits', 'npc', 'orcs', 'trolls',
]);

// Entity slug/name → people. First match wins; the most specific peoples
// lead so 'rangers_of_ithilien' never lands in the northern pool.
const PEOPLE_RULES = [
  [/beffraen|wose|dr[uú]edain|p[uú]kel/i, 'woses'],
  [/dunlending|hillmen|hillman|daen|rhudaur|saralainn/i, 'dunlendings'],
  [/rangers?_(of_)?ithilien|gondor|minas_ithil|dol_amroth|lebennin|anorian|sea_lords|ithilien/i, 'gondor'],
  [/d[uú]nedain|dnedain|faithful_of_arnor|arthadan|rangers?_(of_)?the_north|rangers?_(at|in)_the_inns?|rangers?_(of_)?arnor/i, 'dunedain'],
  [/rohirrim|calenardhon|eothraim|horsefolk|northmen|dale/i, 'rohirrim'],
  [/beorning|woodmen|beijabar|woodman|eraguk/i, 'woodmen'],
  [/harad|haruze|haradwaith/i, 'haradrim'],
  [/lossoth|lumimiehet|helechoth/i, 'lossoth'],
  [/variag|asdriag|sagath|easterling|rhunen|gramuz|dyrian|logath/i, 'easterlings'],
  [/black_nmenorean|numenorean|corsair|pirate|umbar|sakalai/i, 'numenoreans_black'],
  [/dorwinrim/i, 'dorwinrim'],
  [/hobbit|stoor|harfoot|fallohide|shire|smial/i, 'hobbits'],
  [/silvan|galadhrim|laiquendi|laegrim|iathrim|lindellim|thranduil|woodland|snow-?el/i, 'elves_silvan'],
  [/elf|noldor|sindar|mithrim|falathrim|mithlond|edhellond|rivendell/i, 'elves'],
  [/dwarf|dwarves|broadbeam|umli|khazad|erebor|iron_hills|blue_mountains|harlindon|durin/i, 'dwarves'],
  [/orc|goblin|uruk|olog|troll|tereg/i, 'orcs'],
];

// regions.cultural_family → people, for the generic traveller whose slug
// says only 'humans': the land tells you who he is.
const FAMILY_PEOPLE = {
  dunlending: 'dunlendings',
  gondorian: 'gondor',
  coastal: 'gondor',
  dunadan_north: 'dunedain',
  northman: 'rohirrim',
  silvan: 'elves_silvan',
  sindar: 'elves',
  high_elven: 'elves',
  dwarven: 'dwarves',
  lossoth: 'lossoth',
  hobbit: 'hobbits',
  enemy: 'orcs',
  wild_wose: 'woses',
};

const TYPE_PEOPLE = {
  humans: null, // culture decides — see below
  elves: 'elves',
  dwarves: 'dwarves',
  hobbits: 'hobbits',
  npc: null,
  orcs: 'orcs',
  trolls: 'orcs',
};

function peopleForEntity(entity, culturalFamily = null) {
  const hay = [entity?.slug, entity?.name, entity?.family]
    .filter(Boolean).join(' ');
  for (const [re, people] of PEOPLE_RULES) {
    if (re.test(hay)) return people;
  }
  const byType = TYPE_PEOPLE[entity?.type];
  if (byType) return byType;
  return FAMILY_PEOPLE[culturalFamily] || 'eriador';
}

function hashString(s) {
  let h = 0;
  for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function draw(people, roll) {
  const pool = POOLS[people] || POOLS.eriador;
  const idx = Math.floor(roll * pool.names.length) % pool.names.length;
  return { name: pool.names[idx], people, gloss: pool.gloss };
}

/** Who spoke, when words actually passed. Deterministic per the day's
 * seeded rng — replay the day, meet the same person. */
export function npcForEncounter(entity, culturalFamily = null, rng = Math.random) {
  if (!NAMEABLE_TYPES.has(entity?.type)) return null;
  return draw(peopleForEntity(entity, culturalFamily), rng());
}

// Kinds of place that have somebody home to open the door — a keep held,
// a farm worked, a smial kept. Dead places keep nobody (isDeadPlace
// lives in placeNotes; the wire carries record_tags/name for it to read).
const HOSTED_KIND = /inn|tavern|house|cottage|farm|refuge|shelter|manor|mansion|seat|hall|smial|village|town|settlement|hamlet|camp|mill|lodge|hold|stead/i;

/** The keeper of a slept-in place — deterministic per place, because
 * the same house keeps the same person. Returns null when nobody lives
 * there to name: a dead inn, an open field, a ruin holds no keeper. */
export function hostForPlace(place, culturalFamily = null) {
  if (!place || isDeadPlace(place)) return null;
  const hay = [
    place.type, place.name, place.inhabitants,
    ...(place.record_tags || place.tags || []),
  ].filter(Boolean).join(' ');
  const keeper = place.facts?.keeper || place.keeper;
  if (!keeper && !HOSTED_KIND.test(hay)) return null;
  // Who keeps it: the record's own words first ('hobbit' in the
  // inhabitants), then the land's family.
  const entityLike = {
    slug: [place.inhabitants, place.type, place.name].filter(Boolean).join(' '),
    type: null,
  };
  const people = peopleForEntity(entityLike, culturalFamily);
  return draw(people, (hashString(place.id ?? place.name) % 1000) / 1000);
}
