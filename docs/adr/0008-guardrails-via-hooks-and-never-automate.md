# Guardrails enforced by hooks; production access never automated

Agent guardrails are enforced mechanically through `.devin/hooks.v1.json`
lifecycle hooks rather than by instructions in `AGENTS.md`, which an agent
can forget under context pressure. With no CI in this repo, hooks are the
local substitute for pipeline gates.

## The contract

- `PostToolUse` runs the touched area's fast check; `Stop` blocks until the
  area's full verify passes.
- `PreToolUse` blocks production DB markers, deploy commands, pushes to
  `master`, edits to existing `alembic/versions/*`, and `.env`/secrets.
- `PermissionRequest` auto-approves safe commands so background subagents —
  which cannot request new permissions — never stall.
- `SessionStart`/`SessionEnd` append to the run log for measurement.

## Never automated

Production database access (not even read-only), deploys, alembic
migrations against real data, seed scripts that overwrite data, force-push,
and secrets handling. These require a human, enforced by hooks — not by the
agent's good judgement.

## Considered Options

- **Rules-only in `AGENTS.md`**: rejected; advisory text fails silently.
- **CI gates**: not available; there is no CI. If CI is added later, hooks
  remain for local feedback and CI takes over the merge gate.
