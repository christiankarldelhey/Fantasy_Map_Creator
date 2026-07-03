// ============================================================================
// Terrain phrases service
// ----------------------------------------------------------------------------
// Loads region-specific narrative phrases for terrain/road categories from the
// region_biome_descriptions table. Falls back to null when no phrase exists,
// letting callers keep their default descriptions.
// ============================================================================

import pool from '../db.js';

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
}

/**
 * Pick a random phrase for a region/category combination.
 * @param {Object} phrasesMap - output of loadTerrainPhrases
 * @param {string} regionName
 * @param {string} category
 * @param {() => number} [rng] - optional RNG, defaults to Math.random
 * @returns {string|null}
 */
export function pickPhrase(phrasesMap, regionName, category, rng = Math.random) {
  const phrases = phrasesMap?.[regionName]?.[category];
  if (!Array.isArray(phrases) || phrases.length === 0) return null;
  return phrases[Math.floor(rng() * phrases.length)];
}

/**
 * Pick a phrase from the first region in the list that has one for the category.
 * Useful when the day spans multiple regions but we want a regional flavour.
 * @param {Object} phrasesMap
 * @param {string[]} regionNames
 * @param {string} category
 * @param {() => number} [rng]
 * @returns {string|null}
 */
export function pickPhraseForRegions(phrasesMap, regionNames, category, rng = Math.random) {
  if (!Array.isArray(regionNames)) return null;
  for (const name of regionNames) {
    const phrase = pickPhrase(phrasesMap, name, category, rng);
    if (phrase) return phrase;
  }
  return null;
}
