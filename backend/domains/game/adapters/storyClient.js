// ============================================================================
// Mind Engine adapter
// ----------------------------------------------------------------------------
// Game's only door into the Story domain. Nothing outside this file should
// import from `domains/story/services/*` directly. Today these are plain
// function re-exports (same process, still Node); once Mind Engine is
// extracted (its own service, or the future Python rewrite per
// docs/mind-engine-prd.md), only this file needs to change to an HTTP call
// following the same request/response shape (narrative + proposed_commands).
// ============================================================================

export {
  collectTravellerState,
  closeEpisode,
  loadRecentEncounterForms,
  narrateDay,
  notableItemsOf,
  resetMind,
} from '../../story/services/narrator/index.js';
export { loadTerrainPhrases } from '../../story/services/naturalLanguage/terrainPhrases.js';
export {
  variantOrderForDay,
  pickSeasonalSummary,
  loadSeasonalSummaries,
} from '../../story/services/naturalLanguage/seasonalVariants.js';
