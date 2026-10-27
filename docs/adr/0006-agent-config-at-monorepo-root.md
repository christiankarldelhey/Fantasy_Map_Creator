# Agent configuration lives at the monorepo root

Devin CLI configuration (`.devin/` skills and hooks) and `AGENTS.md` live at
the repository root, not inside `frontend/` where `.devin/` had been created
by a session started from that directory. Sessions run from the root of a
monorepo that spans `backend/`, `frontend/`, `story-engine/` and
`mind-studio/`; config at the root is discovered by every session.

## Considered Options

- **Keep `.devin/` inside `frontend/`**: rejected; sessions started at the
  root would not discover the skills, and the workflow operates across all
  four areas.
- **Root config plus per-area overrides**: deferred; nested `AGENTS.md`
  files are created lazily when an area develops conventions that diverge
  and cause repeated agent mistakes.

## Consequences

- `AGENTS.md` (root) is the canonical operational doc; a `CLAUDE.md` symlink
  to it is added when a Claude Code session is needed. `CONTEXT.md` (root) is
  documented there as the Mind Engine domain glossary only.
- `.devin/` is committed (skills, `hooks.v1.json`); only
  `.devin/config.local.json` is gitignored.
- A `CONTEXT-MAP.md` plus per-area `CONTEXT.md` files will appear only when a
  second domain glossary is written — lazily, per the domain-modeling rule.
