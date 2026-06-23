-- Migration: Add active, type, and gender columns to character_state table
-- Date: 2026-06-23
-- Description: Adds columns to support multiple characters with active/inactive states

-- Step 1: Add columns to character_state table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'character_state' AND column_name = 'active') THEN
        ALTER TABLE character_state ADD COLUMN active BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'character_state' AND column_name = 'type') THEN
        ALTER TABLE character_state ADD COLUMN type VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'character_state' AND column_name = 'gender') THEN
        ALTER TABLE character_state ADD COLUMN gender VARCHAR(20);
    END IF;
END $$;

-- Step 2: Add comments
COMMENT ON COLUMN character_state.active IS 'Whether this character is currently active (only one can be active at a time)';
COMMENT ON COLUMN character_state.type IS 'Character type (e.g., Noldor, Sindar, Human, Dwarf)';
COMMENT ON COLUMN character_state.gender IS 'Character gender (male, female)';

-- Step 3: Set Aranath as active initially
UPDATE character_state 
SET active = true, type = 'Human', gender = 'male'
WHERE name = 'Aranath';

-- Step 4: Verify migration
SELECT 
    id, 
    name, 
    type, 
    gender, 
    active 
FROM character_state;
