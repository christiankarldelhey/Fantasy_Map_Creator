// ============================================================================
// Story Engine adapter
// ----------------------------------------------------------------------------
// Game's only door into the Story domain. Nothing outside this file should
// import from `domains/story/services/*` directly. Today these are plain
// function re-exports (same process, still Node); once Story Engine is
// extracted (its own service, or the future Python rewrite per
// docs/story-engine-prd.md), only this file needs to change to an HTTP call
// following the same request/response shape (narrative + proposed_commands).
// ============================================================================

export { SYSTEM_PROMPT } from '../../story/services/prompt/index.js';
export {
  buildTravellerBlocks,
  loadNarratorCharacter,
  loadRecentEncounterForms,
  narrateDay,
  notableItemsOf,
} from '../../story/services/narrator/index.js';
export { loadTerrainPhrases } from '../../story/services/naturalLanguage/terrainPhrases.js';
