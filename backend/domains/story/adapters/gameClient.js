// ============================================================================
// Game adapter
// ----------------------------------------------------------------------------
// Story's only door into the Game domain. Nothing outside this file should
// import from `domains/game/services/*` directly. Today these are plain
// function re-exports (same process, single DB).
//
// NOTE (tracked in docs/story-engine-prd.md): buildConditionBlock,
// buildEndStateBlock and their underlying *_SENTENCE phrase tables are
// narrative content living inside Game's characterState.js today for
// historical reasons. They are flagged there as content that should migrate
// into Story's own phrase banks; this adapter is the seam that makes that
// future move a one-file change instead of a hunt through every caller.
// ============================================================================

export {
  buildConditionBlock,
  buildEndStateBlock,
  recentNotes,
} from '../../game/services/character/characterState.js';
export { buildEquipmentBlock } from '../../game/services/character/inventory.js';
export { WALK_END_HOUR } from '../../game/services/world/tripDay.js';
