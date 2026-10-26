# The Mind owns every narrative memory and open loop; the host owns facts

All narrative interior — Memories, Beliefs, and Needs of any horizon (a missed meal, an unkept promise, a goal that spans the whole story) — lives in the Mind Engine. The host keeps only mechanical facts (a quest flag for its UI, a trip log for its rules); if such a fact should matter to the story it must reach the Mind as an event or impression, never as "the official memory". Nobody remembers anything the Mind did not live.

The old Story Engine contract — a host-owned pool of memories and goals fed to Python, with `memory_gain`/`goal_create`/`goal_resolve` proposed commands — is retired: there is no parallel memory left for it to write to. Threads (a Need type) already cover open loops of every horizon, and `decide` already returns the host's authored commands verbatim — the Mind never authors mechanics.

## Considered Options

- **Dual memory (host's official pool + the Mind's impressions)**: rejected; the same promise would exist twice and could diverge — the Mind believes the matter closed while the host still lists it open. A duplicated memory is a lie waiting to happen.
- **Mind impressions with write-through to host goals**: rejected; `goal_*` commands would reintroduce the parallel ledger this decision removes.

## Consequences

- The `memory_gain`, `clue`, `goal_create` and `goal_resolve` command types disappear from the contract; `story-engine-prd.md` sections describing the host-owned pool are superseded.
- Open loops the world's rules must track (quest state, HUD markers) remain host bookkeeping outside the engine — nothing forces them to agree with the Mind's Threads, and nothing should pretend they are the same thing.
