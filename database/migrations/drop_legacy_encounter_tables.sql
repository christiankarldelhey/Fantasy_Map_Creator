-- ============================================================================
-- Migration: drop the legacy encounter/narration tables
-- ============================================================================
-- DESTRUCTIVE — run a verified pg_dump first; no rollback other than restore.
--
-- Everything these held now lives in entities_narration (kind entity/form/
-- contact) or in entities (mover identity) — the resolver reads nothing else.
--
--   encounter_forms   → entities_narration kind='form' (weight/intensity/
--                       danger/triggers_roll + prose in aspect)
--   npc_interactions  → entities_narration kind='contact' (disposition,
--                       presence, interactive, facts, race:* tags)
--   mover_beats       → leg contacts' variants + leg mechanics in mover_legs
--   entities.description / description_summary
--                     → entities_narration kind='entity' (lore / aspect)
--   mover_legs.trace  → the leg contact's aspect in entities_narration
--
-- Idempotent: safe to run on every deploy.
-- ============================================================================

DROP TABLE IF EXISTS encounter_forms;
DROP TABLE IF EXISTS npc_interactions;
DROP TABLE IF EXISTS mover_beats;
-- Pre-rename ancestor of encounter_forms — a very old DB may still have it.
-- Shape-guarded: `interactions` is reclaimed by the Situation→Interaction
-- table (ADR-0019); only drop when it is NOT that table (no `act` column).
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'interactions')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = 'public' AND table_name = 'interactions'
                         AND column_name = 'act')
    THEN
        DROP TABLE interactions;
    END IF;
END $$;

ALTER TABLE entities
    DROP COLUMN IF EXISTS description,
    DROP COLUMN IF EXISTS description_summary;

-- mover_legs.trace duplicated into the leg contact's aspect — legs keep
-- only schedule mechanics.
ALTER TABLE mover_legs DROP COLUMN IF EXISTS trace;
