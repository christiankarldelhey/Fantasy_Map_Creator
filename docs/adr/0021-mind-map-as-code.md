# Mind map as code: the mind-engine drawn from itself

The mind-engine had no picture of itself. `CONTEXT.md` names the domain in
glossary form, `routes.py` encodes the pipeline implicitly, and nobody —
human or agent — could answer "how does an Event become a Memory?" without
reading five hundred lines. Hand-drawn documentation was considered and
rejected on this repo's own evidence: `schema.sql` misses `trips` and
`trip_days`, the `narrateDay` JSDoc promises a `psyche_packet` the code no
longer returns, and the `graft/` index went stale for months while its
post-commit regeneration failed silently in a background `nohup`. Any
picture that is not *checked* rots in silence.

The map is therefore built from three sources that cannot lie, cross-checked
by a mechanical lint. **Nodes are Concepts** — glossary headings of
`CONTEXT.md` (Event, Memory, Belief, Mood, Need, Lens, Focus…), not tables:
Belief lives inside a `memories` row, Mood inside `Mind.mood`, Lens inside
`episode.brief`. **Edges are `@step('<term>')` decorators** — inert marks on
~25 domain functions; a step must name itself with a glossary term or it is
plumbing, and the lint says so. **The binding manifest**
`docs/mind-map/concepts.yml` declares where each Concept lives, what each
step reads and writes, and `is_a` relations between Concepts (Conviction is
a Memory, Thread is a Need) that no FK expresses.

**Examples come from a real day.** `scripts/mind_map.py --update` replays a
recorded trip day (`docs/mind-map/golden-day.json`, exported via
`--export-day` from `trip_days.mind_open/mind_close`) through the actual
pipeline in an isolated `mind_map` schema with the `@step` decorator in
trace mode: every traced call records what entered and what left. The
golden day is a mind's first-ever episode (`episode_idx = 1`), so its state
is exactly the preset seed — reproducible to the byte. The narration prompt
is committed; the generated text regenerates on demand with `--narrate`
(the LLM is not byte-reproducible and never blocks the check). Per-run ids
are normalized to stable placeholders so artifacts diff only on real change.

**Freshness is enforced, not automated.** `--update` is a manual act — run
by whoever touched `app/mind/` or by the `mind-map` skill, which proposes
annotations for new code (a step? plumbing? a renamed step?). What runs
unattended is only the verifier: `mind_map.py --check` in `pre-push`
(versioned `.githooks/`) and in the Devin `Stop` hook fails when a handler
calls an undecorated `app.mind` function, a term is missing from the
glossary or manifest, or the committed artifacts' source hash no longer
matches. Generation can be skipped; staleness cannot. This is the inverse
of the graft failure mode: there, generation ran automatically and nothing
verified the result; here, generation is deliberate and verification is
forced at the last moment before code leaves the machine.

## Consequences

- `docs/mind-map/` holds `lifecycle.mmd`, `episode-open|close.mmd`,
  `concepts.mmd`, per-flow `.md` walkthroughs, and `graph.json` — all
  generated, all committed, all pasteable into a Mermaid viewer.
- Adding a pipeline call to a handler without deciding its status fails the
  push: either `@step('<term>')` + a manifest `steps:` entry, or a name in
  `internal:` with a reason. Undecided is not an option.
- New domain vocabulary is a glossary decision (per `domain-modeling`), not
  a diagram decision — a `@step` term that is not a `CONTEXT.md` heading
  fails the lint.
- `--update` requires a live local Postgres; environments without it still
  get the full lint via `--check`.
- The trace records call depth: the published flow is the depth-0 skeleton
  plus phases run once inside a container step; per-item helpers
  (`derive_feeling` and friends) stay in `graph.json` as composition detail.
- Test-suite tracing (`MIND_TRACE_TESTS=1 pytest`) writes
  `tests/.mind-trace.json`, which maps each step to the tests that exercise
  it — the map's "rules" per step, drawn from docstrings already reviewed.
