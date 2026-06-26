-- Migration: Add resistance + permadeath to character_state, status to trips
-- Date: 2026-06-26

DO $$
BEGIN
    -- resistance: character stat used in encounter rolls (0 = no bonus)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'character_state' AND column_name = 'resistance'
    ) THEN
        ALTER TABLE character_state ADD COLUMN resistance INT NOT NULL DEFAULT 0;
        COMMENT ON COLUMN character_state.resistance IS
          'Bonus added to resistance rolls (d20 + resistance vs threshold). Default 0.';
    END IF;

    -- permadeath: if true, a "slain" outcome ends the trip permanently
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'character_state' AND column_name = 'permadeath'
    ) THEN
        ALTER TABLE character_state ADD COLUMN permadeath BOOLEAN NOT NULL DEFAULT false;
        COMMENT ON COLUMN character_state.permadeath IS
          'If true, a slain outcome sets trips.status = ''dead'' and ends the journey.';
    END IF;
END $$;

-- status column on trips: active | dead | completed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'trips' AND column_name = 'status'
    ) THEN
        ALTER TABLE trips ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
            CHECK (status IN ('active', 'dead', 'completed'));
        COMMENT ON COLUMN trips.status IS
          'active = ongoing; dead = traveller slain (permadeath); completed = reached destination.';
    END IF;
END $$;

-- Verification
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name IN ('character_state', 'trips')
  AND column_name IN ('resistance', 'permadeath', 'status')
ORDER BY table_name, column_name;
