# Movers: authored beings on a calendar, outside the entity pools

The living map needs beings whose reach is a function of the in-world date — named travellers, companies and faceless hosts that appear, march and vanish through TA 3017–3018 on tracks the traveller cannot change. These are a new seed family (`movers`, `mover_legs`, `mover_beats`, `mover_trails`), deliberately separate from `entities`: an Entity is an archetype weighted per region, a Mover is *someone in particular* on a schedule. They meet the traveller as Crossings — inside a March leg's contact radius, as a flagged pick of the phase pool for Presence legs, or by stopping where a Resident leg lives — and each leg of a Mover's story carries its own authored Beat, so who you meet depends on what they were doing then. See `backend/CONTEXT.md` for the vocabulary.

## Considered Options

- **Movers as `entities` rows with extra columns**: rejected. The pools know "orcs in Ithilien, level 5", not "Faramir's company, here until the 20th, then gone". `probability_by_region` has no room for trails, leg windows or per-stage authored content, and it would put the world's schedule inside data the encounter engine treats as a static probability table.
- **Pure presence model (every mover = region + window + weight)**: rejected for the whole roster — nothing to draw on the map, no geometric crossings, an army you cannot see marching. Kept where it fits: Presence legs, for beings who roam an area and are met by chance.
- **Interactive crossings from day one**: rejected for v1 — a Crossing fires a static authored Beat. The schema separates identity (Mover), schedule (Leg) and content (Beat) so interactive encounters can arrive later without re-migrating.

## Consequences

- Authoring is a pipeline: one YAML per Mover plus a hand-drawn GeoJSON line per March leg, baked to daily `mover_trails` rows by a seed generator; runtime only ever reads the baked tables.
- `trip_days` gains `crossings`/`traces`, computed at day generation alongside the encounter rolls. A Presence leg enters the phase pool flagged — it competes with random encounters rather than adding on top, keeping the day's pacing.
- The world is calendar-bound: every player shares one TA calendar, so the authored window bounds the world — playing past late 3018 reaches its edge until new waves of Movers are written.
- World dates present as TA years (3017, 3018); `stamp1950` keeps climate sampling untouched — 1950 stays the dataset anchor, invisible to the fiction.
