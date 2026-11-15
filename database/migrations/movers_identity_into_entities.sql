-- ============================================================================
-- Migration: Mover identity moves from `movers` into `entities`
-- ============================================================================
-- A mover is a being with an agenda — the being row lives in `entities`
-- (tier='mover'), the agenda stays in mover_legs/mover_beats/mover_trails.
-- The `movers` table loses its reason to exist and is dropped.
--
-- SAFE ORDERING: legs are regenerated wholesale on every seed ("seed data is
-- rebuilt per deploy"), so the migration wipes them and lets the seed that
-- runs right after re-insert them pointing at entity ids. Old mover uuids
-- are intentionally discarded — they were never referenced outside legs.
-- Idempotent: safe to run on every deploy.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'mover_legs' AND column_name = 'mover_id') THEN
    ALTER TABLE mover_legs RENAME COLUMN mover_id TO entity_id;
  END IF;
END $$;

-- Regenerated data: drop stale rows so the new FK never validates dead refs.
DELETE FROM mover_legs;

ALTER TABLE mover_legs DROP CONSTRAINT IF EXISTS mover_legs_mover_id_fkey;
ALTER TABLE mover_legs DROP CONSTRAINT IF EXISTS mover_legs_entity_id_fkey;
ALTER TABLE mover_legs
    ADD CONSTRAINT mover_legs_entity_id_fkey
    FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE;

-- Names that kept the old column name — cosmetic but keeps dumps readable.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_mover_legs_mover') THEN
    ALTER INDEX idx_mover_legs_mover RENAME TO idx_mover_legs_entity;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mover_legs_mover_id_leg_index_key') THEN
    ALTER TABLE mover_legs RENAME CONSTRAINT mover_legs_mover_id_leg_index_key TO mover_legs_entity_id_leg_index_key;
  END IF;
END $$;

DROP TABLE IF EXISTS movers;

COMMENT ON TABLE mover_legs IS 'Legs of a mover story: march / presence / resident, each with its own window, visibility, trace and beats. Identity lives in entities (tier=mover).';
COMMENT ON COLUMN mover_legs.entity_id IS 'The being this leg schedules — FK to entities (tier=mover)';
