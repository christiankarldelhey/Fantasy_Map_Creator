// ============================================================================
// Places Interactions resolver
// ----------------------------------------------------------------------------
// Resolves the single best place/region interaction record (currently only
// 'overnight') by reading the region's cultural_family from the database and
// matching against the priority scopes defined in places_interactions.
//
// No cultural family is ever hard-coded here; it is always fetched from
// regions.cultural_family for the supplied region_id.
// ============================================================================

import pool from '../db.js';

const CACHE = new Map();

export function clearPlacesInteractionsCache() {
  CACHE.clear();
}

async function loadInteractions(interactionType) {
  if (CACHE.has(interactionType)) return CACHE.get(interactionType);

  const { rows } = await pool.query(
    `SELECT id, interaction_type, location_id, location_type, region_id,
            cultural_family, title, description, rest_quality, shadow_effect, priority
     FROM places_interactions
     WHERE interaction_type = $1`,
    [interactionType]
  );

  CACHE.set(interactionType, rows);
  return rows;
}

async function fetchCulturalFamily(regionId) {
  const { rows } = await pool.query(
    'SELECT id, name, cultural_family FROM regions WHERE id = $1',
    [regionId]
  );
  return rows[0] || null;
}

export async function resolveRegionAtPoint(lng, lat) {
  const { rows } = await pool.query(
    `SELECT id, name, cultural_family
     FROM regions
     WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))
     LIMIT 1`,
    [lng, lat]
  );
  return rows[0] || null;
}

const FALLBACK = {
  id: null,
  title: null,
  description: 'No specific resting place presents itself. The night is spent under open sky, with whatever shelter the land and the weather allow.',
  rest_quality: 1,
  shadow_effect: 0,
  priority: -1,
  scope: 'hardcoded_fallback',
};

/**
 * Resolve the best overnight interaction record.
 *
 * @param {Object} params
 * @param {'IN_LOCATION'|'IN_WILD'} params.context
 * @param {number|null} params.locationId
 * @param {string|null} params.locationType
 * @param {number} params.regionId
 * @returns {Promise<Object>}
 */
export async function resolveOvernight({ context, locationId, locationType, regionId }) {
  if (!regionId) {
    console.warn('[PLACES_INTERACTIONS] No region_id provided; returning fallback');
    return { ...FALLBACK };
  }

  const region = await fetchCulturalFamily(regionId);
  if (!region) {
    console.warn(`[PLACES_INTERACTIONS] Region ${regionId} not found; returning fallback`);
    return { ...FALLBACK };
  }

  const family = region.cultural_family || null;
  const rows = await loadInteractions('overnight');

  let candidates = [];

  if (context === 'IN_LOCATION') {
    candidates = rows.filter((r) => {
      // L1: named location
      if (r.location_id != null && r.location_id === locationId) return true;
      if (r.location_type == null || r.location_type !== locationType) return false;
      // L2: type + unique region
      if (r.region_id != null && r.region_id === regionId) return true;
      // L3: type + family
      if (r.cultural_family != null && r.cultural_family === family) return true;
      // L0: generic type
      if (r.region_id == null && r.cultural_family == null) return true;
      return false;
    });
  } else if (context === 'IN_WILD') {
    candidates = rows.filter((r) =>
      r.location_id == null &&
      r.location_type == null &&
      ((r.region_id != null && r.region_id === regionId) ||
       (r.cultural_family != null && r.cultural_family === family))
    );
  }

  candidates.sort((a, b) => b.priority - a.priority);
  let chosen = candidates[0] || null;
  let scope = chosen ? detectScope(chosen) : null;

  if (!chosen && context === 'IN_WILD') {
    chosen = rows.find((r) =>
      r.location_id == null &&
      r.location_type == null &&
      r.cultural_family === 'wild'
    ) || null;
    if (chosen) scope = 'family_wild';
  }

  if (!chosen && context === 'IN_LOCATION' && locationType) {
    chosen = rows.find((r) =>
      r.location_type === locationType &&
      r.region_id == null &&
      r.cultural_family == null
    ) || null;
    if (chosen) scope = 'generic_type';
  }

  if (!chosen) {
    console.warn(
      `[PLACES_INTERACTIONS] No match for context=${context} ` +
      `locationId=${locationId} locationType=${locationType} regionId=${regionId} family=${family}`
    );
    return { ...FALLBACK };
  }

  return {
    id: chosen.id,
    interaction_type: chosen.interaction_type,
    title: chosen.title,
    description: chosen.description,
    rest_quality: chosen.rest_quality,
    shadow_effect: chosen.shadow_effect,
    priority: chosen.priority,
    scope,
    region: { id: region.id, name: region.name, cultural_family: family },
  };
}

function detectScope(row) {
  if (row.location_id != null) return 'location';
  if (row.location_type != null && row.region_id != null) return 'type_region';
  if (row.location_type != null && row.cultural_family != null) return 'type_family';
  if (row.location_type != null && row.region_id == null && row.cultural_family == null) return 'generic_type';
  if (row.location_type == null && row.region_id != null) return 'region';
  if (row.location_type == null && row.cultural_family != null) return 'family';
  return 'unknown';
}
