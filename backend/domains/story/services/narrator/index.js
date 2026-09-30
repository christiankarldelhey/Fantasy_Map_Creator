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
//   tripHistory.js        yesterday's summary, recent forms
//   travellerBlocks.js    raw traveller state (condition / equipage / fate)
//   narrateDay.js         prompt assembly + LLM call
// ============================================================================

export { loadRecentEncounterForms } from './tripHistory.js';
export { collectTravellerState, notableItemsOf } from './travellerBlocks.js';
export { narrateDay } from './narrateDay.js';
export { closeEpisode, resetBrain } from '../mind/mindClient.js';
