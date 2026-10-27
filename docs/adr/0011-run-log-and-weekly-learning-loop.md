# Agent impact measured in runs.jsonl with a weekly learning loop

Each agent run appends one JSONL record to `docs/agents/runs.jsonl` via a
custom `log-run` skill (auto-collected git/`gh` facts plus three human
answers). A weekly review summarizes three metrics — throughput, corrections
per PR, and AFK success rate — and promotes repeated lessons into AGENTS.md
rules, hooks, skills, or CONTEXT.md entries.

## Considered Options

- **Markdown run journal**: rejected; prose logs cannot be queried. JSONL
  answers "which areas produce the most corrections?" with `jq`.
- **Full schema designed upfront**: rejected; three metrics suffice now and
  fields can be added once real gaps appear.

## Consequences

- AFK success rate (% of AFK issues merged with zero human corrections) is
  the primary autonomy metric and gates raising the parallelism cap.
- Hooks (`SessionStart`/`SessionEnd`) capture duration and counts for free;
  `log-run` adds the human-verdict fields that automation cannot see.
