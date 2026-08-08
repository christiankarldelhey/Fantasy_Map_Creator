// ============================================================================
// Road notes: what the traveller treads on, and for how far
// ----------------------------------------------------------------------------
// `road` and `trail` accept region-specific phrasing; royal roads and open
// country are described the same everywhere.
// ============================================================================

import { pickPhraseForRegions } from '../data/terrainPhrases.js';
import { regionNamesOf } from './text.js';

export const ROAD_PHRASES = {
  road_major: 'well-kept royal roads',
  road: 'made roads',
  trail: 'rough trails and paths',
  off_road: 'open country, cross-country',
};

// Only these road types have regional variants worth looking up.
const REGIONAL_ROAD_TYPES = new Set(['road', 'trail']);

/**
 * Bullet-ready road notes, e.g. "- road: made roads (12.5 km)".
 * @param {Object} roadTypes - { road_major, road, trail, off_road } in km
 * @param {Array} [regions]
 * @param {Object} [terrainPhrases]
 * @param {() => number} [rng]
 * @returns {string[]}
 */
export function collectRoadNotes(roadTypes, regions = [], terrainPhrases = {}, rng = Math.random) {
  const regionNames = regionNamesOf(regions);

  return Object.entries(roadTypes || {})
    .filter(([, km]) => km > 0)
    .map(([type, km]) => {
      const regional = REGIONAL_ROAD_TYPES.has(type)
        ? pickPhraseForRegions(terrainPhrases, regionNames, type, rng)
        : null;
      const phrase = regional || ROAD_PHRASES[type] || type;
      return `- ${type}: ${phrase} (${km.toFixed(1)} km)`;
    });
}
