# AFK vs HITL is decided by verifiability and reversibility, not difficulty

Issues are tagged AFK (agent executes end-to-end without mid-task questions)
or HITL (needs checkpoints with a human). AFK requires ALL of: verifiable by
an automated check, bounded scope, written acceptance criteria, reversible
PR, and no taste-judgment required. Every PR still gets human review — AFK
is about execution, not about skipping review.

## Rationale

Difficulty is the wrong axis: a one-line schema fix deep in `app/mind/` was
AFK-able because a contract test could verify it, while a trivial prompt
wording change is HITL because "does the narration sound right" is judgment.
The failure modes are asymmetric — a wrong HITL costs minutes, a wrong AFK
ships a silent disaster — so the tiebreak is always HITL.

## Consequences

- Zone defaults are recorded in `docs/agents/workflow.md` (mind semantics,
  alembic, seeds, routing and data pipelines default HITL; tested backend
  code, i18n and small UI default AFK).
- `frontend/` defaults HITL until a unit-test layer (Vitest) exists — tests
  are what unlock autonomy there.
