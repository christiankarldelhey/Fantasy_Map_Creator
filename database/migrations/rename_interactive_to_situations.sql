-- rename_interactive_to_situations.sql
-- The column no longer holds interactivity — options/commands/outcomes live
-- in the `interactions` table since Wave D. What remains is the authored
-- Situation descriptor store (id, gating tags, when, situation/stance prose),
-- so the column is renamed to say what it is.
--
-- Three possible states on reseed (idempotent):
--   1. only `interactive`   → rename it
--   2. only `situations`    → nothing to do
--   3. both                 → an earlier migration re-added `interactive`
--                             (IF NOT EXISTS); it is empty — drop it.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'places_narration' AND column_name = 'situations') THEN
    ALTER TABLE places_narration DROP COLUMN IF EXISTS interactive;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'places_narration' AND column_name = 'interactive') THEN
    ALTER TABLE places_narration RENAME COLUMN interactive TO situations;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'entities_narration' AND column_name = 'situations') THEN
    ALTER TABLE entities_narration DROP COLUMN IF EXISTS interactive;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'entities_narration' AND column_name = 'interactive') THEN
    ALTER TABLE entities_narration RENAME COLUMN interactive TO situations;
  END IF;
END $$;
