-- Migration: depiction_id on geometry tables
-- Date: 2026-11-13
-- Description: ADR-0014 — the described-as link. Every gazetteer feature may
--              point at the single narration record that depicts it
--              (1:1 per feature, N:1 per record — e.g. all East Road
--              segments share one ficha). Materialized from payload.refs
--              by the seed; ON DELETE SET NULL drops the link, never the
--              feature. Prose columns on these tables migrate to records
--              in later issues (#98, #99).
--              See docs/adr/0014 and backend/CONTEXT.md ("depiction_id").

ALTER TABLE locations ADD COLUMN IF NOT EXISTS depiction_id TEXT;
ALTER TABLE water     ADD COLUMN IF NOT EXISTS depiction_id TEXT;
ALTER TABLE biomes    ADD COLUMN IF NOT EXISTS depiction_id TEXT;
ALTER TABLE roads     ADD COLUMN IF NOT EXISTS depiction_id TEXT;
ALTER TABLE regions   ADD COLUMN IF NOT EXISTS depiction_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'locations_depiction_id_fkey') THEN
    ALTER TABLE locations ADD CONSTRAINT locations_depiction_id_fkey
      FOREIGN KEY (depiction_id) REFERENCES places_narration(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'water_depiction_id_fkey') THEN
    ALTER TABLE water ADD CONSTRAINT water_depiction_id_fkey
      FOREIGN KEY (depiction_id) REFERENCES places_narration(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'biomes_depiction_id_fkey') THEN
    ALTER TABLE biomes ADD CONSTRAINT biomes_depiction_id_fkey
      FOREIGN KEY (depiction_id) REFERENCES places_narration(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roads_depiction_id_fkey') THEN
    ALTER TABLE roads ADD CONSTRAINT roads_depiction_id_fkey
      FOREIGN KEY (depiction_id) REFERENCES places_narration(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'regions_depiction_id_fkey') THEN
    ALTER TABLE regions ADD CONSTRAINT regions_depiction_id_fkey
      FOREIGN KEY (depiction_id) REFERENCES places_narration(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_locations_depiction ON locations(depiction_id) WHERE depiction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_water_depiction     ON water(depiction_id)     WHERE depiction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_biomes_depiction    ON biomes(depiction_id)    WHERE depiction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_roads_depiction     ON roads(depiction_id)     WHERE depiction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_regions_depiction   ON regions(depiction_id)   WHERE depiction_id IS NOT NULL;

COMMENT ON COLUMN locations.depiction_id IS 'The narration record depicting this feature (ADR-0014)';
COMMENT ON COLUMN water.depiction_id     IS 'The narration record depicting this feature (ADR-0014)';
COMMENT ON COLUMN biomes.depiction_id    IS 'The narration record depicting this feature (ADR-0014)';
COMMENT ON COLUMN roads.depiction_id     IS 'The narration record depicting this feature (ADR-0014)';
COMMENT ON COLUMN regions.depiction_id   IS 'The narration record depicting this feature (ADR-0014)';
