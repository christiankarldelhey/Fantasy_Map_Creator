// ============================================================================
// Mind Engine client — open / narrate / close
// ----------------------------------------------------------------------------
// Thin HTTP wrapper over the Mind Engine's episode lifecycle. Every call
// has an explicit timeout and throws on failure — narrateDay catches and
// falls back to /narrate-day. The mind never blocks the game.
// ============================================================================

const MIND_ENGINE_URL = process.env.MIND_ENGINE_URL || 'http://localhost:8001';
const GAME_ID = process.env.GAME_ID || 'middle_earth';

// Open includes the Lens director's LLM pick (capped at 6s server-side).
const OPEN_TIMEOUT_MS = 20000;
const NARRATE_TIMEOUT_MS = 90000; // wraps a real LLM call
const CLOSE_TIMEOUT_MS = 5000;
const DECIDE_TIMEOUT_MS = 5000;

async function post(path, body, timeoutMs) {
  const response = await fetch(`${MIND_ENGINE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`mind-engine ${path} failed (${response.status}): ${text}`);
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
 * The pre-episode choosing (ADR-0019): hand the Mind each resolved
 * Situation's feasible Interactions, get one interaction_id per situation
 * back. Runs before open so outcomes land in the day itself — no
 * re-resolution. The caller catches failures; the mind never blocks the game.
 */
export function choose(characterId, { choices }) {
  return post(
    `/mind/minds/${characterId}/choose`,
    { game_id: GAME_ID, choices },
    DECIDE_TIMEOUT_MS
  );
}

/**
 * Mid-day digestion (Wave C): hand the Mind resolved outcome events as
 * each Situation lands so the NEXT /choose reads the evolved state.
 * Events carry stable ids — episode open annotates them without
 * re-feeding. `character` is the host's projected Condition.
 */
export function perceive(characterId, { events, character = null }) {
  return post(
    `/mind/minds/${characterId}/perceive`,
    { game_id: GAME_ID, events, character },
    DECIDE_TIMEOUT_MS
  );
}

/**
 * Record the host's pick for a pending decision (B5). Returns the
 * episode state including `proposed_commands` — the host validates and
 * applies them; the mind never executes mechanics.
 */
export function decideEpisode(episodeId, { optionId, decisionId = null }) {
  return post(
    `/episodes/${episodeId}/decide`,
    { option_id: optionId, decision_id: decisionId },
    DECIDE_TIMEOUT_MS
  );
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
 * memories, learned beliefs, needs, episodes — and re-seeds the preset's
 * starter beliefs. Returns {request, response}; a failed reset must
 * never block the game request (catch upstream).
 */
export async function resetMind(characterId, gameId = GAME_ID) {
  const request = { game_id: gameId };
  const response = await post(
    `/mind/minds/${characterId}/reset`, request, CLOSE_TIMEOUT_MS
  );
  return { request, response };
}
