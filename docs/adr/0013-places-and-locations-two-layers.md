# Places and Locations: two layers, authored only

The world now has two distinct kinds of "somewhere": the gazetteer rows in `locations.sql` (~460 named points with geometry, type, population and descriptions, mostly sourced from TA ~1640 material) and the authored JSON records (`lugares-tierra-media.json`, 678 Places plus ambients, arrivals, offers and regional contexts, written for TA 3018). We keep them as **two linked layers**: a Place anchors to a Location through `location_ref` and inherits its point; the Location never absorbs narrative payload. When a Place and its Location disagree, the Place wins — it is written for our year and the gazetteer is not. Places carry `geo` with two radii: `size_radius` (the traveller is *at* the place — variants, secret and options apply) and `influence_radius` (it already exists narratively — locals can be asked about it and its signs are felt before arrival). Ambients and arrivals carry no geometry: they are regional, not points.

## Considered Options

- **Merge narrative into `locations` as a JSONB column**: rejected — it would mix two lifecycles and two source eras in one table, and put game logic inside a gazetteer that other consumers read as pure geography.
- **Template-generated default fichas for every bare Location**: rejected — one template per `location_type` would make every manor, village and ruin of a type feel identical. Bare Locations stay geography-only until they get a **personalized** ficha (LLM-drafted one by one from the Location's own description plus the regional `ctx_*` register, each reviewable); the authored layer always replaces generated content.
- **Hand-write all bare-Location fichas first**: kept as the long-term path but not a gate — the LLM pass produces reviewable drafts at scale, and nothing blocks replacing them by hand.

## Consequences

- Radius defaults come from a table by type (city 2–4/60–80 km, town 0.5–1/30–40, village 0.3–0.5/15–25, inn 0.1/10–15, manor/castle 0.2–0.4/15–25, fortress/harbour 0.3–0.5/40–60, ruins 0.1–0.3/5–15, natural feature 0.5–3/5–20, landmark 50+), tuned per Place during the georeferencing pass.
- A Location without a Place is inert for gameplay — visible on the map, unreachable for options. Interaction coverage grows as fichas are anchored, which is deliberate.
- `locations.description` is **not** overwritten: the gazetteer prose (encyclopedic, dated) serves the map UI; the ficha's `base`/`lore` (experiential, TA 3018) serves narration. Each text does its own job — the Place stays canonical for narrative, the Location for facts.
- A Place is not only a point: `geom` is any `Geometry` so a Place can be a town (Point), a named road (LineString — e.g. the Greenway through Bree) or a woodland (Polygon). Provenance lives in `payload.refs` (`{"water": [42], "road": [12,13], "biome": [7]}`), never as a live FK — named road narratives span many unnamed `roads` segments, and runtime queries always hit the Place's own merged `geom`. `location_id` stays the single FK for the dominant point-anchoring case.
- See `backend/CONTEXT.md` for the vocabulary (Location, Place, `location_ref`, size radius, influence radius).
