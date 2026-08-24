# Story Engine (Python)

Literal 1:1 port of the Node narration pipeline (`backend/domains/story/services/*`) to a
standalone FastAPI service. No behavior changes, no new features: same phrase banks,
same prompt assembly, same Groq fallback/sampling logic — just running in Python and
called over HTTP instead of in-process.

See `/Users/christiankarldelhey/.windsurf/plans/story-engine-python-phase1-908d15.md` for
the full migration plan and scope decisions.

## What this is NOT

No World Pack DB, no admin, no rules engine, no decision points, no `proposed_commands`.
Those are PRD-only concepts not present in the system this ports.

## Run locally

```bash
cd story-engine
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in GROQ_API_KEY (and optionally GROQ_API_KEY_2)
uvicorn app.main:app --reload --port 8001
```

## Endpoint

`POST /narrate-day` — mirrors `narrateDay()` from `backend/domains/story/services/narrator/narrateDay.js`:

- Input: `day`, `trip`, `character`, `language`, `conditionBlock`, `equipmentBlock`,
  `endStateBlock`, plus the continuity fields that `tripHistory.js` resolves in Node
  before calling this endpoint (`previousDaySummary`, `bannedPhrases`,
  `recentDayClimates`, `previousOpenings`).
- Output: `{ prompt: { system, user }, generation: { text, ia_provider, temperature,
  frequency_penalty, presence_penalty, top_p } }` — identical shape to the Node
  `narrateDay()` return value.

No database access — this service is fully stateless, matching the "DB per domain"
architecture decision (see the plan doc).
