-- Migration: Add active column to entities table and import from CSV
-- Date: 2026-06-19
-- Description: Adds 'active' column to track entity activity patterns and imports data from entities_2130 (1).csv

-- Step 1: Add the active column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'entities' AND column_name = 'active'
    ) THEN
        ALTER TABLE entities ADD COLUMN active VARCHAR(50) DEFAULT 'all-day';
        COMMENT ON COLUMN entities.active IS 'Activity pattern: day, night, or all-day';
    END IF;
END $$;

-- Step 2: Create a temporary table for CSV import
DROP TABLE IF EXISTS temp_entities_import;

CREATE TABLE temp_entities_import (
    id UUID,
    name VARCHAR(255),
    slug VARCHAR(255),
    type VARCHAR(50),
    active VARCHAR(50),
    description TEXT,
    url_path TEXT,
    biomes TEXT,
    created_at TIMESTAMP,
    region_ids TEXT,
    tier VARCHAR(50),
    parent_id UUID,
    probability_by_region JSONB
);

-- Step 3: Import CSV data
-- Note: This requires the CSV file to be accessible by the PostgreSQL server
-- Adjust the path to match your server's file system
COPY temp_entities_import(
    id, name, slug, type, active, description, url_path, biomes, 
    created_at, region_ids, tier, parent_id, probability_by_region
)
FROM '/Users/christiankarldelhey/Documents/Middle Earth Map/data_public/entities_2130 (1).csv'
DELIMITER ','
CSV HEADER
QUOTE '"';

-- Step 4: Clear existing entities data (optional - remove if you want to keep existing data)
TRUNCATE TABLE entities RESTART IDENTITY CASCADE;

-- Step 5: Insert data from temp table to entities table
INSERT INTO entities (
    id, name, slug, type, active, description, url_path, 
    biomes, created_at, region_ids, tier, parent_id, probability_by_region
)
SELECT 
    id,
    name,
    slug,
    type,
    active,
    description,
    url_path,
    -- Parse biomes from string to array
    CASE 
        WHEN biomes = '' THEN NULL
        WHEN biomes LIKE '{%}' THEN biomes::TEXT[]
        ELSE ARRAY[biomes]
    END,
    created_at,
    -- Parse region_ids from string to integer array
    CASE 
        WHEN region_ids = '' THEN NULL
        WHEN region_ids LIKE '{%}' THEN region_ids::INTEGER[]
        ELSE NULL
    END,
    tier,
    parent_id,
    probability_by_region
FROM temp_entities_import;

-- Step 6: Drop temporary table
DROP TABLE temp_entities_import;

-- Step 7: Verify import
SELECT COUNT(*) as total_entities FROM entities;
