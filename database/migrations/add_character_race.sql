-- add_character_race.sql
-- The traveller's people, in the narration vocabulary — the value a
-- `race:*` tag on entities_narration rows gates against. Replaces the
-- slug→race map hardcoded in interactionResolver: any character can now
-- carry a race and hear the content written for their people.
ALTER TABLE character_state
  ADD COLUMN IF NOT EXISTS race TEXT;

COMMENT ON COLUMN character_state.race IS
  'The traveller''s people in the narration vocabulary — gates `race:*` tags on entities_narration (dunedain, elf, ...)';

-- Known templates (matched by name — slug may not exist on older DBs).
UPDATE character_state SET race = 'dunedain' WHERE lower(name) = 'aranath';
UPDATE character_state SET race = 'elf'      WHERE lower(name) IN ('celebrian', 'celebrían');

-- Clones inherit their template's race.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'character_state' AND column_name = 'template_id') THEN
    UPDATE character_state c
       SET race = t.race
      FROM character_state t
     WHERE c.template_id = t.id
       AND c.race IS DISTINCT FROM t.race;
  END IF;
END $$;
