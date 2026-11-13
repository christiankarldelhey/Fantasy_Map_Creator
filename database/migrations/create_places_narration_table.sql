-- Migration: places → places_narration
-- Date: 2026-11-13
-- Description: ADR-0014 — one table for all quiet narrative. Renames the
--              legacy `places` ficha table when present, creates
--              `places_narration` when neither exists, widens the kind
--              CHECK to the narration kinds, and adds the scope columns
--              (cultural_family, priority). `geom` is kept for now —
--              it goes dark as readers migrate and is dropped in the
--              final cleanup issue (#104).
--              See docs/adr/0014 and backend/CONTEXT.md ("Narration").

-- 1) Rename the legacy table. Guarded: a DB that already renamed (or never
--    had `places`) takes the create path below. The kind CHECK keeps its old
--    name `places_kind_check` after rename, so drop it here while the legacy
--    name is still known.
DO $$
BEGIN
  IF to_regclass('public.places') IS NOT NULL
     AND to_regclass('public.places_narration') IS NULL THEN
    ALTER TABLE places RENAME TO places_narration;
    ALTER TABLE places_narration DROP CONSTRAINT IF EXISTS places_kind_check;
    -- Rename indexes so the CREATE INDEX IF NOT EXISTS statements below stay
    -- no-ops on renamed databases (index names are schema-global).
    ALTER INDEX IF EXISTS idx_places_kind      RENAME TO idx_pn_kind;
    ALTER INDEX IF EXISTS idx_places_region    RENAME TO idx_pn_region;
    ALTER INDEX IF EXISTS idx_places_location  RENAME TO idx_pn_location;
    ALTER INDEX IF EXISTS idx_places_place_ref RENAME TO idx_pn_place_ref;
    ALTER INDEX IF EXISTS idx_places_geom      RENAME TO idx_pn_geom;
    ALTER INDEX IF EXISTS idx_places_tags      RENAME TO idx_pn_tags;
    ALTER INDEX IF EXISTS idx_places_payload   RENAME TO idx_pn_payload;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS places_narration (
  id                  TEXT PRIMARY KEY,               -- ficha code: 'E-01', offer ids, 'dep:loc:…'
  kind                TEXT NOT NULL                   -- narration kinds, see CHECK below
                      CHECK (kind IN ('place','ambient','arrival','lore',
                                      'depiction','interaction')),
  action              TEXT,                           -- interaction family: 'rest' | 'offer' (#106)
  location_id         INTEGER REFERENCES locations(id), -- hosted-at anchor (1:N); NULL until positioned
  place_ref           TEXT,                           -- offer → parent record id
  region_id           INTEGER REFERENCES regions(id), -- primary region / scope region
  name                TEXT,
  type                TEXT,                           -- ficha type; depiction scope: feature class
  cultural_family     TEXT,                           -- scope dimension (generalized from places_interactions)
  priority            SMALLINT NOT NULL DEFAULT 0,    -- tie-breaker between competing records
  tags                TEXT[] NOT NULL DEFAULT '{}',
  geom                geometry(Geometry, 4326),       -- DEPRECATED (ADR-0014): position is borrowed
                                                      -- from the anchor feature; kept until #104
  size_radius_km      NUMERIC(8,2),                   -- traveller is *at* the place
  influence_radius_km NUMERIC(8,2),                   -- askable / felt from afar
  description         JSONB,                          -- canonical flat prose {en, es} (#106)
  variants            JSONB,                          -- [{key|id, phrases|[…]|text|{en,es}, condition?}] (#106)
  mechanics           JSONB,                          -- rest_quality/shadow_effect, future numbers (#106)
  refs                JSONB,                          -- authored feature bindings → depiction_id (#106)
  payload             JSONB NOT NULL DEFAULT '{}'::jsonb -- kind-unique spec only (#106)
);

-- Columns for tables that predate this definition (rename path above, or an
-- early places_narration created before they were added).
ALTER TABLE places_narration ADD COLUMN IF NOT EXISTS cultural_family TEXT;
ALTER TABLE places_narration ADD COLUMN IF NOT EXISTS priority SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE places_narration ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE places_narration ADD COLUMN IF NOT EXISTS description JSONB;
ALTER TABLE places_narration ADD COLUMN IF NOT EXISTS variants JSONB;
ALTER TABLE places_narration ADD COLUMN IF NOT EXISTS mechanics JSONB;
ALTER TABLE places_narration ADD COLUMN IF NOT EXISTS refs JSONB;

-- Named CHECK for renamed legacy tables (fresh creates get it inline above).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'places_narration_kind_check') THEN
    ALTER TABLE places_narration
      ADD CONSTRAINT places_narration_kind_check
      CHECK (kind IN ('place','ambient','arrival','lore',
                      'depiction','interaction'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pn_kind      ON places_narration(kind);
CREATE INDEX IF NOT EXISTS idx_pn_region    ON places_narration(region_id);
CREATE INDEX IF NOT EXISTS idx_pn_location  ON places_narration(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pn_place_ref ON places_narration(place_ref)   WHERE place_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pn_scope     ON places_narration(type, region_id, cultural_family)
  WHERE kind IN ('depiction','interaction');
CREATE INDEX IF NOT EXISTS idx_pn_action    ON places_narration(action) WHERE action IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pn_geom      ON places_narration USING GIST(geom) WHERE geom IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pn_tags      ON places_narration USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_pn_payload   ON places_narration USING GIN(payload);

COMMENT ON TABLE  places_narration IS 'All quiet narrative — fichas plus depictions and interactions — over a mute gazetteer (ADR-0014, normalized #106)';
COMMENT ON COLUMN places_narration.kind IS 'place | ambient | arrival | lore | depiction | interaction';
COMMENT ON COLUMN places_narration.action IS 'interaction family discriminator: rest (overnight) | offer (#106)';
COMMENT ON COLUMN places_narration.description IS 'Canonical flat prose {en, es}; fichas carry their spec in payload instead (#106)';
COMMENT ON COLUMN places_narration.variants IS 'Array of {key|id, phrases|text, condition?}; keyed variants + conditional ficha variants (#106)';
COMMENT ON COLUMN places_narration.mechanics IS 'Numeric effects: rest_quality, shadow_effect, future mechanics (#106)';
COMMENT ON COLUMN places_narration.refs IS 'Authored feature bindings {table-key: [ids]}; materializes to depiction_id (#106)';
COMMENT ON COLUMN places_narration.location_id IS 'Hosted-at anchor to a gazetteer location; NULL until positioned';
COMMENT ON COLUMN places_narration.place_ref IS 'Offer → parent record id (no FK: payload-first records)';
COMMENT ON COLUMN places_narration.region_id IS 'Primary region (first of payload.region_ids); scope region for depictions';
COMMENT ON COLUMN places_narration.cultural_family IS 'Scope dimension for generic records (from places_interactions)';
COMMENT ON COLUMN places_narration.priority IS 'Tie-breaker when several records match a scope';
COMMENT ON COLUMN places_narration.geom IS 'Deprecated: position is always borrowed (location_id / feature depiction_id). Kept until the final drop (#104)';
COMMENT ON COLUMN places_narration.size_radius_km IS 'Within it the traveller is AT the place (variants/secret/options)';
COMMENT ON COLUMN places_narration.influence_radius_km IS 'Within it the place is askable and felt from afar';
COMMENT ON COLUMN places_narration.payload IS 'Kind-unique spec only: ficha base/sections/beats/options/secret, region rotation/facts, provenance (#106)';
