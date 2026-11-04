// ============================================================================
// Road notes: what the traveller treads on, and for how far
// ----------------------------------------------------------------------------
// Restored to Node as part of the world-voice migration (issue #52): the
// story-engine Python copy is app/natural_language/road_notes.py.
// ============================================================================

import { pickPhraseForRegions } from './terrainPhrases.js';
import { regionNamesOf } from './text.js';

const ROAD_PHRASES = {
  road_major: 'well-kept royal roads',
  road: 'made roads',
  trail: 'rough trails and paths',
  off_road: 'open country, cross-country',
};

// Only these road types have regional variants worth looking up.
const REGIONAL_ROAD_TYPES = new Set(['road', 'trail']);

/** Bullet-ready road notes, e.g. "- road: made roads (12.5 km)". */
export function collectRoadNotes(roadTypes, regions = [], terrainPhrasesMap = {}, rng = Math.random) {
  const regionNames = regionNamesOf(regions);

  const notes = [];
  for (const [type, km] of Object.entries(roadTypes || {})) {
    if (!km || km <= 0) continue;
    const regional = REGIONAL_ROAD_TYPES.has(type)
      ? pickPhraseForRegions(terrainPhrasesMap, regionNames, type, rng)
      : null;
    const phrase = regional || ROAD_PHRASES[type] || type;
    notes.push(`- ${type}: ${phrase} (${km.toFixed(1)} km)`);
  }
  return notes;
}
