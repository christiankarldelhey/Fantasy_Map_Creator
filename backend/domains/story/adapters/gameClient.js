// ============================================================================
// Game adapter
// ----------------------------------------------------------------------------
// Story's only door into the Game domain. Nothing outside this file should
// import from `domains/game/services/*` directly. Today these are plain
// function re-exports (same process, single DB).
//
// Only DATA crosses this seam: the persisted log notes and the walking-day
// constant. The data→language translation lives here in the story domain
// (naturalLanguage/stateBlocks.js) and reaches the mind-engine as
// world_notes prose — the engine never sees raw state blocks.
// ============================================================================

export {
  recentNotes,
} from '../../game/services/character/characterState.js';
export {
  loadPreviousDayRow,
  loadRecentEncounterRows,
  loadRecentDayClimates,
} from '../../game/services/world/tripHistoryReads.js';
