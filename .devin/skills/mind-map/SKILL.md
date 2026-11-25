---
name: mind-map
description: Maintain the living mind-engine map (docs/mind-map/). Use when code changes touch mind-engine/app/mind — new pipeline calls, renamed functions, changed behaviour — or when the user asks to update/refresh the mind map, add a @step, or explain the episode pipeline. Proposes @step annotations and manifest edits; the lint and the human decide.
---

# Mind Map

`docs/mind-map/` is the mind-engine drawn from itself: every node is a
Concept from `CONTEXT.md`, every edge was observed running a real recorded
day through the code. Read `docs/adr/0021-mind-map-as-code.md` first if it
exists — it records why the pieces are shaped the way they are.

## The three sources of truth

| Source | Says | File |
|---|---|---|
| Glossary | what each Concept *is* | `CONTEXT.md` headings |
| `@step('<term>')` | which functions are steps of the mind | `mind-engine/app/mind/*.py`, `app/narrate_day.py` |
| Manifest | storage + reads/writes + is_a relations | `docs/mind-map/concepts.yml` |

If they disagree, `--check` fails. Your job in this skill is to keep them
agreeing — proposing the annotation, never silently.

## When a change lands in `app/mind/`

1. **Run the lint**: `cd mind-engine && .venv/bin/python scripts/mind_map.py --check`
2. For each error, decide what the code *is*:
   - **A step of the mind** — it transforms something the glossary names:
     annotate the function `@step('<CONTEXT.md term>')`, add a `steps:`
     entry in `concepts.yml` with `reads`/`writes` in Concept names.
   - **Plumbing** — a real function but not a mind step (date math, wire
     shaping, render helpers): add its name to `internal:` with a one-line
     reason. This is also a decision — say why.
   - **A renamed/deleted step** — update the manifest `fn:` to match; the
     lint catches the stale name.
   - **A term the glossary lacks** — do NOT invent the `@step` term ad hoc.
     Per `domain-modeling`, the glossary is a human decision: propose the
     new heading in `CONTEXT.md` and flag it for review.
3. **Regenerate**: `python scripts/mind_map.py --update` (needs local
   Postgres; reruns the golden day in schema `mind_map`). Commit the
   regenerated `graph.json`, `*.mmd`, `*.md` together with the code change —
   one commit, code and its picture.
4. If the prompt/narrative should be refreshed too, ask the user before
   `--narrate` — it calls a real LLM.

## Rules

- A `@step` term must be a `CONTEXT.md` heading — the vocabulary is closed
  on purpose. A step that cannot name itself in the domain's words is
  plumbing.
- Concepts are not tables: `Belief` lives in a `memories` row, `Mood` in
  `Mind.mood`, `Lens` in `episode.brief`. The `lives_in` field says where.
- Never hand-edit `graph.json`, `*.mmd`, `episode-*.md`, `README.md` —
  they are generated; `--check` compares a source hash.
- The golden day (`golden-day.json`) is a real recorded trip day. Re-export
  only with `--export-day TRIP_ID DAY` when the wire or a better day
  warrants it; note the swap in the commit message.

## Commands

```bash
cd mind-engine
.venv/bin/python scripts/mind_map.py --check      # lint, no DB — pre-push + Stop hook
.venv/bin/python scripts/mind_map.py --update     # replay golden day → artifacts
.venv/bin/python scripts/mind_map.py --narrate    # update + real LLM narration
.venv/bin/python scripts/mind_map.py --export-day TRIP_ID DAY  # new golden day
MIND_TRACE_TESTS=1 pytest                          # record which tests hit which step
```
