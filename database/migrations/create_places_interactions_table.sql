-- Migration: Create places_interactions table
-- Date: 2026-07-14
-- Description: Stores narrative/mechanical effects for spending time in a place or region.

CREATE TABLE IF NOT EXISTS places_interactions (
  id                SERIAL PRIMARY KEY,
  interaction_type  TEXT    NOT NULL,
  location_id       INTEGER REFERENCES locations(id),
  location_type     TEXT,
  region_id         INTEGER REFERENCES regions(id),
  cultural_family   TEXT,
  title             TEXT,
  description       TEXT    NOT NULL,
  rest_quality      SMALLINT,
  shadow_effect     SMALLINT,
  priority          SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_pi_location  ON places_interactions(interaction_type, location_id);
CREATE INDEX IF NOT EXISTS idx_pi_type_reg  ON places_interactions(interaction_type, location_type, region_id);
CREATE INDEX IF NOT EXISTS idx_pi_type_fam  ON places_interactions(interaction_type, location_type, cultural_family);
CREATE INDEX IF NOT EXISTS idx_pi_region    ON places_interactions(interaction_type, region_id);
CREATE INDEX IF NOT EXISTS idx_pi_family    ON places_interactions(interaction_type, cultural_family);

ALTER TABLE places_interactions
  ADD CONSTRAINT chk_scope CHECK (
     (location_id IS NOT NULL)
  OR (location_type IS NOT NULL AND region_id IS NOT NULL)
  OR (location_type IS NOT NULL AND cultural_family IS NOT NULL)
  OR (location_type IS NOT NULL AND region_id IS NULL AND cultural_family IS NULL)
  OR (location_type IS NULL AND region_id IS NOT NULL)
  OR (location_type IS NULL AND cultural_family IS NOT NULL)
  );

COMMENT ON TABLE places_interactions IS 'Narrative and mechanical effects for place/region interactions (overnight, market, etc.)';
COMMENT ON COLUMN places_interactions.interaction_type IS 'Kind of interaction; overnight is the first use case';
COMMENT ON COLUMN places_interactions.rest_quality IS 'Energy recovery level: 0 none, 3 full';
COMMENT ON COLUMN places_interactions.shadow_effect IS 'Shadow stat shift: negative lowers, positive raises';
COMMENT ON COLUMN places_interactions.priority IS 'Higher values win on ties during resolution';
