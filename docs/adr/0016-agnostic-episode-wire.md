# Agnostic episode wire: events carry experience, condition carries data

The episode-open payload spoke the game's language: `day` with its raw mechanics, `trip_name`, split `character_state`/`equipment_state`, and host-computed history (`previous_day`, `recent_day_climates`). Two leaks resulted: the Mind could — and its legacy fallback did — derive world prose from raw numbers, which is the Host's job; and the contract pretended every Host has days, trips and climates. The wire is rebuilt around the boundary it was meant to enforce: **the Host reports what happened already verbalized; the Mind decides how it was lived.**

The canonical payload carries: `episode` ({`index`, `at`, `terminal`}), `arc` (the larger narrative's name), `condition` (one flat map — `character_state` and `equipment_state` merge; the only channel where numbers are legal, read by Detectors, never by the narrator), `events` (the lived stretch: `{type, when, where, data:{reading, tags}}`, always verbalized — the only channel that feeds Memory), `world_notes` (the World voice briefing) and `fate` (the Host's verdict on the ending, declared before narration). `day`, `previous_day` and `recent_day_climates` are gone: a Mind reads its own stored Episodes for history — streaks already live in mind counters — so host-reported past is redundant; the stateless `/narrate-day` may still take such hints since it has no Past by definition.

Resolved ambient situations — the regional voices gated by tags, such as "the wall that makes noise, night 1" — travel as `events` of type `moment`: verbalized and tag-connected, never a separate `day.ambient` field, and never carrying their mechanical `effects`, which the Host applies before reporting.

One closed Tag registry (`narration_tags`, seeded from `tags.json`) is the single vocabulary for gating, event/memory tags and future consumers; it gains event facets and is shown read-only in Mind Studio. A dual-read shim accepts the legacy shape for one release; stored episode bodies are not migrated.

## Consequences

- The narrator's number-to-prose fallback dies: narration consumes Events and World notes only.
- Events become the single door into Memory — anything not sent as an Event is data, never experience.
- `moment` is named for what the world made the Character feel, not for the authored record's shelf: `interactive` stays a capability of authored records, unrelated to the wire type.
- The contract is host-agnostic: a Host without climate, days or trips still speaks it fully.
