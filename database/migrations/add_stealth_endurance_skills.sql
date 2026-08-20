-- Migration: Add stealth & endurance skills to character_state
-- Date: 2026-08-20
-- Description:
--   - Adds skill_stealth (0-10): ability to hide and move silently.
--   - Adds skill_endurance (0-10): resistance to sleep deprivation, hunger
--     and thirst. Mind-influenced (shadow-affected in skill checks).
--   - Seeds balanced starting values for the two base templates:
--       Aranath  (id 1): stealth 7, endurance 6
--       Celebrian (id 2): stealth 9, endurance 9
--   - Backfills existing clones from their template's values.
-- Idempotent: safe to run multiple times.

-- ---------------------------------------------------------------------------
-- 1. character_state: new skill columns
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'character_state' AND column_name = 'skill_stealth') THEN
        ALTER TABLE character_state ADD COLUMN skill_stealth INT NOT NULL DEFAULT 0
            CHECK (skill_stealth BETWEEN 0 AND 10);
        COMMENT ON COLUMN character_state.skill_stealth IS
          'Ability to hide and move silently (0=clumsy, 10=ghost). Physical skill.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'character_state' AND column_name = 'skill_endurance') THEN
        ALTER TABLE character_state ADD COLUMN skill_endurance INT NOT NULL DEFAULT 0
            CHECK (skill_endurance BETWEEN 0 AND 10);
        COMMENT ON COLUMN character_state.skill_endurance IS
          'Resistance to sleep deprivation, hunger and thirst (0-10). Mind-influenced (shadow-affected).';
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Base-template skill seeds
--    Aranath  (template id 1): stealth 7, endurance 6
--    Celebrian (template id 2): stealth 9, endurance 9
-- ---------------------------------------------------------------------------
UPDATE character_state
   SET skill_stealth = 7, skill_endurance = 6
 WHERE id = 1 AND template_id IS NULL AND owner_user_id IS NULL;

UPDATE character_state
   SET skill_stealth = 9, skill_endurance = 9
 WHERE id = 2 AND template_id IS NULL AND owner_user_id IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Backfill existing clones from their template's skill values.
-- ---------------------------------------------------------------------------
UPDATE character_state c
   SET skill_stealth = t.skill_stealth,
       skill_endurance = t.skill_endurance
  FROM character_state t
 WHERE c.template_id = t.id
   AND c.template_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
SELECT id, name, template_id, owner_user_id,
       skill_stealth, skill_endurance
FROM character_state
ORDER BY id
LIMIT 20;
