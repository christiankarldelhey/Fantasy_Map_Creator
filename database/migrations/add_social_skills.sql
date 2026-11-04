-- Migration: Add social skills to character_state
-- Date: 2026-10-30
-- Description:
--   - Adds skill_insight (0-10): reading people and intent.
--   - Adds skill_deception (0-10): lying, disguise, misdirection.
--   - Adds skill_intimidation (0-10): fear as a social tool.
--   All three are mind-influenced (shadow-affected in skill checks), like
--   persuasion and lore.
--   - Seeds balanced starting values for the two base templates:
--       Aranath  (id 1): insight 5, deception 3, intimidation 5
--       Celebrian (id 2): insight 7, deception 4, intimidation 2
--   - Backfills existing clones from their template's values.
-- Idempotent: safe to run multiple times.

-- ---------------------------------------------------------------------------
-- 1. character_state: new skill columns
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'character_state' AND column_name = 'skill_insight') THEN
        ALTER TABLE character_state ADD COLUMN skill_insight INT NOT NULL DEFAULT 0
            CHECK (skill_insight BETWEEN 0 AND 10);
        COMMENT ON COLUMN character_state.skill_insight IS
          'Reading people and intent (0=oblivious, 10=sees through anyone). Social skill, shadow-affected.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'character_state' AND column_name = 'skill_deception') THEN
        ALTER TABLE character_state ADD COLUMN skill_deception INT NOT NULL DEFAULT 0
            CHECK (skill_deception BETWEEN 0 AND 10);
        COMMENT ON COLUMN character_state.skill_deception IS
          'Lying, disguise, misdirection (0=transparent, 10=master liar). Social skill, shadow-affected.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'character_state' AND column_name = 'skill_intimidation') THEN
        ALTER TABLE character_state ADD COLUMN skill_intimidation INT NOT NULL DEFAULT 0
            CHECK (skill_intimidation BETWEEN 0 AND 10);
        COMMENT ON COLUMN character_state.skill_intimidation IS
          'Fear as a social tool (0=harmless, 10=terrifying). Social skill, shadow-affected.';
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Base-template skill seeds
--    Aranath  (template id 1): insight 5, deception 3, intimidation 5
--    Celebrian (template id 2): insight 7, deception 4, intimidation 2
-- ---------------------------------------------------------------------------
UPDATE character_state
   SET skill_insight = 5, skill_deception = 3, skill_intimidation = 5
 WHERE id = 1 AND template_id IS NULL AND owner_user_id IS NULL;

UPDATE character_state
   SET skill_insight = 7, skill_deception = 4, skill_intimidation = 2
 WHERE id = 2 AND template_id IS NULL AND owner_user_id IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Backfill existing clones from their template's skill values.
-- ---------------------------------------------------------------------------
UPDATE character_state c
   SET skill_insight = t.skill_insight,
       skill_deception = t.skill_deception,
       skill_intimidation = t.skill_intimidation
  FROM character_state t
 WHERE c.template_id = t.id
   AND c.template_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
SELECT id, name, template_id, owner_user_id,
       skill_insight, skill_deception, skill_intimidation
FROM character_state
ORDER BY id
LIMIT 20;
