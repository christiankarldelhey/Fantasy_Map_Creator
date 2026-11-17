// ============================================================================
// Place-host minting — seed-time, deterministic, stored (ADR-0015)
// ----------------------------------------------------------------------------
// A kept place's host is a REAL entity, not a field on the place: one row in
// `entities` (is_npc, type='npc', location_id = where she lives) plus one
// entities_narration kind='entity' ficha for her voice. Names are drawn once
// here — hash of the place record id picks from the curated pools, a uuid5
// of the same id keys the row — so every reseed mints the same Mimosa and
// runtime only reads what the DB says. Unanchored fichas mint nobody: a
// person with no coordinates is a ghost.
//
// Archetypes keep their collective names — 'Dunlendings Warriors' is a band,
// not a Brogradoc. A group's chief may be NAMED IN THE ASPECT'S PROSE, never
// as structured data; only individuals carry a person-name in entities.name.
//
// Pools: ../data/json/npc_names.json — curated from pnj-names.json with the
// canon names removed; names_f holds women's names where the culture gives
// them (hobbits as flowers, Rohirrim -wyn/-hild, elvish -iel/-wen).
// ============================================================================

import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const POOLS = JSON.parse(readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)),
    '../data/json/npc_names.json'),
  'utf8'
));

// Fixed uuid5 namespace for minted host entities — the place record id is
// the name inside it, so SH-37's keeper has the same uuid forever.
const HOST_NS = '3f1c9a2e-7b4d-4e5f-9a6b-1c2d3e4f5a6b';

function uuid5(name) {
  const ns = Buffer.from(HOST_NS.replace(/-/g, ''), 'hex');
  const b = createHash('sha1').update(ns).update(String(name), 'utf8')
    .digest().subarray(0, 16);
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}` +
    `-${h.slice(16, 20)}-${h.slice(20)}`;
}

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

// regions.cultural_family → people: the land says who a generic keeper is.
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

function peopleOf(hay, culturalFamily) {
  for (const [re, people] of PEOPLE_RULES) {
    if (re.test(hay)) return people;
  }
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

/** The keeper of a place — the entity row minted for her. Dead places
 * keep nobody; keeper text or a hosted kind says somebody is home. A
 * place without an anchored location mints no one (no coordinates, no
 * person). Returns {entity, ficha} or null. */
export function mintPlaceHost(record, locationId, culturalFamily) {
  if (record?.kind !== 'place' || !locationId) return null;
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

  const gender = genderOf([keeper, record.inhabitants].filter(Boolean).join(' '));
  const host = draw(peopleOf(hay, culturalFamily), record.id, gender);

  const id = uuid5(`host:${record.id}`);
  const slug = `npc_${String(record.id).toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
  const placeName = record.name?.en || record.name?.es
    || (typeof record.name === 'string' ? record.name : record.id);

  const entity = {
    id,
    name: host.name,
    slug,
    type: 'npc',
    active: 'all-day',
    tier: 'resident',
    is_npc: true,
    shadow_weight: 0,
    location_id: locationId,
  };
  const ficha = {
    id: `ent:${slug}`,
    kind: 'entity',
    entity_id: id,
    entity_type: 'npc',
    location_id: locationId,
    aspect: {
      en: keeper
        ? `${host.name}, ${host.gloss} — ${keeper}`
        : `${host.name}, ${host.gloss}, keeper of ${placeName}.`,
    },
    lore: record.lore ?? null,
    tags: [],
    payload: {
      source: 'place-host',
      place: record.id,
      // Display metadata — the NAME lives on entities.name; the people
      // and the keeper's own words give the rest of who she is.
      npc: { people: host.people, gloss: host.gloss, ...(gender ? { gender } : {}) },
    },
  };
  return { entity, ficha };
}
