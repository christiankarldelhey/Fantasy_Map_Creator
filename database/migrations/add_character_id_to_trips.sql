-- Migration: Add character_id to trips table
-- Date: 2026-07-09
-- Description: Add character_id column to trips table to link trips to characters
--              This column was added manually to local DB but needs formal migration for production

-- Drop existing column if it exists with wrong type
ALTER TABLE trips DROP COLUMN IF EXISTS character_id;

-- Add character_id column as INTEGER to match character_state.id type
ALTER TABLE trips ADD COLUMN character_id INTEGER;

-- Add foreign key constraint
ALTER TABLE trips
ADD CONSTRAINT trips_character_id_fkey
FOREIGN KEY (character_id) REFERENCES character_state(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN trips.character_id IS 'Reference to the character_state table for the character associated with this trip';

-- Verification
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'trips' AND column_name = 'character_id';
