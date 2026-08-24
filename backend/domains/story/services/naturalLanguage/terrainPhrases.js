// ============================================================================
// Terrain phrases service
// ----------------------------------------------------------------------------
// Loads region-specific narrative phrases for terrain/road categories from the
// region_biome_descriptions table. Falls back to null when no phrase exists,
// letting callers keep their default descriptions.
//
// NOTE: the pure lookup helpers that used to live here (pickPhrase,
// pickPhraseForRegions) moved to the story-engine Python port
// (story-engine/app/natural_language/terrain_phrases.py), since prompt
// assembly now happens there. This file keeps only the DB read, which the
// Game domain still needs during day generation (domains/game/services/world/
// tripDay.js, via domains/game/adapters/storyClient.js).
// ============================================================================

import pool from '../../../../db.js';

/**
 * Build a lookup map of region-specific phrases.
 * @param {string[]} regionNames
 * @param {string[]} [categories]
 * @returns {Promise<Object>} { regionName: { category: [phrase, ...] } }
 */
export async function loadTerrainPhrases(regionNames, categories = []) {
  if (!Array.isArray(regionNames) || regionNames.length === 0) {
    return {};
  }

  const categoryFilter =
    Array.isArray(categories) && categories.length > 0
      ? 'AND category = ANY($2::text[])'
      : '';
  const params = categories.length > 0 ? [regionNames, categories] : [regionNames];

  try {
    const { rows } = await pool.query(
      `SELECT region_name, category, phrases
       FROM region_biome_descriptions
       WHERE region_name = ANY($1::text[])
       ${categoryFilter}`,
      params
    );

    const map = {};
    for (const row of rows) {
      if (!map[row.region_name]) {
        map[row.region_name] = {};
      }
      map[row.region_name][row.category] = row.phrases || [];
    }
    return map;
  } catch (err) {
    // If the table does not exist (or any other DB error), return an empty map
    // so the day can still be generated using fallback descriptions.
    if (err.code === '42P01') {
      console.warn('⚠️ region_biome_descriptions table not found; using fallback terrain descriptions.');
    } else {
      console.warn('⚠️ Could not load terrain phrases:', err.message);
    }
    return {};
  }
}
