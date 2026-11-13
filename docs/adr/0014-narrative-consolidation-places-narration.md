# One narrative layer: `places_narration` over a mute gazetteer

Narrative prose about quiet things is scattered across ~7 stores, each with its own fallback logic in code: `locations.description` (418 rows), `water.description` (32), `biomes.description` (a column nobody fills — 0 of 1190), `regions.description_*`/`land`/`people`/`products`, `region_biome_descriptions` (29k generated rows), `region_seasonal_descriptions`, `places_interactions`, and the ficha records in `places`. The readers — `placeNotes`, `waterNotes`, `terrainPhrases`, `seasonalVariants`, `placesInteractions` — implement five separate specificity ladders to answer one question: *what does the world say about this spot?*

We consolidate all quiet narrative into **`places_narration`** (the ficha table, renamed and extended): every record the world tells about a place, feature or scope — authored fichas (`place`/`ambient`/`offer`/`arrival`/`lore`), feature descriptions (`depiction`), region records (`region`), overnight interactions (`overnight`, folding `places_interactions`), and generic scope-bound descriptions. Records carry no geometry: a record's position is always borrowed — `location_id` for hosted fichas (1:N, unchanged), `feature.depiction_id` for the thing it describes, or scope columns (`type`, `region_id`, `cultural_family`, `priority`) for generic records. Geometry tables keep `id + name + geom + depiction_id` plus mechanics columns only (encounter metrics, `cultural_family`, `water_type`, etc.): **mechanics stay, prose migrates**. Beings are out of scope — `entities` and `movers` remain their own family.

The binding is an **inverted FK**: each geometry row holds `depiction_id → places_narration.id`. One feature gets at most one depiction (1:1 enforced); many features may share one record (every `roads` segment of the East Road points to the same ficha). The authored truth stays in `payload.refs` (`{"water":[12],"roads":[77,78]}`) — the seed materializes `depiction_id` from it on every run, so re-importing the gazetteer re-attaches links instead of orphaning them; `validate-seeds` reports depictions nothing points at and refs claiming the same feature.

Amends ADR-0013 on three points: a narrative record no longer owns a `geom` (the gazetteer anchor's geometry is the only position truth — the old `places.geom`/`locations.geom` dual-write is dropped); `payload.refs` stops being audit-only and now drives the materialized `depiction_id`; `locations.description` migrates to `depiction` records — the map UI and the narrator both read through the single resolver.

## Considered Options

- **Per-table descriptions, kept**: rejected — that is the status quo, with five parallel ladders and columns that are already empty in practice.
- **Typed FK columns on the narrative side** (`water_id`, `biome_id`, `road_id`…): rejected — it cannot enforce one-depiction-per-feature, multiplies nullable columns per new geometry table, and protects the wrong delete direction.
- **`feature_key` text (`'wat:55'`) as the runtime link**: rejected as a column — no cross-table referential integrity is possible; kept as the *authoring* format inside `refs`.
- **Keep `places_interactions` separate**: rejected — it already is the specificity ladder this design generalizes; folding it in is what makes one resolver possible.
- **Record-owned `geom`**: rejected — position would again live in two places (record and anchor), exactly the drift this decision removes.
- **Two-level type columns** (`type` + `type_class`): rejected — the coarse grouping (`village|town|city → settlement`) is a static map in the resolver code, never desynced from the native type columns.

## Consequences

- `kind` gains `depiction`, `region`, `overnight` (and later `kingdom` — kingdoms have no geometry and become pure records scoped via `regions.kingdom_id`).
- `season`/`dayphase` are **variant keys inside `payload.variants`**, not scope dimensions — a lake in autumn is the same subject with different text; `region_seasonal_descriptions` and the region summary rotation fold into the same machinery.
- `region_biome_descriptions` stops being a queried table: its generator becomes an authoring tool that emits ~1–2k scope-bound records (`type` × `region_id`) with variants in payload instead of 29k rows.
- Radii (`size_radius_km`, `influence_radius_km`) stay on the narrative record — they are resolver mechanics (when to tell), not cartography; two records on one anchor may legitimately reach differently.
- The 416 untyped `locations` are mostly georef anchors (~409): they default to `point_of_interest`, name-obvious ones get real types, and anchors get `source='georef'` to stay distinguishable from the imported gazetteer.
- Migration is staged inside one branch: additive schema (table + `depiction_id` columns) → backfill → single resolver → readers re-pointed one by one → column/table drops last, only after a `pg_dump` — georef positions and anchor rows are DB-only state, not covered by git.
- `CONTEXT.md` gains the vocabulary: Depiction, `depiction_id`, described-as vs hosted-at, and the mechanics/prose boundary.
