-- Migration: Seed entities base data
-- Date: 2026-06-29
-- Description: Load entities master data from CSV seed file

-- Create temporary table for CSV import
DROP TABLE IF EXISTS temp_entities;

CREATE TABLE temp_entities (
    id TEXT,
    name VARCHAR(255),
    slug VARCHAR(255),
    type VARCHAR(50),
    active VARCHAR(50),
    tier VARCHAR(50),
    parent_id TEXT,
    description TEXT,
    description_summary TEXT,
    url_path TEXT,
    biomes TEXT,
    created_at TIMESTAMP
);

-- Import data from CSV file
COPY temp_entities(id, name, slug, type, active, tier, parent_id, description, description_summary, url_path, biomes, created_at)
FROM '/Users/christiankarldelhey/Documents/Middle Earth Map/database/seeds/data/csv/entities.csv'
DELIMITER ','
CSV HEADER
QUOTE '"';

-- Clean up data: remove rows with invalid UUIDs
DELETE FROM temp_entities WHERE id IS NULL OR id = '' OR id = '""' OR trim(id) = '';

-- Also clean up invalid timestamps
UPDATE temp_entities SET created_at = NULL WHERE created_at IS NULL OR created_at = '' OR created_at = '""' OR trim(created_at) = '';

-- Insert into main table with robust error handling
INSERT INTO entities (id, name, slug, type, active, tier, parent_id, description, description_summary, url_path, biomes, created_at)
SELECT 
    id::UUID,
    name,
    slug,
    type,
    active,
    tier,
    CASE 
        WHEN parent_id IS NULL OR parent_id = '' OR parent_id = '""' OR trim(parent_id) = '' THEN NULL 
        ELSE parent_id::UUID 
    END,
    description,
    description_summary,
    url_path,
    CASE 
        WHEN biomes IS NULL OR biomes = '' OR biomes = '""' OR trim(biomes) = '' THEN NULL 
        ELSE biomes::TEXT[] 
    END,
    CASE 
        WHEN created_at IS NULL THEN NOW()
        ELSE created_at::TIMESTAMP 
    END
FROM temp_entities
WHERE id IS NOT NULL AND trim(id) != ''
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    type = EXCLUDED.type,
    active = EXCLUDED.active,
    tier = EXCLUDED.tier,
    parent_id = EXCLUDED.parent_id,
    description = EXCLUDED.description,
    description_summary = EXCLUDED.description_summary,
    url_path = EXCLUDED.url_path,
    biomes = EXCLUDED.biomes,
    created_at = EXCLUDED.created_at;

-- Verification
SELECT 'entities' AS table_name, COUNT(*) AS rows_loaded FROM entities;
