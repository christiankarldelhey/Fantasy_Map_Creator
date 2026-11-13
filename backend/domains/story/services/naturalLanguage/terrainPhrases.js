// ============================================================================
// Terrain phrases service
// ----------------------------------------------------------------------------
// Loads region-specific narrative phrases for terrain/road categories from the
// region_biome_descriptions table. Falls back to null when no phrase exists,
// letting callers keep their default descriptions.
//
// NOTE: the pure lookup helpers (pickPhrase, pickPhraseForRegions) are back
// at home in this file — the world-voice migration (#52) moved phrasing out
// of the mind-engine, so their Python copy
// (mind-engine/app/natural_language/terrain_phrases.py) was removed in #54.
// The DB read stays because the Game domain calls it during day generation
// (domains/game/services/world/tripDay.js, via
// domains/game/adapters/storyClient.js).
// ============================================================================

import pool from '../../../../db.js';

/**
 * Pick a random phrase for a region/category combination.
 * @param {Object} phrasesMap { regionName: { category: [phrase, ...] } }
 * @param {string} regionName
 * @param {string} category
 * @param {() => number} [rng]
 * @returns {string|null}
 */
export function pickPhrase(phrasesMap, regionName, category, rng = Math.random) {
  const phrases = phrasesMap?.[regionName]?.[category];
  if (!Array.isArray(phrases) || phrases.length === 0) {
    return null;
  }
  return phrases[Math.floor(rng() * phrases.length)];
}

/**
 * Pick a phrase from the first region in the list that has one for the category.
 * @param {Object} phrasesMap
 * @param {string[]} regionNames
 * @param {string} category
 * @param {() => number} [rng]
 * @returns {string|null}
 */
export function pickPhraseForRegions(phrasesMap, regionNames, category, rng = Math.random) {
  if (!Array.isArray(regionNames)) {
    return null;
  }
  for (const name of regionNames) {
    const phrase = pickPhrase(phrasesMap, name, category, rng);
    if (phrase) {
      return phrase;
    }
  }
  return null;
}

/**
 * Build a lookup map of region-specific phrases.
 * @param {string[]} regionNames
 * @param {string[]} [categories]
 * @param {string[]} [variantOrder] ordered variant keys (see
 *   seasonalVariants.variantOrderForDay); defaults to ['base']. For each
 *   region/category cell the first variant with seeded phrases wins.
 * @returns {Promise<Object>} { regionName: { category: [phrase, ...] } }
 */
export async function loadTerrainPhrases(regionNames, categories = [], variantOrder = ['base']) {
  if (!Array.isArray(regionNames) || regionNames.length === 0) {
    return {};
  }

  // ADR-0014 (#102): scope-bound kind='depiction' records are canonical;
  // region_biome_descriptions stays as fallback until it drops in #104.
  try {
    const narration = await loadTerrainPhrasesFromNarration(regionNames, categories, variantOrder);
    if (Object.keys(narration).length > 0) {
      return narration;
    }
  } catch (err) {
    console.warn('⚠️ Could not load terrain phrases from places_narration:', err.message);
  }

  const categoryFilter =
    Array.isArray(categories) && categories.length > 0
      ? 'AND category = ANY($2::text[])'
      : '';
  const params = categories.length > 0 ? [regionNames, categories] : [regionNames];

  // variant-aware query; pre-migration databases lack the column, so the
  // fallback below retries without it and every row counts as 'base'.
  let rows;
  try {
    ({ rows } = await pool.query(
      `SELECT region_name, category, variant, phrases
       FROM region_biome_descriptions
       WHERE region_name = ANY($1::text[])
       ${categoryFilter}`,
      params
    ));
  } catch (err) {
    if (err.code === '42P01') {
      console.warn('⚠️ region_biome_descriptions table not found; using fallback terrain descriptions.');
      return {};
    }
    if (err.code !== '42703') {
      console.warn('⚠️ Could not load terrain phrases:', err.message);
      return {};
    }
    try {
      ({ rows } = await pool.query(
        `SELECT region_name, category, 'base' AS variant, phrases
         FROM region_biome_descriptions
         WHERE region_name = ANY($1::text[])
         ${categoryFilter}`,
        params
      ));
    } catch (err2) {
      console.warn('⚠️ Could not load terrain phrases:', err2.message);
      return {};
    }
  }

  const order = [...(variantOrder || []), 'base'];
  const byCell = {};
  for (const row of rows) {
    const variants = ((byCell[row.region_name] ||= {})[row.category] ||= {});
    variants[row.variant || 'base'] = row.phrases || [];
  }

  const map = {};
  for (const [region, cellCategories] of Object.entries(byCell)) {
    for (const [category, variants] of Object.entries(cellCategories)) {
      for (const variant of order) {
        const phrases = variants[variant];
        if (Array.isArray(phrases) && phrases.length > 0) {
          (map[region] ||= {})[category] = phrases;
          break;
        }
      }
    }
  }
  return map;
}

/**
 * Narration path for loadTerrainPhrases: reads scope-bound kind='depiction'
 * records (backfilled from region_biome_descriptions) and picks the first
 * non-empty variant per region/category cell — same map shape as the
 * legacy path. Returns {} when no records exist yet (pre-backfill DBs).
 */
async function loadTerrainPhrasesFromNarration(regionNames, categories, variantOrder) {
  const categoryFilter =
    Array.isArray(categories) && categories.length > 0
      ? 'AND p.type = ANY($2::text[])'
      : '';
  const params = categories.length > 0 ? [regionNames, categories] : [regionNames];

  const { rows } = await pool.query(
    `SELECT p.payload->>'region_name' AS region_name,
            p.type AS category,
            p.variants AS variants
       FROM places_narration p
      WHERE p.kind = 'depiction'
        AND p.payload->>'origin' = 'backfill:region_biome_descriptions'
        AND p.payload->>'region_name' = ANY($1::text[])
        ${categoryFilter}`,
    params
  );

  const order = [...(variantOrder || []), 'base'];
  const map = {};
  for (const row of rows) {
    // variants column: [{key, phrases}] (#106)
    for (const variant of order) {
      const hit = (row.variants || []).find((v) => v && v.key === variant);
      if (Array.isArray(hit?.phrases) && hit.phrases.length > 0) {
        (map[row.region_name] ||= {})[row.category] = hit.phrases;
        break;
      }
    }
  }
  return map;
}
