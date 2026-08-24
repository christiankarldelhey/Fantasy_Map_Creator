# Domains

Internal boundaries for the eventual Map / Game / Story Engine split (see
`/Users/christiankarldelhey/Documents/Middle Earth Map/.windsurf/plans/three-api-split-eecbbd.md`
and `docs/story-engine-prd.md`). Still one deploy, one process, one database —
only the code is partitioned.

## Domains

- **map/** — geospatial and climate lookups. Routing, DEM, biomes, regions,
  roads, water, climate/moon data. No game rules, no per-user state.
- **game/** — rules, persistence, mechanics. Auth, users, characters, trips,
  inventory, encounters selection, day generation. Owns every table that
  changes per user/character/trip.
- **story/** — narrative continuity reads (tripHistory.js, DB) and the phrase
  banks Game still needs at generation time (naturalLanguage/terrainPhrases.js,
  phraseVices.js). Prompt assembly and the LLM call itself now live in the
  story-engine Python service (../../story-engine); narrateDay.js is the seam
  that calls it over HTTP (`POST /narrate-day`). No DB tables of its own.

## The adapter rule

A file inside one domain's `services/` must never `import` a file inside
another domain's `services/` directly. Cross-domain calls go through that
domain's `adapters/*Client.js` (e.g. `game/adapters/mapClient.js`,
`game/adapters/storyClient.js`, `story/adapters/gameClient.js`). Today an
adapter is just a re-export — a plain function call, same process. That's the
seam: if a domain is ever extracted into its own deployed service, only its
callers' adapter files need to change (e.g. to `fetch()` calls), not the call
sites themselves. `story/services/narrator/narrateDay.js` already does this
for the story-engine (a real `fetch()`, since that domain is now a separate
Python service).

`db.js` and `middleware/auth.js` stay shared at the `backend/` root for this
phase (see plan's "Open questions" — flagged as duplication debt for when a
physical split happens).

## Known ownership debt (tracked, not blocking)

- `game/services/character/characterState.js` still contains
  `buildConditionBlock`, `buildEndStateBlock` and their `*_SENTENCE` phrase
  tables — these are narrative content and belong in Story per
  `docs/story-engine-prd.md` (§11). `story/adapters/gameClient.js` is the
  seam that makes that future move a one-file change.
- `game/services/world/{encounters.js,interactionResolver.js,
  placesInteractions.js,tripDay.js}` still mix proximity/geometry selection
  (arguably Map), mechanical consequences (Game), and encounter-form/dialogue
  selection (arguably Story) in one flow. Flagged in the plan as needing a
  closer read before further splitting; left as Game for now since it's the
  layer that ultimately writes the resulting state.
