// ============================================================================
// Narration orchestration
// ----------------------------------------------------------------------------
// The AI-facing layer: it reads what the trip already produced, turns the
// character's mechanical state into prompt blocks, assembles the prompt and
// calls the model. The routes only decide WHICH day to narrate; everything about
// HOW it is narrated lives here.
//
// Where things live:
//   narratorCharacter.js  the character fields the prompt needs
//   tripHistory.js        yesterday's summary, banned phrases, recent forms
//   travellerBlocks.js    condition / equipment / end-state prompt blocks
//   narrateDay.js         prompt assembly + LLM call
// ============================================================================

export { loadNarratorCharacter } from './narratorCharacter.js';
export {
  loadBannedPhrases,
  loadPreviousDaySummary,
  loadRecentEncounterForms,
} from './tripHistory.js';
export { buildTravellerBlocks, notableItemsOf } from './travellerBlocks.js';
export { narrateDay } from './narrateDay.js';
export * from './ai.js';
