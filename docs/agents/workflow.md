# Agentic Delivery Workflow

How this repo ships work with coding agents at "level 4": an agent-ready
codebase, guardrails that let agents work autonomously and safely, parallel
orchestration across a feature, critical review, and measurement of impact.

The human (DRI) turns fuzzy input into a classified lane, reviews every PR,
and owns the weekly learning loop. Agents do everything else.

## The two lanes

Every piece of work enters through **triage** and gets classified by the DRI.
Classification is a human decision — picking the wrong lane wastes effort.

| Input sounds like | Lane | First step |
|---|---|---|
| "X behaves wrong / used to work" | **Bug** | `/diagnosing-bugs` |
| "I want Y to exist / change" | **Feature** | grill (`/grill-with-docs`) → `/to-spec` |
| "This code is ugly / repeated" | **Tech improvement** | short grill → `/to-tickets` directly |
| Not sure yet | **Triage** | label `needs-triage`, revisit later |

Lanes are reversible: `/diagnosing-bugs` may conclude "missing design → feature",
`/to-spec` may discover "this is a bug in disguise".

## Flow

```mermaid
flowchart TD
    A[Fuzzy input] --> B{Lane?}
    B -->|bug| D[/diagnosing-bugs: root cause via evidence]
    B -->|feature| E[grill → PRD via /to-spec]
    B -->|tech| F[short spec]
    D --> G[/to-tickets → GitHub issue]
    E --> G
    F --> G
    G --> H{Tag: AFK or HITL?}
    H -->|AFK| I[Worktree + own Devin session]
    H -->|HITL| J[Interactive session, checkpoints]
    I --> K[/tdd: red → green → refactor]
    J --> K
    K --> L[gh pr create]
    L --> M[/code-review: two axes]
    M --> N{Perf-sensitive path?}
    N -->|yes| O[perf-check.sh before/after]
    N -->|no| P
    O --> P[Human review: review-checklist.md]
    P --> Q[Merge]
    Q --> R[/log-run → runs.jsonl]
    R --> S[Weekly review → lessons become rules/skills]
```

## Step by step

### 1. Spec (feature lane)
Grill the idea with `/grill-with-docs` until it's sharp, then `/to-spec` writes
the PRD with acceptance criteria. A PRD is skipped for small bugs and tech
improvements — ceremony is proportional to size.

### 2. Issues
`/to-tickets` breaks the PRD into vertical-slice GitHub issues. Each issue gets
an **AFK** or **HITL** label and — when it crosses a layer boundary — the
contract pinned in its body (endpoint shape, field names).

### 3. AFK vs HITL

**AFK** = the agent can execute end-to-end without asking anything mid-task.
It does NOT mean unreviewed — every PR gets human review.

An issue is AFK only if **all** hold:
1. **Verifiable** — an automated check defines "done" (test, typecheck, build)
2. **Bounded** — 1–2 areas, clear file scope
3. **Spec'd** — written acceptance criteria
4. **Reversible** — the PR can be reverted cleanly
5. **No taste judgment** — not prose quality, UX feel, or domain semantics

Zone defaults for this repo:

| Zone | Default |
|---|---|
| `story-engine/app/mind/` semantics (lens, director, retrieval) | HITL (domain-model decisions) |
| `story-engine/alembic/`, `database/seeds/` | HITL always (data, irreversible) |
| `backend` routes/services with tests | AFK-friendly |
| `backend` PostGIS/routing | HITL (subtle, thin coverage) |
| `frontend/` | HITL until Vitest lands, then AFK-friendly |
| `scripts/` data pipelines | HITL |
| i18n, small UI, docs | AFK |

Tiebreak rule: **when in doubt, HITL.** A wrong AFK is a silent disaster;
a wrong HITL costs minutes.

### 4. Parallel implementation
- **Between issues**: `git worktree add` + one Devin session per AFK issue.
  Never two sessions on the same checkout.
- **Within a session**: background subagents for delegation only
  (exploration, searches, isolated files) — never as issue-level parallelism.
- **Split rule**: by file ownership, not by layer. Cross-layer contracts are
  pinned in the issue body.
- **Shared files** (`en.json`/`es.json`, `package.json`, barrels): assigned to
  ONE issue owner, or resolved in a final integration commit.
- **Capacity**: max 2 concurrent issues, 3 once the log shows clean AFK runs.

### 5. Implementation
Agents work TDD (`/tdd`): failing test first, minimal code to green, refactor.
The test is the spec the agent cannot misread.

### 6. Guardrails (`.devin/hooks.v1.json`)

| Hook | Behaviour |
|---|---|
| `PostToolUse` (edit/write) | Run the touched area's fast check |
| `Stop` | Run the area's full verify; block stop if failing |
| `PreToolUse` (exec) | Block: prod DB markers, deploys, push to master, edits to existing alembic versions, `.env` |
| `PermissionRequest` | Auto-approve safe commands (tests, local git, `gh` read) |
| `SessionStart`/`SessionEnd` | Write to `docs/agents/runs.jsonl` |

Background subagents cannot request permissions — pre-grant reads, edits,
tests and local git before dispatching; deny everything on the never-list.

### 7. Review
Two axes: **Spec** (does it do what the issue asked, and only that?) then
**Craft/Standards** (does it belong in this codebase?). `/code-review` does
the first pass — it runs exactly these two axes in parallel subagents; the
human does the second against `review-checklist.md`.
Rule: review the diff, not the PR description.

### 8. Performance check
Only when the PR touches a sensitive path: `map-viewer` layers, `routing.js`
or `/api/directions`, the narration pipeline, `data_public` payloads.
`scripts/perf-check.sh` times key endpoints and reports payload/bundle sizes;
the agent runs it before and after, and pastes the numbers in the PR.
Baselines live in `docs/agents/perf-baseline.md`; >10–15% regression requires
written justification until real budgets exist.

### 9. Merge and log
Merge via PR (the PR is the measurement unit). `/log-run` appends one line to
`docs/agents/runs.jsonl`:

```json
{"date":"2025-10-27","issue":42,"pr":43,"lane":"bug","tag":"AFK",
 "areas":["story-engine"],"stats":{"files":3,"add":40,"del":5,"tests_added":2},
 "human":{"review_rounds":1,"corrections":0},
 "duration_min":25,"outcome":"merged","lesson":""}
```

`log-run` auto-collects git/`gh` facts and asks three human questions:
corrections, notes, lesson.

### 10. Weekly review (~15 min)
An agent summarizes the week's `runs.jsonl` on three metrics:
- **Throughput** — issues merged/week per lane
- **Quality** — corrections per PR, rework/abandon rate
- **AFK success rate** — % of AFK issues merged with 0 human corrections

Every repeated correction becomes a promotion candidate: AGENTS.md rule, new
hook, new skill, or CONTEXT.md entry. This loop is what makes the system
self-sharpening.

## Skills

| Skill | Role |
|---|---|
| `grill-with-docs`, `grilling`, `grill-me` | Spec sharpening (feature lane entry) |
| `domain-modeling` | CONTEXT.md glossary + ADRs, lazily |
| `to-spec`, `to-tickets`, `triage`, `tdd`, `code-review`, `handoff`, `diagnosing-bugs`, `pr` | mattpocock pack — the pipeline |
| `setup-matt-pocock-skills` | One-time: writes `docs/agents/issue-tracker.md` + domain doc pointers |
| `log-run` (custom, this repo) | Appends run records to `runs.jsonl` |
| `improve-codebase-architecture` | Postponed — for the architecture survey later |

User-level (`~/.agents/skills`): `vue-best-practices`, `postgis-skill`,
`frontend-design`, `find-skills`, `devin-cli`.

## Vocabulary

- **AFK / HITL** — issue tags: autonomous vs human-in-the-loop execution
- **Run** — one agent session's unit of work (usually one issue)
- **Lane** — bug / feature / tech-improvement classification at triage
- **Vertical slice** — an issue that ships a thin end-to-end piece of value
