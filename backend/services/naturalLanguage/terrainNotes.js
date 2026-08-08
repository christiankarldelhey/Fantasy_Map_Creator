// ============================================================================
// Terrain notes: biomes and altitude layers crossed
// ----------------------------------------------------------------------------
// Region-specific phrases (from the terrain_phrases table) always win; the
// generic fallbacks below only fire when a region has nothing written for that
// biome or altitude layer.
// ============================================================================

import { pickPhraseForRegions } from '../data/terrainPhrases.js';
import { timeOfDayPhrase } from './dayPhases.js';
import { regionNamesOf } from './text.js';

export const BIOME_PHRASES = {
  forest: 'woodland',
  marsh: 'marshes and wet ground',
  desert: 'barren, arid waste',
  plain: 'open grasslands',
};

export const ALTITUDE_PHRASES = {
  hills: 'rolling hills',
  mountains_low: 'the lower mountain slopes',
  mountains_med: 'high mountain country',
  mountains_high: 'the high peaks',
};

// A biome patch below this area is described as "small".
const SMALL_PATCH_KM2 = 10;

/** Regional phrase for a terrain key, falling back to the generic one. */
function terrainPhrase(terrainPhrases, regionNames, key, fallbacks, rng) {
  return pickPhraseForRegions(terrainPhrases, regionNames, key, rng)
    || fallbacks[key]
    || key;
}

/** Normalise a biome entry (string or object) into the fields the note needs. */
function biomeFacts(biome) {
  if (typeof biome === 'string') return { type: biome, totalAreaKm2: null, hourFloat: null };
  return {
    type: biome.type,
    totalAreaKm2: biome.total_area_km2 ?? null,
    hourFloat: biome.hour_float ?? null,
  };
}

/**
 * Bullet-ready terrain notes, e.g. "- forest (in the mid-morning): woodland".
 * @param {Array<string|Object>} biomes
 * @param {string[]} altitude
 * @param {Array} [regions]
 * @param {Object} [terrainPhrases]
 * @param {() => number} [rng]
 * @returns {string[]}
 */
export function collectTerrainNotes(biomes, altitude, regions = [], terrainPhrases = {}, rng = Math.random) {
  const regionNames = regionNamesOf(regions);
  const notes = [];

  for (const biome of (biomes || []).filter(Boolean)) {
    const { type, totalAreaKm2, hourFloat } = biomeFacts(biome);
    const prefix = totalAreaKm2 != null && totalAreaKm2 < SMALL_PATCH_KM2 ? 'small ' : '';
    const when = hourFloat != null ? ` (${timeOfDayPhrase(hourFloat)})` : '';
    const phrase = terrainPhrase(terrainPhrases, regionNames, type, BIOME_PHRASES, rng);
    notes.push(`- ${prefix}${type}${when}: ${phrase}`);
  }

  for (const layer of (altitude || []).filter(Boolean)) {
    const phrase = terrainPhrase(terrainPhrases, regionNames, layer, ALTITUDE_PHRASES, rng);
    notes.push(`- ${layer}: ${phrase}`);
  }

  if (notes.length === 0) {
    const phrase = terrainPhrase(terrainPhrases, regionNames, 'plain', BIOME_PHRASES, rng);
    notes.push(`- plain: ${phrase}`);
  }

  return notes;
}
