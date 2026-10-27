# Agent Diff Review Checklist

Second-pass human review for agent-generated PRs. `/code-review` does the
first pass (Spec + Craft axes); this list covers what agents get wrong most.

Rule: **review the diff, not the PR description.**

## Every diff

- [ ] **Scope**: touches only what the issue asked — no drive-by fixes or
      unrequested refactors.
- [ ] **Tests are real**: do they pin behaviour, or re-assert the
      implementation? Would the new test fail against the old code?
- [ ] **Comments**: no existing comments deleted; no narration comments added
      ("// this function calculates...") that weren't asked for.
- [ ] **Error handling**: no try/catch or guards "simplified" away.
- [ ] **Types**: no new `any`, `as`, or loosened signatures that weaken
      contracts.
- [ ] **Never-list**: no edits to existing `alembic/versions/*`, seeds that
      overwrite data, `.env`, or anything prod-related.
- [ ] **Verification evidence**: the PR shows actual test/build output, not
      the phrase "tests pass".
- [ ] **Perf-sensitive path?** (`map-viewer` layers, `routing.js`,
      `/api/directions`, narration pipeline, `data_public`) → require
      `scripts/perf-check.sh` before/after numbers in the PR.

## This repo specifically

- [ ] **i18n**: new user-facing strings exist in BOTH `en.json` and `es.json`.
- [ ] **Vocabulary**: mind-domain naming follows `CONTEXT.md`
      (Episode/Lens/Host — not "session"/"mind block").
- [ ] **Wire contracts**: payload shapes pinned by exact-keys tests (see the
      `EncounterEntity.family` incident) — a changed payload without a
      contract test is a flag.
- [ ] **Frontend behaviour**: `frontend/` has no unit tests yet — visual/
      behavioural verification is human until Vitest lands. Typecheck passing
      is not evidence of correctness.
