-- Migration: Replace character_state table with CSV using UPDATE/INSERT
-- Date: 2026-06-25
-- Description: Replaces character_state data from characters-25-jun.csv without affecting other tables

-- Step 1: Backup current character_state
DROP TABLE IF EXISTS character_state_backup;
CREATE TABLE character_state_backup AS SELECT * FROM character_state;

-- Step 2: Create temporary table for CSV import
DROP TABLE IF EXISTS temp_character_import;

CREATE TABLE temp_character_import (
    id INTEGER,
    name VARCHAR(255),
    current_lng DOUBLE PRECISION,
    current_lat DOUBLE PRECISION,
    updated_at TIMESTAMP,
    description TEXT,
    entity_id UUID,
    active BOOLEAN,
    type VARCHAR(50),
    gender VARCHAR(20),
    system_prompt TEXT,
    introduction_instructions TEXT
);

-- Step 3: Import CSV data
COPY temp_character_import(
    id, name, current_lng, current_lat, updated_at, description, entity_id, active, type, gender, system_prompt, introduction_instructions
)
FROM '/Users/christiankarldelhey/Documents/Middle Earth Map/data_public/characters-25-jun.csv'
DELIMITER ','
CSV HEADER
QUOTE '"';

-- Step 4: Update existing records and insert new ones
-- First, update existing records
UPDATE character_state c
SET 
    name = t.name,
    current_lng = t.current_lng,
    current_lat = t.current_lat,
    updated_at = t.updated_at,
    description = t.description,
    entity_id = t.entity_id,
    active = t.active,
    type = t.type,
    gender = t.gender,
    system_prompt = t.system_prompt,
    introduction_instructions = t.introduction_instructions
FROM temp_character_import t
WHERE c.id = t.id;

-- Then, insert new records
INSERT INTO character_state (
    id, name, current_lng, current_lat, updated_at, description, entity_id, active, type, gender, system_prompt, introduction_instructions
)
SELECT 
    id, name, current_lng, current_lat, updated_at, description, entity_id, active, type, gender, system_prompt, introduction_instructions
FROM temp_character_import t
WHERE NOT EXISTS (
    SELECT 1 FROM character_state c WHERE c.id = t.id
);

-- Step 5: Drop temporary table
DROP TABLE temp_character_import;

-- Step 5b: Ensure any rows that still lack a slug get one derived from name
UPDATE character_state
SET slug = COALESCE(slug, LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '_', 'g')))
WHERE slug IS NULL OR slug = '';

-- Step 6: Verification
SELECT COUNT(*) as total_characters FROM character_state;
SELECT COUNT(*) as backup_characters FROM character_state_backup;
SELECT id, name, slug FROM character_state ORDER BY id;
