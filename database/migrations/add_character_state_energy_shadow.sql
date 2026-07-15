-- Migration: character_state energy + shadow, entities.shadow_weight, character_state_log
-- Date: 2026-07-15
-- Description:
--   - Adds energy/shadow (live) and energy_initial/shadow_initial (per-character
--     starting values) plus last_rest_at to character_state.
--   - Adds a signed shadow_weight column to entities.
--   - Creates character_state_log (per-day trail for the curve / causal callbacks).
--   - Sets base-template starting values (Aranath 100/0, Celebrian 100/20) and
--     backfills existing clones from their template's initial values.
-- Idempotent: safe to run multiple times.

-- ---------------------------------------------------------------------------
-- 1. character_state columns
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'character_state' AND column_name = 'energy') THEN
        ALTER TABLE character_state ADD COLUMN energy INT NOT NULL DEFAULT 100;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'character_state' AND column_name = 'shadow') THEN
        ALTER TABLE character_state ADD COLUMN shadow INT NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'character_state' AND column_name = 'energy_initial') THEN
        ALTER TABLE character_state ADD COLUMN energy_initial INT NOT NULL DEFAULT 100;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'character_state' AND column_name = 'shadow_initial') THEN
        ALTER TABLE character_state ADD COLUMN shadow_initial INT NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'character_state' AND column_name = 'last_rest_at') THEN
        ALTER TABLE character_state ADD COLUMN last_rest_at TIMESTAMP;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. entities.shadow_weight
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'entities' AND column_name = 'shadow_weight') THEN
        ALTER TABLE entities ADD COLUMN shadow_weight INT NOT NULL DEFAULT 0;
        COMMENT ON COLUMN entities.shadow_weight IS
          'Signed per-entity spirit effect: positive darkens, zero neutral, negative lightens.';
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. character_state_log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS character_state_log (
    id           SERIAL PRIMARY KEY,
    character_id INT  NOT NULL REFERENCES character_state(id),
    trip_id      UUID NOT NULL,
    day_number   INT  NOT NULL,
    energy       INT  NOT NULL,
    shadow       INT  NOT NULL,
    note         TEXT,
    created_at   TIMESTAMP DEFAULT NOW(),
    UNIQUE (character_id, trip_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_character_state_log_char
    ON character_state_log(character_id, trip_id, day_number);

-- ---------------------------------------------------------------------------
-- 4. Base-template starting values (per-character, as designed)
--    Aranath (template id 1): 100 / 0  — hale, clear-hearted ranger.
--    Celebrian (template id 2): 100 / 20 — sombre by design, begins carrying shadow.
-- ---------------------------------------------------------------------------
UPDATE character_state
   SET energy_initial = 100, shadow_initial = 0,
       energy = 100, shadow = 0
 WHERE id = 1 AND template_id IS NULL AND owner_user_id IS NULL;

UPDATE character_state
   SET energy_initial = 100, shadow_initial = 20,
       energy = 100, shadow = 20
 WHERE id = 2 AND template_id IS NULL AND owner_user_id IS NULL;

-- ---------------------------------------------------------------------------
-- 5. Backfill existing clones from their template's initial values.
--    (Clones created before this feature default to 100/0; align them with
--    their template's designed starting values.)
-- ---------------------------------------------------------------------------
UPDATE character_state c
   SET energy = t.energy_initial,
       shadow = t.shadow_initial,
       energy_initial = t.energy_initial,
       shadow_initial = t.shadow_initial
  FROM character_state t
 WHERE c.template_id = t.id
   AND c.template_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
SELECT id, name, template_id, owner_user_id, energy, shadow, energy_initial, shadow_initial
FROM character_state
ORDER BY id
LIMIT 20;

SELECT COUNT(*) AS entities_with_shadow_weight
FROM information_schema.columns
WHERE table_name = 'entities' AND column_name = 'shadow_weight';
