// ============================================================================
// Game adapter
// ----------------------------------------------------------------------------
// Story's only door into the Game domain. Nothing outside this file should
// import from `domains/game/services/*` directly. Today these are plain
// function re-exports (same process, single DB).
//
// Only DATA crosses this seam: the persisted log notes and the walking-day
// constant. Every data→language translation lives in the story-engine's NL
// pack (C10) — the old buildConditionBlock/buildEquipmentBlock/
// buildEndStateBlock renderers moved there as raw-state-driven sections.
// ============================================================================

export {
  recentNotes,
} from '../../game/services/character/characterState.js';
export { WALK_END_HOUR } from '../../game/services/world/tripDay.js';
