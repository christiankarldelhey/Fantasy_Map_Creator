-- Migration: Character skills (0-10) + persistent conditions (fatigue, wounded, sick)
-- Date: 2026-08-17
-- Description:
--   - Adds five skill columns (0-10) to character_state: tracking, persuasion,
--     ranged, melee, lore.
--   - Adds fatigue (0-100), wounded (none|wounded|badly_wounded), sick (bool)
--     as persistent conditions, separate from the day's one-off wound cost.
--   - Adds fatigue/wounded to character_state_log for per-day history.
--   - Seeds balanced starting skill values for the two base templates
--     (Aranath: ranger/tracker; Celebrian: contemplative/lore).
--   - Backfills existing clones from their template's skill values.
-- Idempotent: safe to run multiple times.

-- ---------------------------------------------------------------------------
-- 1. character_state: skill columns
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'character_state' AND column_name = 'skill_tracking') THEN
        ALTER TABLE character_state ADD COLUMN skill_tracking INT NOT NULL DEFAULT 0
            CHECK (skill_tracking BETWEEN 0 AND 10);
        COMMENT ON COLUMN character_state.skill_tracking IS
          'Ability to follow tracks/spoor (0=useless, 10=expert). Also aids hunting.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'character_state' AND column_name = 'skill_persuasion') THEN
        ALTER TABLE character_state ADD COLUMN skill_persuasion INT NOT NULL DEFAULT 0
            CHECK (skill_persuasion BETWEEN 0 AND 10);
        COMMENT ON COLUMN character_state.skill_persuasion IS
          'Ability to talk one''s way out of trouble or convince others (0-10).';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'character_state' AND column_name = 'skill_ranged') THEN
        ALTER TABLE character_state ADD COLUMN skill_ranged INT NOT NULL DEFAULT 0
            CHECK (skill_ranged BETWEEN 0 AND 10);
        COMMENT ON COLUMN character_state.skill_ranged IS
          'Ranged attack skill (bow and arrow). Also aids hunting (0-10).';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'character_state' AND column_name = 'skill_melee') THEN
        ALTER TABLE character_state ADD COLUMN skill_melee INT NOT NULL DEFAULT 0
            CHECK (skill_melee BETWEEN 0 AND 10);
        COMMENT ON COLUMN character_state.skill_melee IS
          'Close-quarters combat skill, generally with bladed weapons (0-10).';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'character_state' AND column_name = 'skill_lore') THEN
        ALTER TABLE character_state ADD COLUMN skill_lore INT NOT NULL DEFAULT 0
            CHECK (skill_lore BETWEEN 0 AND 10);
        COMMENT ON COLUMN character_state.skill_lore IS
          'General knowledge of Middle-earth, used for context and informed decisions (0-10).';
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. character_state: persistent conditions (causes behind energy, distinct
--    from the day's one-off wound cost already handled by WOUND_COSTS).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'character_state' AND column_name = 'fatigue') THEN
        ALTER TABLE character_state ADD COLUMN fatigue INT NOT NULL DEFAULT 0
            CHECK (fatigue BETWEEN 0 AND 100);
        COMMENT ON COLUMN character_state.fatigue IS
          'Accumulated physical tiredness (0-100): rises with distance/combat/poor sleep, falls with quality rest.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'character_state' AND column_name = 'wounded') THEN
        ALTER TABLE character_state ADD COLUMN wounded TEXT NOT NULL DEFAULT 'none'
            CHECK (wounded IN ('none', 'wounded', 'badly_wounded'));
        COMMENT ON COLUMN character_state.wounded IS
          'Persistent injury state, distinct from the one-off wound energy cost. Heals with quality rest over time.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'character_state' AND column_name = 'sick') THEN
        ALTER TABLE character_state ADD COLUMN sick BOOLEAN NOT NULL DEFAULT false;
        COMMENT ON COLUMN character_state.sick IS
          'Reserved for future illness mechanics; not yet driven by any code path.';
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. character_state_log: per-day condition history (mirrors energy/shadow)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'character_state_log' AND column_name = 'fatigue') THEN
        ALTER TABLE character_state_log ADD COLUMN fatigue INT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'character_state_log' AND column_name = 'wounded') THEN
        ALTER TABLE character_state_log ADD COLUMN wounded TEXT;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Base-template balanced skill seeds (as designed):
--    Aranath (template id 1): ranger/rastreador silencioso, strong in
--      tracking/melee/ranged, low persuasion, modest lore. Total = 24.
--    Celebrian (template id 2): contemplative, perceptive, non-combatant,
--      strong in lore/persuasion, low tracking/ranged/melee. Total = 20.
-- ---------------------------------------------------------------------------
UPDATE character_state
   SET skill_tracking = 7, skill_persuasion = 3, skill_ranged = 5, skill_melee = 6, skill_lore = 3
 WHERE id = 1 AND template_id IS NULL AND owner_user_id IS NULL;

UPDATE character_state
   SET skill_tracking = 3, skill_persuasion = 5, skill_ranged = 2, skill_melee = 2, skill_lore = 8
 WHERE id = 2 AND template_id IS NULL AND owner_user_id IS NULL;

-- ---------------------------------------------------------------------------
-- 5. Backfill existing clones from their template's skill values.
-- ---------------------------------------------------------------------------
UPDATE character_state c
   SET skill_tracking = t.skill_tracking,
       skill_persuasion = t.skill_persuasion,
       skill_ranged = t.skill_ranged,
       skill_melee = t.skill_melee,
       skill_lore = t.skill_lore
  FROM character_state t
 WHERE c.template_id = t.id
   AND c.template_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
SELECT id, name, template_id, owner_user_id,
       skill_tracking, skill_persuasion, skill_ranged, skill_melee, skill_lore,
       fatigue, wounded, sick
FROM character_state
ORDER BY id
LIMIT 20;
