-- Migration: Add description_summary column to entities table and import from CSV
-- Date: 2026-06-25
-- Description: Adds 'description_summary' column and imports data from entities_con_summary_FINAL.csv

-- Step 1: Backup existing entities table
DROP TABLE IF EXISTS entities_backup;
CREATE TABLE entities_backup AS SELECT * FROM entities;

-- Backup character_state before truncation (since it has foreign key to entities)
DROP TABLE IF EXISTS character_state_backup;
CREATE TABLE character_state_backup AS SELECT * FROM character_state;

-- Backup users before truncation (since it has foreign key to character_state)
DROP TABLE IF EXISTS users_backup;
CREATE TABLE users_backup AS SELECT * FROM users;

-- Step 2: Add the description_summary column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'entities' AND column_name = 'description_summary'
    ) THEN
        ALTER TABLE entities ADD COLUMN description_summary TEXT;
        COMMENT ON COLUMN entities.description_summary IS 'Summary description of the entity (used for encounter prompts)';
    END IF;
END $$;

-- Step 3: Create a temporary table for CSV import
DROP TABLE IF EXISTS temp_entities_import;

CREATE TABLE temp_entities_import (
    id UUID,
    name VARCHAR(255),
    slug VARCHAR(255),
    type VARCHAR(50),
    active VARCHAR(50),
    danger INTEGER,
    description TEXT,
    description_summary TEXT,
    url_path TEXT,
    biomes TEXT,
    created_at TIMESTAMP,
    region_ids TEXT,
    tier VARCHAR(50),
    parent_id UUID,
    probability_by_region JSONB
);

-- Step 4: Import CSV data
-- Note: This requires the CSV file to be accessible by the PostgreSQL server
-- Adjust the path to match your server's file system
-- CSV column order: id,name,slug,type,description,url_path,biomes,created_at,region_ids,tier,parent_id,probability_by_region,active,danger,description_summary
COPY temp_entities_import(
    id, name, slug, type, description, url_path, biomes, created_at, region_ids, tier, parent_id, probability_by_region, active, danger, description_summary
)
FROM '/Users/christiankarldelhey/Documents/Middle Earth Map/data_public/entities_con_summary_FINAL.csv'
DELIMITER ','
CSV HEADER
QUOTE '"';

-- Step 5: Clear existing entities data
TRUNCATE TABLE entities RESTART IDENTITY CASCADE;

-- Step 6: Insert data from temp table to entities table
INSERT INTO entities (
    id, name, slug, type, active, danger, description, description_summary, url_path, 
    biomes, created_at, region_ids, tier, parent_id, probability_by_region
)
SELECT 
    id,
    name,
    slug,
    type,
    active,
    danger,
    description,
    description_summary,
    url_path,
    -- Parse biomes from string to array
    CASE 
        WHEN biomes = '' OR biomes = '{NULL}' THEN NULL
        WHEN biomes LIKE '{%}' THEN biomes::TEXT[]
        ELSE ARRAY[biomes]
    END,
    created_at,
    -- Parse region_ids from string to integer array
    CASE 
        WHEN region_ids = '' OR region_ids = '{NULL}' THEN NULL
        WHEN region_ids LIKE '{%}' THEN region_ids::INTEGER[]
        ELSE NULL
    END,
    tier,
    parent_id,
    probability_by_region
FROM temp_entities_import;

-- Step 7: Drop temporary table
DROP TABLE temp_entities_import;

-- Step 8: Verify import
SELECT COUNT(*) as total_entities FROM entities;

-- Step 9: Verify description_summary column values
SELECT 
    COUNT(*) as total_entities,
    COUNT(CASE WHEN description_summary IS NOT NULL THEN 1 END) as entities_with_description_summary,
    COUNT(CASE WHEN description IS NOT NULL THEN 1 END) as entities_with_description
FROM entities;

-- Step 10: Restore character_state from backup
TRUNCATE TABLE character_state;
INSERT INTO character_state SELECT * FROM character_state_backup;

-- Step 11: Restore users from backup
TRUNCATE TABLE users;
INSERT INTO users SELECT * FROM users_backup;

-- Step 12: Drop backup tables
DROP TABLE IF EXISTS character_state_backup;
DROP TABLE IF EXISTS users_backup;
