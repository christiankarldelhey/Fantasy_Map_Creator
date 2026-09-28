// ============================================================================
// Mind Engine client — open / narrate / close
// ----------------------------------------------------------------------------
// Thin HTTP wrapper over Story Engine's episode lifecycle. Every call has
// an explicit timeout and throws on failure — narrateDay catches and falls
// back to /narrate-day. The mind never blocks the game.
// ============================================================================

const STORY_ENGINE_URL = process.env.STORY_ENGINE_URL || 'http://localhost:8001';

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
 * Open (idempotent) or resume an episode. Returns {episode_id, psyche_packet}.
 */
export function openEpisode({
  gameId,
  character,
  episodeRef,
  events,
  narratorPayload,
}) {
  return post('/episodes', {
    game_id: gameId,
    character,
    episode_ref: episodeRef,
    events,
    narrator_payload: narratorPayload,
  }, OPEN_TIMEOUT_MS);
}

/**
 * Narrate an opened episode. Returns NarrateDayResponse + mind context.
 */
export function narrateEpisode(episodeId, language) {
  return post(`/episodes/${episodeId}/narrate`, { language }, NARRATE_TIMEOUT_MS);
}

/**
 * Report what the host actually persisted; consolidates memory. Callers use
 * this fire-and-forget — a failed close must never break the game request.
 */
export function closeEpisode(episodeId, outcome) {
  return post(`/episodes/${episodeId}/close`, { outcome }, CLOSE_TIMEOUT_MS);
}
