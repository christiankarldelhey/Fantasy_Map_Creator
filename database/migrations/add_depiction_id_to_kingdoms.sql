-- Migration: depiction_id on kingdoms
-- Date: 2026-11-13
-- Description: ADR-0014 — kingdoms are not a geometry table but belong to the
--              same mute-gazetteer family: id + name + depiction_id → their
--              kind='kingdom' record. Resolver path: regions.kingdom_id →
--              kingdoms.depiction_id → narration.

ALTER TABLE kingdoms ADD COLUMN IF NOT EXISTS depiction_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kingdoms_depiction_id_fkey') THEN
    ALTER TABLE kingdoms ADD CONSTRAINT kingdoms_depiction_id_fkey
      FOREIGN KEY (depiction_id) REFERENCES places_narration(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_kingdoms_depiction ON kingdoms(depiction_id) WHERE depiction_id IS NOT NULL;

COMMENT ON COLUMN kingdoms.depiction_id IS 'The narration record depicting this kingdom (ADR-0014)';
