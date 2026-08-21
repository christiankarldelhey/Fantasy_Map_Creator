// ============================================================================
// Map adapter
// ----------------------------------------------------------------------------
// Game's only door into the Map domain. Nothing outside this file should
// import from `domains/map/services/*` directly. Today these are plain
// function re-exports (same process); if Map is ever split into its own
// deployed service, only this file needs to change (e.g. to fetch() calls).
// ============================================================================

export { computeRoute } from '../../map/services/world/routing.js';
export { climateStats, innerClimate } from '../../map/services/data/climateData.js';
export { getMoonPhase } from '../../map/services/data/moonPhase.js';
export {
  flattenRoute,
  totalSeconds,
  positionAtSeconds,
  sliceLeg,
} from '../../map/services/world/tripGeometry.js';
