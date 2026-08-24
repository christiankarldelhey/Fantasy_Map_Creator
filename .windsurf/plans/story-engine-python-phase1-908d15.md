# Story Engine — Python: literal 1:1 port (no new features)

Port the existing Node narration pipeline (`backend/domains/story/services/*`) verbatim into a new standalone Python API, with zero behavior/contract redesign — the PRD's World Pack/rules-engine/decision-point vision is explicitly **not** part of this pass; the only goal is "same output, running in Python, called over HTTP."

## Why not the PRD's Fase 1 (course-corrected)

The PRD's clean `scene`/`proposed_commands`/`decision_point` contract assumes a redesign (stateless payload, no DB reads, World Pack DB). The **current** Node pipeline is different: `narrateDay.js` already does DB reads itself (via `tripHistory.js`) and hardcoded phrase banks/system prompt. Porting the PRD contract now would mean building new things Node doesn't have yet — exactly what the user wants to avoid. This plan ports what runs **today**, unchanged in behavior.

## Exact scope to port (already isolated by the prior domain refactor)

All of `backend/domains/story/services/`:

- `narrator/ai.js` — Groq primary/secondary fallback, temperature rotation by day number.
- `narrator/narrateDay.js` — orchestration entry point (gather continuity → build prompt → generate → run evals).
- `narrator/narratorCharacter.js`, `narrator/travellerBlocks.js` — character-facing prompt fragments (these call the Game adapter for character state/inventory; see DB approach below).
- `narrator/agent/polishNarrative.js`.
- `narrator/tripHistory.js` — `loadBannedPhrases`, `loadPreviousDaySummary`, `loadRecentDayClimates`, `loadPreviousOpenings` (currently direct Postgres queries).
- `phraseVices.js` — anti-repetition helper.
- `naturalLanguage/*` (12 files: climateNotes, dayPhases, elevationNotes, mealNotes, nightNotes, openingFocus, placeNotes, roadNotes, terrainNotes, terrainPhrases, waterNotes, index.js) — pure functions, hardcoded phrase arrays kept exactly as-is (no DB, no admin).
- `prompt/index.js`, `prompt/systemPrompt.js`, `prompt/sections/*` — prompt assembly, `SYSTEM_PROMPT` kept as a hardcoded constant (no World Pack).
- `evals/evalRunner.js`, `evals/narrativeChecks.js` — ported for parity (console-only warnings today; keep same behavior, e.g. `print`/`logging`).

**Not touched / not ported**: routing, PostGIS, Map domain, Game domain's `characterState.js` mechanical deltas (`computeEnergyDelta`/`computeShadowDelta`), `interactionResolver.js` (encounters are already resolved by the time `narrateDay` runs — confirmed `day.encounters` arrives pre-resolved). No World Pack DB, no admin, no rules engine, no decision points, no `proposed_commands` — none of that exists in the current pipeline, so none of it gets invented in Python.

## DB access approach (decided)

`tripHistory.js` currently queries Postgres directly for continuity data. **Python will not get direct DB access** — this matches the long-term "DB per domain" decision and the PRD principle that Python never reads the client's DB directly, and avoids giving Python DB creds now only to revoke them later.

Instead: `tripHistory.js` stays in Node (unchanged), executes **before** the HTTP call. Verified against the file: it exports 5 functions, but `narrateDay.js` only consumes 4 — `loadPreviousDaySummary`, `loadBannedPhrases`, `loadRecentDayClimates`, `loadPreviousOpenings` — these four are sent as fields in the request payload. The 5th, `loadRecentEncounterForms`, is called separately from the Game domain (`backend/domains/game/routes/trips.js`, for encounter variety during day generation, not narration) — untouched, out of scope. This only touches the call site of `narrateDay`, not any query logic.

## New repo

`story-engine/` at workspace root, sibling to `backend/`/`frontend/` — independent FastAPI project, no DB, no admin, no World Pack.

## Build order

1. **Scaffold**: `story-engine/app/main.py`, `requirements.txt` (fastapi, uvicorn, groq SDK or httpx, pydantic), `.env.example` (`GROQ_API_KEY`, `GROQ_API_KEY_2`), `README.md`. Health check endpoint.
2. **Port `naturalLanguage/*`** → `app/natural_language/*.py`, one module per file, same function names/signatures translated to Python, same hardcoded phrase content (no data changes).
3. **Port `prompt/*`** → `app/prompt/*.py` (sections + `system_prompt.py` with `SYSTEM_PROMPT` constant + `index.py` with `build_day_prompt`), calling the ported `natural_language` modules.
4. **Port `narrator/ai.py`** — Groq client wrapper, same fallback/sampling-rotation logic as `ai.js`.
5. **Port `phraseVices.py`** and eval modules (`evals/*.py`).
6. **Port `narratorCharacter.py`/`travellerBlocks.py`** — these currently pull character state/inventory via the Game adapter; since Python has no DB, these become pure functions over data passed in the payload (character/inventory blocks arrive pre-built, same as `conditionBlock`/`equipmentBlock` already do today for `narrateDay`).
7. **`POST /narrate-day`** endpoint — Pydantic request model mirroring `narrateDay()`'s current params (`day`, `trip`, `character`, `language`, `conditionBlock`, `equipmentBlock`, `endStateBlock`, plus the four continuity fields now passed explicitly instead of queried) → returns `{ prompt: { system, user }, generation: { text, ia_provider, temperature, ... } }`, identical shape to what `narrateDay.js` returns today.
8. **Node integration**: at the call site of `narrateDay` (Game domain, wherever a day is generated/redone), call `tripHistory.js` as today, build the payload, and replace the in-process `narrateDay()` call with an HTTP POST to the Python service. Keep the old Node narration code in place but unused (or behind a flag) until the new path is verified, then remove it.
9. **Verification**: run the same trip/day scenario through both paths (old Node `narrateDay` vs new Python `/narrate-day`) and diff the generated prompt text (should be byte-identical) — LLM output will naturally vary, but the `prompt.system`/`prompt.user` strings must match exactly for a given input. Port/adapt the existing tests under `backend/domains/story/services/__tests__` as Python pytest equivalents where feasible (phrase-bank/pure-function tests translate directly).
10. **Cleanup**: once verified, delete the now-dead Node narration code and the in-process story adapter path from `backend/domains/game/adapters/storyClient.js`, replacing it with the HTTP client only.

## Explicitly out of scope (do not build unless asked later)

World Pack DB, Story Tuner admin, rules engine / `requirements`-`outputs` evaluation, decision points, `proposed_commands`, agnostic `scene.facts[]` contract — all PRD-only concepts not present in the current running system.

## Cost assessment

**Relatively cheap**, precisely because the prior domain refactor already isolated this code behind `backend/domains/story/` with no leftover Map/Game imports except through adapters:

- ~30 files total, almost all small, pure-function string/template building (`naturalLanguage/*`, `prompt/*`) — mechanical JS→Python translation, no algorithmic complexity, no DB in Python.
- `ai.js` → Groq has an official Python SDK; fallback/rotation logic ports 1:1.
- `tripHistory.js` doesn't need touching — it's not moving, only its call site changes.
- Main cost is **verification** (byte-for-byte prompt parity across languages) and **one Node call-site change** (swap in-process call for an HTTP call) + new deploy target. No schema/data migration, no new infra dependency (no new DB).
- Realistic size: a few focused sessions, not a multi-week rewrite — it's translation, not redesign.

## Immediate benefits of doing this now (before any new features)

1. **Validates the 3-API split for real** — network boundary, latency, deploy, error handling — using the lowest-risk payload (pure text generation, easy to diff against the old path).
2. **Establishes the reusable pattern** (HTTP contract, timeouts, error propagation) that the eventual Map/Game service splits will reuse.
3. **Shrinks Node's dependency surface** (Groq SDK, prompt string sprawl moves out), matching the domain-boundary goal already committed to.
4. **Unblocks future PRD work cheaply**: once Python exists and is verified, World Pack/rules engine/admin become additive there — no second cutover needed later.
5. **Access to Python's LLM/NLP ecosystem** (Jinja2 templating, easier multi-provider abstractions, future retrieval/embeddings) without waiting for a bigger rewrite.

**Does not immediately deliver**: editable content, admin UI, decision points — those still require the deferred PRD phases.

