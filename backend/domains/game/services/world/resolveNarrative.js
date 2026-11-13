import pool from '../../../../db.js';

// ============================================================================
// Narrative resolver (ADR-0014, #100)
//
// One code path for "what does the world say about X?":
//   depictionFor / depictionsFor  → the record bound to a gazetteer feature
//                                   via feature.depiction_id
//   loadScoped / resolveScoped   → scope ladder over generic records
//                                  (type, region_id, cultural_family, priority)
//   pickVariant / pickRotation   → keyed variants and per-day rotation over
//                                  a record's payload
//
// Host resolution (ficha by anchor + radii) stays in placeNotes — this module
// covers depicted features and scope-bound records.
// ============================================================================

// ---------------------------------------------------------------------------
// Type vocabulary
// ---------------------------------------------------------------------------
// Coarse grouping of fine gazetteer/record types. A record scoped to a class
// (e.g. type='settlement') matches queries for any fine type inside it; a
// fine-scoped record never satisfies a class query.
const CLASS_MEMBERS = {
  settlement: ['village', 'town', 'fortified_town', 'fortified_village', 'city', 'fortified_city', 'hamlet', 'manor', 'camp', 'inn', 'palace'],
  fortification: ['castle', 'keep', 'fortress', 'citadel', 'watchtower', 'tower', 'fortified_town', 'fortified_village', 'fortified_city'],
  water: ['stream', 'river', 'lake', 'sea', 'marsh'],
  natural: ['forest', 'hills', 'nature', 'glade', 'cavern', 'landscape'],
  ruin: ['ruins', 'major_ruin', 'dungeon', 'burial', 'cemetery'],
  landmark: ['bridge', 'crossing', 'crossroads', 'mill', 'quarry', 'mine', 'landmark', 'point_of_interest'],
  road: ['road', 'trail', 'main_road', 'royal_road'],
};

const TYPE_CLASSES = {};
for (const [cls, members] of Object.entries(CLASS_MEMBERS)) {
  for (const m of members) (TYPE_CLASSES[m] ||= []).push(cls);
}

/** Classes a fine type belongs to ([] if none). */
export function typeClasses(type) {
  return TYPE_CLASSES[type] || [];
}

/** A record's scope type matches the queried type exactly or as its class. */
export function typeMatches(recordType, queryType) {
  if (recordType == null || queryType == null) return false;
  return recordType === queryType || typeClasses(queryType).includes(recordType);
}

// ---------------------------------------------------------------------------
// Depiction fetch — records bound to gazetteer features via depiction_id
// ---------------------------------------------------------------------------
// payload.refs keys → gazetteer table (authoring vocabulary; keep in sync
// with REF_TABLES in database/seeds/scripts/load-seeds.js).
export const REF_TABLES = {
  water: 'water',
  biome: 'biomes', biomes: 'biomes',
  road: 'roads', roads: 'roads',
  location: 'locations', locations: 'locations',
  region: 'regions', regions: 'regions',
  kingdom: 'kingdoms', kingdoms: 'kingdoms',
};

const DEPICTION_TABLES = new Set(Object.values(REF_TABLES));

/** The narration record depicting one feature, or null. */
export async function depictionFor(table, featureId) {
  const rows = await depictionsFor(table, [featureId]);
  return rows.get(featureId) || null;
}

/** Map<featureId, record> for a batch of features of one gazetteer table. */
export async function depictionsFor(table, featureIds) {
  if (!DEPICTION_TABLES.has(table)) throw new Error(`depictionFor: unknown table '${table}'`);
  if (!featureIds?.length) return new Map();
  const { rows } = await pool.query(
    `SELECT f.id AS feature_id, p.*
       FROM ${table} f
       JOIN places_narration p ON p.id = f.depiction_id
      WHERE f.id = ANY($1) AND f.depiction_id IS NOT NULL`,
    [featureIds],
  );
  return new Map(rows.map((r) => [r.feature_id, r]));
}

// ---------------------------------------------------------------------------
// Scope ladder — generic records resolved by (location, type, region, family)
// ---------------------------------------------------------------------------
const SCOPE_DIMS = ['location_id', 'type', 'region_id', 'cultural_family'];

/**
 * Load all records of a kind with their scope + payload. Runtime readers map
 * them to their own row shapes.
 */
export async function loadScoped(kind) {
  const { rows } = await pool.query(
    `SELECT id, kind, location_id, type, region_id, cultural_family,
            priority, name, geom, tags, payload
       FROM places_narration
      WHERE kind = $1`,
    [kind],
  );
  return rows;
}

/**
 * Which scope dimensions a record carries (used for labels and to reject
 * scope-less candidates).
 */
export function scopeOf(record) {
  return SCOPE_DIMS.filter((d) => record[d] != null);
}

function scopeSpecificity(record) {
  return scopeOf(record).length;
}

/**
 * Pick the best-scoped record for a context.
 *
 *   ctx: { locationId, type, regionId, culturalFamily }
 *   opts.typeBound: true  → only location-bound or type-bound records
 *                           (overnight "in a settlement" context)
 *                   false → only records with no type scope
 *                           (overnight "in the wild" context)
 *                   undefined → no type-partition (default: everything eligible)
 *
 * A record is eligible when every scope dimension it carries matches the
 * context (location_id exact, type exact-or-class, region/family exact).
 * Ranking: priority desc, then specificity desc, then id asc.
 *
 * Returns { record, scope, matched } — matched lists the winning record's
 * scope dims; null record when nothing applies.
 */
export function resolveScoped(records, ctx = {}, opts = {}) {
  const { locationId, type, regionId, culturalFamily } = ctx;
  const candidates = records.filter((r) => {
    if (opts.typeBound === true && r.type == null && r.location_id == null) return false;
    if (opts.typeBound === false && (r.type != null || r.location_id != null)) return false;
    if (r.location_id != null) return r.location_id === locationId;
    if (r.type != null && !typeMatches(r.type, type)) return false;
    if (r.region_id != null && r.region_id !== regionId) return false;
    if (r.cultural_family != null && r.cultural_family !== culturalFamily) return false;
    return scopeSpecificity(r) > 0;
  });
  if (!candidates.length) return { record: null, scope: 'none', matched: [] };
  candidates.sort(
    (a, b) =>
      (b.priority ?? 0) - (a.priority ?? 0) ||
      scopeSpecificity(b) - scopeSpecificity(a) ||
      String(a.id).localeCompare(String(b.id)),
  );
  const record = candidates[0];
  return { record, scope: scopeOf(record).join('+'), matched: scopeOf(record) };
}

// ---------------------------------------------------------------------------
// Variants + rotation over a record's payload
// ---------------------------------------------------------------------------

/**
 * Pick a variant for an ordered list of context keys (e.g. the dayphase/
 * season/weather order from seasonalVariants.variantOrderForDay).
 *
 * Supports both payload shapes in the wild:
 *   map   — { 'winter': [phrases], 'snow': [phrases] }  (generated records)
 *   array — [{ key|id, text }]                           (ficha records)
 * Returns { key, phrases } / the variant object, or null.
 */
export function pickVariant(record, keyOrder = []) {
  const variants = record?.payload?.variants;
  if (!variants || !keyOrder.length) return null;
  if (Array.isArray(variants)) {
    for (const key of keyOrder) {
      const hit = variants.find((v) => v && (v.key === key || v.id === key));
      if (hit) return hit;
    }
    return null;
  }
  for (const key of keyOrder) {
    const phrases = variants[key];
    if (Array.isArray(phrases) ? phrases.length : phrases) return { key, phrases };
  }
  return null;
}

/**
 * Next unused rotation entry. `rotation` is the payload's ordered prose list
 * (strings or {idx,...} objects); `usedIndices` are the positions already
 * consumed (e.g. trip_days.used_region_descriptions). Returns
 * { index, entry } or null when the rotation is exhausted.
 */
export function pickRotation(rotation, usedIndices = []) {
  if (!Array.isArray(rotation) || !rotation.length) return null;
  const used = new Set(usedIndices);
  for (let i = 0; i < rotation.length; i++) {
    const entry = rotation[i];
    const idx = entry && typeof entry === 'object' && entry.idx != null ? entry.idx : i;
    if (!used.has(idx)) return { index: idx, entry };
  }
  return null;
}
