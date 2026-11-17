// ============================================================================
// NPC name assignment — seed-time, deterministic, stored (ADR-0015)
// ----------------------------------------------------------------------------
// A name is DATA, not a draw: assigned once here, written into the record's
// payload, and read verbatim at runtime. Re-run the seed and the same widow
// keeps the same name, because the draw is a hash of the record id — and a
// name authored by hand (payload.npc.name / payload.host.name already set)
// is never overwritten by the draw.
//
//   entities_narration kind='entity' (sentient types) → payload.npc
//   places_narration   kind='place'  (kept/hosted, not dead) → payload.host
//
// Pools: ../data/json/npc_names.json — curated from pnj-names.json with the
// canon names removed; names_f holds women's names where the culture gives
// them (hobbits as flowers, Rohirrim -wyn/-hild, elvish -iel/-wen).
// ============================================================================

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const POOLS = JSON.parse(readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)),
    '../data/json/npc_names.json'),
  'utf8'
));

// Kinds of being that can hold a name — trolls ride the orcish pool.
const NAMEABLE_TYPES = new Set([
  'humans', 'elves', 'dwarves', 'hobbits', 'npc', 'orcs', 'trolls',
]);

// Slug/name → people. First match wins; the most specific peoples lead so
// 'rangers_of_ithilien' never lands in the northern pool.
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

// regions.cultural_family → people: the land says who a generic traveller is.
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
  humans: null,
  elves: 'elves',
  dwarves: 'dwarves',
  hobbits: 'hobbits',
  npc: null,
  orcs: 'orcs',
  trolls: 'orcs',
};

function peopleOf(hay, entityType, culturalFamily) {
  for (const [re, people] of PEOPLE_RULES) {
    if (re.test(hay)) return people;
  }
  const byType = TYPE_PEOPLE[entityType];
  if (byType) return byType;
  return FAMILY_PEOPLE[culturalFamily] || 'eriador';
}

// The record's own words mark a place dead before anyone knocks.
const DEAD_PLACE = /burn|char|ruin|abandon|dead|fallen|sack|destroy|desert|collaps|blight|forsaken|overgrown|broken/i;
// Words that say a dead-looking place is actually kept.
const STILL_LIVED = /inhabit|occupi|habitab|working|functional|recycl|surviv|taken|kept/i;

// Kinds of place that have somebody home to open the door.
const HOSTED_KIND = /inn|tavern|house|cottage|farm|refuge|shelter|manor|mansion|seat|hall|smial|village|town|settlement|hamlet|camp|mill|lodge|hold|stead/i;

// 'una viuda de smial hondo' is a woman before she is a name.
const FEMALE_WORD = /viuda|widow|mujer|woman|madre|mother\b|dama|lady\b|señora|esposa|wife|hija|daughter|doncella|matron|abuela|grandmother|matriarch|anciana|bruja|witch|curandera|healer-woman|maiden|wench|female/i;
const MALE_WORD = /viudo|widower|hombre|\bman\b|padre|father|señor|lord\b|marido|husband|hijo|\bson\b|muchacho|abuelo|grandfather|anciano|curandero|innkeeper|keeper|patriarch/i;

function genderOf(text) {
  if (!text) return null;
  const female = FEMALE_WORD.test(text);
  const male = MALE_WORD.test(text);
  if (female && !male) return 'f';
  if (male && !female) return 'm';
  return null;
}

function hashString(s) {
  let h = 0;
  for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function draw(people, seed, gender = null) {
  const pool = POOLS[people] || POOLS.eriador;
  const list = (gender === 'f' && pool.names_f?.length)
    ? pool.names_f : pool.names;
  const idx = hashString(seed) % list.length;
  // 'a man of Gondor' says itself wrong for a woman — the people stays,
  // the word bends.
  const gloss = gender === 'f'
    ? pool.gloss.replace(/^a man\b/, 'a woman')
    : pool.gloss;
  return { name: list[idx], people, gloss };
}

/** The fixed person an entity is — 'Brogradoc' for the dunlending band.
 * An authored name already in the payload wins and is never redrawn. */
export function assignEntityNpc(record) {
  if (record?.kind !== 'entity') return null;
  if (record.payload?.npc?.name) return record.payload.npc;
  const entityType = record.entity_type;
  if (!NAMEABLE_TYPES.has(entityType)) return null;
  const hay = [record.entity_slug, record.name?.en, record.name, record.family]
    .filter(Boolean).join(' ');
  const gender = genderOf(hay);
  const host = draw(
    peopleOf(hay, entityType, record.cultural_family),
    record.id,
    gender,
  );
  return gender ? { ...host, gender } : host;
}

/** The keeper of a place — 'Pearl, a hobbit' for the widow of the deep
 * smial. Dead places keep nobody; hosted-kind places do even when the
 * ficha never spelled the keeper out. */
export function assignPlaceHost(record, familyByRegion = new Map()) {
  if (record?.kind !== 'place') return null;
  if (record.payload?.host?.name) return record.payload.host;
  const typeText = record.type?.en || record.type || '';
  const keeperRaw = record.facts?.keeper || null;
  const keeper = typeof keeperRaw === 'string'
    ? keeperRaw : keeperRaw?.en || keeperRaw?.es || null;
  const hay = [
    typeText, record.name?.en, record.name?.es, record.name,
    record.inhabitants, keeper,
    ...(record.tags || []),
  ].filter(Boolean).join(' ');
  if (DEAD_PLACE.test(hay) && !STILL_LIVED.test(hay)) return null;
  if (!keeper && !HOSTED_KIND.test(hay)) return null;
  const family = record.cultural_family
    || familyByRegion.get((record.region_ids || [])[0])
    || null;
  const gender = genderOf([keeper, record.inhabitants].filter(Boolean).join(' '));
  const host = draw(peopleOf(hay, null, family), record.id, gender);
  return gender ? { ...host, gender } : host;
}
