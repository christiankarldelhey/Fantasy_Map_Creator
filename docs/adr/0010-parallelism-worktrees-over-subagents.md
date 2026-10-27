# Issue-level parallelism uses worktrees; subagents stay intra-session

Parallel work across issues runs as `git worktree` + one Devin session per
issue. Background subagents are used only for delegation inside a session
(exploration, searches, isolated files), never as issue-level parallelism:
they share the parent's filesystem and cannot request permissions.

## Rationale

The two mechanisms operate at different granularity, not as alternatives.
Two sessions on one checkout would collide on git state and files; two
worktrees cannot. Features are split by file ownership with cross-layer
contracts pinned in issue bodies; shared files (i18n locales, `package.json`,
barrels) get a single owner or a final integration commit.

## Consequences

- Human review is the bottleneck, so concurrency is capped at 2 issues, 3
  once `runs.jsonl` shows clean AFK runs.
- Merge order matters: worktree branches rebase on `master` after each
  merge.
