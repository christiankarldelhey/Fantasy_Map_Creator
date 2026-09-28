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
import { openEpisode, narrateEpisode } from '../mind/mindClient.js';
import { toEvents } from '../mind/toEvents.js';

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
 * @param {string} [params.conditionBlock]
 * @param {string} [params.equipmentBlock]
 * @param {string} [params.endStateBlock]
 * @param {Object} [params.stateContext] - {startState, endState} for the
 *        mind's `body` event; ignored unless MIND_ENGINE is on.
 * @returns {Promise<{prompt: {system:string,user:string}, generation: Object, mind_episode_id?: string, psyche_packet?: Object}>}
 */
export async function narrateDay({
  day,
  trip,
  character,
  language = 'english',
  conditionBlock = '',
  equipmentBlock = '',
  endStateBlock = '',
  stateContext = null,
}) {
  const [previousDaySummary, bannedPhrases, recentDayClimates, previousOpenings] = await Promise.all([
    loadPreviousDaySummary(trip.id, day.day_number),
    loadBannedPhrases(trip.id, day.day_number),
    loadRecentDayClimates(trip.id, day.day_number),
    loadPreviousOpenings(trip.id, day.day_number),
  ]);

  // The narrator_payload is the opaque blob Story Engine replays at narrate
  // time — exactly the same fields the stateless endpoint takes today.
  const narratorPayload = {
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
  };

  if (MIND_ENGINE) {
    try {
      const characterRef = {
        id: String(character.id || trip.character_id),
        name: character.name,
        brain_profile: character.brain_profile || character.slug || null,
        // Snapshot the mind's gates & rolls need (B1): skills gate the
        // attempt; energy/shadow/conditions bend the roll.
        skills: {
          tracking: character.skill_tracking ?? 0,
          persuasion: character.skill_persuasion ?? 0,
          ranged: character.skill_ranged ?? 0,
          melee: character.skill_melee ?? 0,
          lore: character.skill_lore ?? 0,
        },
        energy: character.energy ?? null,
        shadow: character.shadow ?? null,
        conditions: [
          character.wounded && character.wounded !== 'none' ? 'wounded' : null,
          character.sick ? 'sick' : null,
        ].filter(Boolean),
      };
      const opened = await openEpisode({
        gameId: GAME_ID,
        character: characterRef,
        episodeRef: `trip:${trip.id}:day:${day.day_number}`,
        events: toEvents({ day, trip, character, stateContext }),
        narratorPayload,
      });
      const narrated = await narrateEpisode(opened.episode_id, language);
      // Same response shape as /narrate-day, plus the episode handle so the
      // caller can close() after it persists the day's outcome.
      return {
        prompt: narrated.prompt,
        generation: narrated.generation,
        mind_episode_id: opened.episode_id,
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
