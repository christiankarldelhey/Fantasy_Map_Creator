# The weight of experience: evoked memories outrank the Focus's veto; dispositions are ranked and rested

A Cave-troll met yesterday can lose to a waterskin: the memory it left (importance 0.82, evoked by today's encounter) never reached the narrator — `connected()` admitted only lines tied to the Focus, and the Focus was a weather need, so the brief silenced what the road itself had stirred — while the prompt's "what stirs" list was occupied by saturated routine fondness (0.98 affection for the waterskin, fed by every meal, narrated every day). Two failures: a veto in the wrong place, and a ranking with no sense of experience.

The veto moves: `connected()` now lets an *anchored* evoked memory pass unconditionally — evocation was already the relevance vote; the Focus decides what the day turns on, not whether the day may remind. The line still carries its anchor, so the echo rides inside the encounter that called it up (C21/C35) — the troll returns inside the Dumbledoors beat, not floating in a preamble. Unanchored memories keep the old gate: something must still connect them.

Dispositions (`inner_lines`) are ranked by `_disposition_weight`: felt dims (affection, trust, fear) count whole while familiarity counts half — knowing ground is quieter than fearing it; a Relation fed within the last 2 episodes is boosted ×2.0 — yesterday's troll outweighs sediment accreted weeks ago; and a Relation the prompt already voiced within 2 episodes is damped ×0.3 — the narrator has said that piece. `relations.last_surfaced_episode` (migration 0027) records when each disposition last reached the prompt, mirroring `Memory.last_voiced_episode`; `_merged_beats` stamps it on every line it emits, idempotently under re-narration. The daily gear now speaks once and rests, freeing the slot for what the journey is actually doing to them.

## Consequences

- Anchored evoked memories now reach the prompt through the brief itself; `_evoked_beats` remains only for legacy episodes persisted before C35 briefs existed.
- `inner_lines` takes `as_of_episode` (the mind's own clock); callers without a clock get unweighted ranking.
- Relations fed under an older episode clock (`last_fed_episode` ahead of `as_of_episode`) get neither boost nor damper — they rank by raw felt, a graceful no-op across clock resets.
- `_disposition_weight` is the single knob for "how story-worthy is this feeling": adjust `_FRESH_FEELING`/`_ALREADY_SAID`/`_FELT_FAMILIARITY` there, not at the call sites.
