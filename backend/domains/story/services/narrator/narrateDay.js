// ============================================================================
// Narrate a day
// ----------------------------------------------------------------------------
// The single entry point for turning a resolved day into prose. Node still
// owns the DB reads (the trip's own history: continuity + anti-repetition);
// prompt assembly and the LLM call itself now live in the story-engine
// Python service (backend/../story-engine), reached over HTTP. Both
// POST /trips/:id/days and POST .../redo-narration go through here, so a
// re-narration is built exactly like the original.
//
// See story-engine/README.md for the service this calls.
// ============================================================================

import { loadBannedPhrases, loadPreviousDaySummary, loadPreviousOpenings, loadRecentDayClimates } from './tripHistory.js';

const STORY_ENGINE_URL = process.env.STORY_ENGINE_URL || 'http://localhost:8001';

/**
 * Build the prompt for a day and generate its narrative via the story-engine service.
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
  const [previousDaySummary, bannedPhrases, recentDayClimates, previousOpenings] = await Promise.all([
    loadPreviousDaySummary(trip.id, day.day_number),
    loadBannedPhrases(trip.id, day.day_number),
    loadRecentDayClimates(trip.id, day.day_number),
    loadPreviousOpenings(trip.id, day.day_number),
  ]);

  const response = await fetch(`${STORY_ENGINE_URL}/narrate-day`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      day,
      trip,
      character,
      language,
      conditionBlock,
      equipmentBlock,
      endStateBlock,
      previousDaySummary,
      bannedPhrases,
      recentDayClimates,
      previousOpenings,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`story-engine /narrate-day failed (${response.status}): ${body}`);
  }

  return response.json();
}
