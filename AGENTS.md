# Middle Earth Map

Monorepo: an interactive Middle-earth travel app with a persistent Mind Engine
narrating a character's journey.

## Layout

- `backend/` — Express + PostGIS. Game state, trips, directions, routing.
- `frontend/` — Vue 3 + TypeScript + Vite + MapLibre. The map UI.
- `story-engine/` — FastAPI + SQLAlchemy/Alembic. Narration + Mind Engine.
- `mind-studio/` — separate Vue app for inspecting Mind state (built in Docker).
- `database/` — seeds and seed-loading scripts.
- `data_public/` — GeoJSON/JSON shipped to the client (~8MB; perf-sensitive).
- `data/` — source rasters/DEM (685MB, not shipped).
- `graft/` — generated architecture notes index.
- `docs/adr/` — architecture decision records.
- `docs/agents/` — agentic workflow docs (see workflow.md).
- `.devin/` — Devin CLI skills and hooks (committed; local config is gitignored).

## Verify

- `backend`: `cd backend && npm test` (node --test)
- `story-engine`: `cd story-engine && pytest` (large suite; run the touched
  module's tests first, full suite before finishing)
- `frontend`: `cd frontend && npm run build` (vue-tsc + vite build; no unit
  tests yet — see workflow.md, Vitest is being added)

No CI. Local verification + PR review are the only gates — hooks in
`.devin/hooks.v1.json` enforce them.

## Never

- No production DB access (not even read-only) and no deploys without a human.
- No edits to existing `story-engine/alembic/versions/*` files.
- No commits of secrets or `.env` files.
- Work happens on branches and merges via PR — never push to `master` directly.
- `database/seeds/` scripts that overwrite data require a human.

## Domain docs

- `CONTEXT.md` — glossary of the **Mind Engine** domain only. Read it before
  naming or modifying mind concepts (Episode, Lens, Focus, Belief…). Other
  domains have no written glossary yet; if a term feels ambiguous, that is a
  signal to resolve it (see `docs/agents/workflow.md`), not to improvise.

## Process

- Issues live in GitHub; every change lands via PR. AFK/HITL labels and the
  full agentic workflow are defined in `docs/agents/workflow.md`.
- Review agent diffs with `docs/agents/review-checklist.md`.

## Agent skills

### Issue tracker

Issues live as GitHub issues on this repo, managed with `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical triage labels: `ready-for-agent` (AFK) / `ready-for-human` (HITL) et al. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` at the root is the Mind Engine glossary; ADRs in `docs/adr/`. See `docs/agents/domain.md`.
