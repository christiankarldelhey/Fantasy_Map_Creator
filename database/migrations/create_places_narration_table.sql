-- Migration: Create places table
-- Date: 2026-07-15
-- Description: Authored narrative records (Places) — the fichas layer that sits
--              on top of the locations gazetteer. One row per record of
--              data/json/places.json: places, ambients, arrivals, offers and
--              regional lore contexts. Columns hold everything the engine
--              filters by; nested content (variants, secret, sections, beats,
--              options) lives whole in payload JSONB.
--              See docs/adr/0013 and backend/CONTEXT.md ("Places").

CREATE TABLE IF NOT EXISTS places (
  id                  TEXT PRIMARY KEY,               -- ficha code: 'E-01', 'ctx_...', offer ids
  kind                TEXT NOT NULL                   -- place | ambient | arrival | offer | lore
                      CHECK (kind IN ('place','ambient','arrival','offer','lore')),
  location_id         INTEGER REFERENCES locations(id), -- NULL until anchored/positioned
  place_ref           TEXT,                           -- offer → parent place id
  region_id           INTEGER REFERENCES regions(id), -- primary region; full list in payload.region_ids
  name                TEXT,
  type                TEXT,
  tags                TEXT[] NOT NULL DEFAULT '{}',
  geom                geometry(Geometry, 4326),       -- Point | LineString | Polygon; NULL for
                                                      -- ambients/arrivals/lore/offers or until
                                                      -- a place is hand-positioned
  size_radius_km      NUMERIC(8,2),                   -- traveller is *at* the place
  influence_radius_km NUMERIC(8,2),                   -- askable / felt from afar
  payload             JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_places_kind      ON places(kind);
CREATE INDEX IF NOT EXISTS idx_places_region    ON places(region_id);
CREATE INDEX IF NOT EXISTS idx_places_location  ON places(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_places_place_ref ON places(place_ref)   WHERE place_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_places_geom      ON places USING GIST(geom) WHERE geom IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_places_tags      ON places USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_places_payload   ON places USING GIN(payload);

COMMENT ON TABLE  places IS 'Authored narrative records (fichas) layered over the locations gazetteer — ADR-0013';
COMMENT ON COLUMN places.kind IS 'place | ambient | arrival | offer | lore';
COMMENT ON COLUMN places.location_id IS 'Anchors a place to its gazetteer location; NULL until anchored';
COMMENT ON COLUMN places.place_ref IS 'Offer → parent place id (no FK: payload-first records)';
COMMENT ON COLUMN places.region_id IS 'Primary region (first of payload.region_ids)';
COMMENT ON COLUMN places.geom IS 'Working geometry of any type — point/line/polygon; copied or merged from the source feature (location point, road line, biome/water polygon) at seed or during georef; hand-edited afterwards. Provenance in payload.refs, e.g. {"water":[42],"road":[12,13]}';
COMMENT ON COLUMN places.size_radius_km IS 'Within it the traveller is AT the place (variants/secret/options)';
COMMENT ON COLUMN places.influence_radius_km IS 'Within it the place is askable and felt from afar';
COMMENT ON COLUMN places.payload IS 'Whole record: bilingual prose, variants, secret, sections, beats, options';
