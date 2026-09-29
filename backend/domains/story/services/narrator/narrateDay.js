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

import { loadBannedPhrases, loadPreviousDay, loadPreviousOpenings, loadRecentDayClimates } from './tripHistory.js';
import { openEpisode, narrateEpisode } from '../mind/mindClient.js';
import { toOpenPayload, toNarrateDayBody } from '../mind/toOpenPayload.js';

const STORY_ENGINE_URL = process.env.STORY_ENGINE_URL || 'http://localhost:8001';
const GAME_ID = process.env.GAME_ID || 'middle_earth';
// Feature flag: 'on'/'true'/'1' routes narration through the Mind Engine
// (open -> narrate); anything else keeps the stateless /narrate-day call.
const MIND_ENGINE = ['on', 'true', '1'].includes(
  (process.env.MIND_ENGINE || '').toLowerCase()
);

/**
 * Build the prompt for a day and generate its narrative via the story-engine service.
 * @param {Object} params
 * @param {Object} params.day - resolved day (from generateDay or rehydrated)
 * @param {Object} params.trip
 * @param {Object} params.character
 * @param {string} [params.language]
 * @param {Object} [params.characterState] - raw energy/shadow/wounded/notes
 * @param {Object} [params.equipmentState] - raw supplies/gear state
 * @param {string} [params.fate] - resolved fate; non-'living' is terminal
 * @param {Object} [params.stateContext] - {startState, endState} for the
 *        mind's `body` event; ignored unless MIND_ENGINE is on.
 * @returns {Promise<{prompt: {system:string,user:string}, generation: Object, mind_episode_id?: string, psyche_packet?: Object}>}
 */
export async function narrateDay({
  day,
  trip,
  character,
  language = 'english',
  characterState = null,
  equipmentState = null,
  fate = null,
  stateContext = null,
}) {
  const [previousDay, bannedPhrases, recentDayClimates, previousOpenings] = await Promise.all([
    loadPreviousDay(trip.id, day.day_number),
    loadBannedPhrases(trip.id, day.day_number),
    loadRecentDayClimates(trip.id, day.day_number),
    loadPreviousOpenings(trip.id, day.day_number),
  ]);

  // The flat episode-open body — OpenEpisodeRequest shape (story-engine
  // mind/models.py). One whitelist owns the wire for both paths below.
  const openBody = toOpenPayload({
    gameId: GAME_ID,
    day,
    trip,
    character,
    language,
    characterState,
    equipmentState,
    fate,
    previousDay,
    bannedPhrases,
    recentDayClimates,
    previousOpenings,
    stateContext,
  });

  if (MIND_ENGINE) {
    try {
      const { request: openReq, response: opened } = await openEpisode(openBody);
      const narrated = await narrateEpisode(opened.episode_id, language);
      // Same response shape as /narrate-day, plus the episode handle so the
      // caller can close() after it persists the day's outcome.
      return {
        prompt: narrated.prompt,
        generation: narrated.generation,
        mind_episode_id: opened.episode_id,
        mind_open: { request: openReq, response: opened },
        psyche_packet: narrated.psyche_packet || opened.psyche_packet || null,
      };
    } catch (error) {
      // Invariant: the mind never blocks the game. Fall back to the
      // stateless narrator exactly as if the flag were off.
      console.warn('[mind] open/narrate failed, falling back to /narrate-day:', error.message);
    }
  }

  const response = await fetch(`${STORY_ENGINE_URL}/narrate-day`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toNarrateDayBody(openBody)),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`story-engine /narrate-day failed (${response.status}): ${body}`);
  }

  return response.json();
}
