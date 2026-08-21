// ============================================================================
// Map adapter
// ----------------------------------------------------------------------------
// Story's only door into the Map domain. Nothing outside this file should
// import from `domains/map/services/*` directly. Today these are plain
// function re-exports (same process); if Map is ever split into its own
// deployed service, only this file needs to change.
// ============================================================================

export { getMoonPhase } from '../../map/services/data/moonPhase.js';
export {
  innerClimate,
  climateRecords,
  timedClimateRecords,
  meanOf,
  sumOf,
} from '../../map/services/data/climateData.js';
