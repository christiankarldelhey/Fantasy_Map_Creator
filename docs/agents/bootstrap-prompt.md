# Bootstrap Prompt — Agentic Delivery Workflow

Paste this into a Devin session in any repo to bootstrap the same level-4
agentic delivery system. Replace the bracketed parts.

---

```
Call the Skill tool for "grilling" and "domain-modeling" if available.

Goal: design, document and then implement an agentic delivery workflow for
this repo, as close as possible to how a senior engineer works on a product
team that runs coding agents at "level 4": an agent-ready codebase,
guardrails that let agents work autonomously and safely, parallel
orchestration across a feature, critical review, and measurement of the
agents' impact. I'm doing this to learn by practice, so I want to understand
every decision, not just get a setup.

Reference workflow to adapt (not copy):
fuzzy idea → grilled spec → PRD → vertical-slice issues tagged AFK/HITL →
parallel implementation in worktrees with TDD → two-axis code review →
performance check where relevant → merge → log what the agents did and what
I had to fix → turn repeated lessons into rules or skills.

About this repo: [1-3 lines: stack, what makes it complex, legacy areas, how
I currently use agents]. Agent harness: [Devin CLI / Claude Code / other].
Skills already installed: [list or "none"].

How to run this session:
- Explore the repo yourself for facts (structure, scripts, tests, CI,
  existing AGENTS.md/CONTEXT.md, agent config dirs, installed skills,
  hooks). Only ask me about decisions.
- Ask me one question at a time in [your language]; write all docs in
  English.
- Do not install, configure or change code until I confirm shared
  understanding.

Decision branches to resolve, in dependency order:
1. Context: what goes in AGENTS.md vs. domain glossaries vs. skills, and
   which domain terms need a glossary.
2. Skills: which to keep/add/drop, and which custom skill(s) to write (at
   least one for logging agent runs).
3. Guardrails: which lifecycle hooks (typecheck, lint, affected tests) and
   which permissions; what must never be automated; which permissions to
   pre-grant for background subagents.
4. Autonomy: concrete criteria for tagging an issue AFK vs. HITL in this
   repo, especially complex or legacy areas.
5. Parallelism: manual git worktrees with one session each vs. background
   subagents in a single session — when to use which, how to split a
   feature without conflicts, how many agents I can realistically
   supervise.
6. Review: the checklist for agent-generated diffs, and where the two-axis
   review fits.
7. Performance: which screens or flows need a measurable check, and how.
8. Measurement: what to log per run and how to review it weekly.
9. A first pilot feature to run the full flow end to end: [idea, or ask me].

Output of this session: updated CONTEXT.md (or CONTEXT-MAP.md if multiple
domains), one ADR per significant decision in docs/adr/, and
docs/agents/workflow.md describing the flow step by step including a
mermaid diagram of both lanes. When we're done, give me the exact next
commands for the pilot feature.
```
