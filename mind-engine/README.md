# Mind Engine (Python)

The interiority layer of the monorepo: the host's world decides what happens;
the Mind Engine lives it — perception, memory, reflection, decision, and
narration as the corollary. A FastAPI service with three parts:

- **Narrator** (`app/narrate_day.py`, `app/prompt/`, `app/ai.py`, `app/evals/`)
  — stateless. Turns one resolved day into prose: prompt assembly over the
  host's pre-verbalized `day.world_notes`, Groq with model/key fallback,
  post-generation evals. Needs no database.
- **Mind Engine** (`app/mind/`) — stateful, in the Postgres `mind` schema. The
  inner life of a Character: perception and checks, memory, beliefs, needs,
  mood, the Lens/Focus brief (with an LLM director) and reflection. The mind's
  own words live as constants in `app/mind/voice.py`; the world's words are
  never phrased here — the host declares prose and tags on the wire
  (`day.world_notes`, `event.data.reading`). Glossary: `../CONTEXT.md`;
  decisions: `../docs/adr/0001`–`0005`.
- **Mind Studio** (`app/studio/api.py` + `../mind-studio/`) — the admin. A
  separate Vue app served at `/studio`, backed by `/studio/api` (ADR 0002).

The mind never blocks the host: if the database is down, Mind endpoints answer
503 and `/narrate-day` keeps working. Status overview:
`../docs/mind-engine-estado.md`.

## Run locally

```bash
cd mind-engine
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # GROQ_API_KEY (+ optional _2/_3), DATABASE_URL, ADMIN_USER/ADMIN_PASSWORD
alembic upgrade head   # creates/updates the `mind` schema
uvicorn app.main:app --reload --port 8001
```

Mind Studio is served at `/studio` once `../mind-studio/dist` exists
(`cd ../mind-studio && npm run build`). Studio auth is HTTP Basic against
`ADMIN_USER`/`ADMIN_PASSWORD`; unset means closed.

Optional knobs: `MIND_DIRECTOR` (`on` by default; anything else keeps the
rules' Lens pick), `MIND_DIRECTOR_MODEL`, `MIND_SCHEMA` (default `mind`),
`MIND_EMBEDDING_DIM` (default 256).

## Endpoints

| Route | Purpose |
|---|---|
| `GET /health` | `ai_configured`, `db` (`ok`/`down`), `mind` (`mounted`/`degraded`) |
| `GET /system-prompt` | The narrator system prompt (single source of truth) |
| `POST /narrate-day` | Stateless narration of a resolved day |
| `POST /episodes` | Open an Episode (idempotent per `episode_ref`): perceive, evoke, needs, mood, brief, Lens |
| `GET /episodes/{id}` | Episode state |
| `POST /episodes/{id}/decide` | Record the host's pick; returns the option's `proposed_commands` |
| `POST /episodes/{id}/narrate` | Narrate through the Mind (English, then translated) and measure what resonated |
| `POST /episodes/{id}/close` | Host reports the outcome; Mind encodes, decays, drifts attitudes, reflects |
| `GET /mind/state/{character_id}` | A brain's memories, beliefs, needs |
| `POST /mind/brains/{character_id}/mold` | Reassign a brain's mold |
| `POST /mind/brains/{character_id}/reset` | Wipe everything lived; re-seed starter beliefs |
| `POST /maintenance/consolidate` | Batch decay/patterns for degraded (NPC) brains |
| `GET /packs/{game_id}/versions`, `POST /packs/{game_id}/{clone,promote}` | Need-rules pack versioning |
| `/studio/api/*` | Mind Studio: minds, card, traits, concerns |

The host (`backend/domains/story/services/narrator/narrateDay.js`) uses the
Episode lifecycle when `MIND_ENGINE` is on and falls back to `/narrate-day` on
any failure.

## Invariants

- The world says what it was: the host declares prose and tags
  (`day.world_notes`, `event.data.reading`); the mind consumes them verbatim
  and never phrases world numbers or coins tags.
- The Mind proposes, the host executes: `proposed_commands` are never run here.
- The Mind knows no host field it was not told (ADR 0005): vitals are read
  through declared Detectors.
- Inner language is English; other reader languages are a final translation
  (ADR 0003).
- Never edit existing `alembic/versions/*` files — add a new migration.

## Tools

- `pytest` — the test suite (run the touched module's tests first).
- `scripts/replay_days.py` — replay recorded trip days through the Mind, no UI.
