// ============================================================================
// Terrain notes: biomes and altitude layers crossed
// ----------------------------------------------------------------------------
// Restored to Node as part of the world-voice migration (issue #52): the
// mind-engine Python twin was removed in #54 — this module is the only copy.
// ============================================================================

import { timeOfDayPhrase } from './dayPhases.js';
import { pickPhraseForRegions } from './terrainPhrases.js';
import { regionNamesOf } from './text.js';

const BIOME_PHRASES = {
  forest: 'woodland',
  marsh: 'marshes and wet ground',
  desert: 'barren, arid waste',
  plain: 'open grasslands',
};

const ALTITUDE_PHRASES = {
  hills: 'rolling hills',
  mountains_low: 'the lower mountain slopes',
  mountains_med: 'high mountain country',
  mountains_high: 'the high peaks',
};

// A biome patch below this area is described as "small".
const SMALL_PATCH_KM2 = 10;

/** Regional phrase for a terrain key, falling back to the generic one. */
function terrainPhrase(terrainPhrasesMap, regionNames, key, fallbacks, rng) {
  return (
    pickPhraseForRegions(terrainPhrasesMap, regionNames, key, rng)
    || fallbacks[key]
    || key
  );
}

/** Normalise a biome entry (string or object) into the fields the note needs. */
function biomeFacts(biome) {
  if (typeof biome === 'string') {
    return { type: biome, totalAreaKm2: null, hourFloat: null };
  }
  return {
    type: biome.type,
    totalAreaKm2: biome.total_area_km2,
    hourFloat: biome.hour_float,
  };
}

/** Bullet-ready terrain notes, e.g. "- forest (in the mid-morning): woodland". */
export function collectTerrainNotes(
  biomes, altitude, regions = [], terrainPhrasesMap = {}, rng = Math.random,
) {
  const regionNames = regionNamesOf(regions);
  const notes = [];

  for (const biome of (biomes || []).filter(Boolean)) {
    const { type, totalAreaKm2, hourFloat } = biomeFacts(biome);
    const prefix = totalAreaKm2 != null && totalAreaKm2 < SMALL_PATCH_KM2 ? 'small ' : '';
    const when = hourFloat != null ? ` (${timeOfDayPhrase(hourFloat)})` : '';
    const phrase = terrainPhrase(terrainPhrasesMap, regionNames, type, BIOME_PHRASES, rng);
    notes.push(`- ${prefix}${type}${when}: ${phrase}`);
  }

  for (const layer of (altitude || []).filter(Boolean)) {
    const phrase = terrainPhrase(terrainPhrasesMap, regionNames, layer, ALTITUDE_PHRASES, rng);
    notes.push(`- ${layer}: ${phrase}`);
  }

  if (notes.length === 0) {
    const phrase = terrainPhrase(terrainPhrasesMap, regionNames, 'plain', BIOME_PHRASES, rng);
    notes.push(`- plain: ${phrase}`);
  }

  return notes;
}
