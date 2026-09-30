// ============================================================================
// Mind Engine client — open / narrate / close
// ----------------------------------------------------------------------------
// Thin HTTP wrapper over Story Engine's episode lifecycle. Every call has
// an explicit timeout and throws on failure — narrateDay catches and falls
// back to /narrate-day. The mind never blocks the game.
// ============================================================================

const STORY_ENGINE_URL = process.env.STORY_ENGINE_URL || 'http://localhost:8001';
const GAME_ID = process.env.GAME_ID || 'middle_earth';

const OPEN_TIMEOUT_MS = 8000;
const NARRATE_TIMEOUT_MS = 90000; // wraps a real LLM call
const CLOSE_TIMEOUT_MS = 5000;

async function post(path, body, timeoutMs) {
  const response = await fetch(`${STORY_ENGINE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`story-engine ${path} failed (${response.status}): ${text}`);
  }
  return response.json();
}

/**
 * Open (idempotent) or resume an episode. `body` is the flat
 * OpenEpisodeRequest built by toOpenPayload — sent verbatim, no remapping.
 * Returns {request, response} — the exact wire body plus
 * {episode_id, psyche_packet} back.
 */
export async function openEpisode(body) {
  const response = await post('/episodes', body, OPEN_TIMEOUT_MS);
  return { request: body, response };
}

/**
 * Narrate an opened episode. Returns NarrateDayResponse + mind context.
 */
export function narrateEpisode(episodeId, language) {
  return post(`/episodes/${episodeId}/narrate`, { language }, NARRATE_TIMEOUT_MS);
}

/**
 * Report what the host actually persisted; consolidates memory. Returns
 * {request, response} — the outcome sent plus the consolidation summary
 * back. A failed close must never break the game request (catch upstream).
 */
export async function closeEpisode(episodeId, outcome) {
  const request = { outcome };
  const response = await post(
    `/episodes/${episodeId}/close`, request, CLOSE_TIMEOUT_MS
  );
  return { request, response };
}

/**
 * Full mind wipe (C19): deletes everything the character lived —
 * memories, learned beliefs, needs, episodes — and re-seeds the mold's
 * starter beliefs. Returns {request, response}; a failed reset must
 * never block the game request (catch upstream).
 */
export async function resetBrain(characterId, gameId = GAME_ID) {
  const request = { game_id: gameId };
  const response = await post(
    `/mind/brains/${characterId}/reset`, request, CLOSE_TIMEOUT_MS
  );
  return { request, response };
}
