# GitHub Issues for tracking; one PR per issue as the review surface

Work items live in GitHub Issues on this repo (via `gh` CLI), tagged
AFK/HITL. Every issue lands through a pull request — there is no CI, so the
PR is the only review surface and the unit of measurement for agent runs
(issue → PR → merge → run log entry).

## Considered Options

- **Local markdown issues under `.scratch/`**: rejected; local files cannot
  link to PRs, carry no labels workflow, and leave the measurement log
  without an anchor.
- **Local merge to `master` without PRs**: rejected; the diff would have no
  persistent review surface and "what the human corrected" would depend on
  memory.

## Consequences

- Even as a solo project, every change goes through `gh pr create` + human
  review + merge. The PR ceremony is deliberate: it is where two-axis review
  and the perf check live.
- AFK/HITL is expressed as GitHub labels on issues.
