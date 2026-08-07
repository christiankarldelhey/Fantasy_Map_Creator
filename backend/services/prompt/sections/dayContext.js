// ============================================================================
// Day-level land context
// ----------------------------------------------------------------------------
// The facts that have no per-phase timing and therefore belong to the day as a
// whole: the lands crossed in order, what the road was made of, and the total
// climbing effort.
// ============================================================================

import {
  collectRoadNotes,
  describeElevation,
  describeRegions,
} from '../../naturalLanguage/index.js';

/**
 * Build the day-level land context block.
 * @param {Object} params
 * @param {Array} params.regions
 * @param {Object} params.roadTypes
 * @param {Object} params.terrainPhrases
 * @param {Object|null} params.elevationProfile
 * @param {() => number} params.rng
 * @returns {string}
 */
export function dayContextSection({
  regions = [],
  roadTypes = {},
  terrainPhrases = {},
  elevationProfile = null,
  rng = Math.random,
}) {
  const parts = [`Lands crossed (in order), with their character:\n${describeRegions(regions)}`];

  const roadNotes = collectRoadNotes(roadTypes, regions, terrainPhrases, rng);
  if (roadNotes.length) {
    parts.push(`Road notes (reference only — render, don't quote):\n${roadNotes.join('\n')}`);
  }

  const elevationNote = describeElevation(elevationProfile, rng);
  if (elevationNote) {
    parts.push(`Terrain effort (across the whole day):\n${elevationNote}`);
  }

  return parts.join('\n\n');
}
