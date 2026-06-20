-- Migration: Update biomes column from entities_2130 (3).csv
-- Date: 2026-06-20
-- Description: Updates the biomes column in entities table with data from the updated CSV

-- Step 1: Create a temporary table for CSV import
DROP TABLE IF EXISTS temp_biomes_update;

CREATE TABLE temp_biomes_update (
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

-- Step 2: Import CSV data
COPY temp_biomes_update(
    id, name, slug, type, active, description, url_path, biomes, 
    created_at, region_ids, tier, parent_id, probability_by_region
)
FROM '/Users/christiankarldelhey/Documents/Middle Earth Map/data_public/entities_2130 (3).csv'
DELIMITER ','
CSV HEADER
QUOTE '"';

-- Step 3: Update biomes in entities table matching by slug
UPDATE entities e
SET biomes = CASE 
    WHEN t.biomes = '' THEN NULL
    WHEN t.biomes LIKE '{%}' THEN t.biomes::TEXT[]
    ELSE ARRAY[t.biomes]
END
FROM temp_biomes_update t
WHERE e.slug = t.slug;

-- Step 4: Verify update
SELECT 
    COUNT(*) as total_updated,
    COUNT(CASE WHEN biomes IS NOT NULL THEN 1 END) as with_biomes,
    COUNT(CASE WHEN biomes IS NULL THEN 1 END) as without_biomes
FROM entities;

-- Step 5: Drop temporary table
DROP TABLE temp_biomes_update;
