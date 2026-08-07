// ============================================================================
// Narrate a day
// ----------------------------------------------------------------------------
// The single entry point for turning a resolved day into prose: it gathers the
// trip's own history (continuity + anti-repetition), assembles the prompt and
// calls the LLM. Both POST /trips/:id/days and POST .../redo-narration go
// through here, so a re-narration is built exactly like the original.
// ============================================================================

import { generateNarrative } from '../ai.js';
import { buildDayPrompt } from '../prompt/index.js';
import { loadBannedPhrases, loadPreviousDaySummary } from './tripHistory.js';

/**
 * Build the prompt for a day and generate its narrative.
 * @param {Object} params
 * @param {Object} params.day - resolved day (from generateDay or rehydrated)
 * @param {Object} params.trip
 * @param {Object} params.character
 * @param {string} [params.language]
 * @param {string} [params.conditionBlock]
 * @param {string} [params.equipmentBlock]
 * @param {string} [params.endStateBlock]
 * @returns {Promise<{prompt: {system:string,user:string}, generation: Object}>}
 */
export async function narrateDay({
  day,
  trip,
  character,
  language = 'english',
  conditionBlock = '',
  equipmentBlock = '',
  endStateBlock = '',
}) {
  const [previousDaySummary, bannedPhrases] = await Promise.all([
    loadPreviousDaySummary(trip.id, day.day_number),
    loadBannedPhrases(trip.id, day.day_number),
  ]);

  const prompt = buildDayPrompt({
    day,
    trip,
    character,
    language,
    previousDaySummary,
    conditionBlock,
    equipmentBlock,
    endStateBlock,
    bannedPhrases,
  });

  const generation = await generateNarrative(prompt, { dayNumber: day.day_number });

  return { prompt, generation };
}
