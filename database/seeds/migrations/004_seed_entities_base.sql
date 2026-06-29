-- Migration: Seed entities base data (Fixed Version)
-- Date: 2026-06-29
-- Description: Load entities master data from CSV seed file with robust error handling

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
    created_at TEXT
);

-- Import data from CSV file
COPY temp_entities(id, name, slug, type, active, tier, parent_id, description, description_summary, url_path, biomes, created_at)
FROM '/Users/christiankarldelhey/Documents/Middle Earth Map/database/seeds/data/csv/entities.csv'
DELIMITER ','
CSV HEADER
QUOTE '"';

-- Clean up data: remove rows with invalid UUIDs
DELETE FROM temp_entities WHERE id IS NULL OR id = '' OR id = '""' OR trim(id) = '';

-- Insert into main table using a more robust approach
DO $$
DECLARE
    entity_record RECORD;
    entity_uuid UUID;
    parent_uuid UUID;
    biomes_array TEXT[];
    created_timestamp TIMESTAMP;
BEGIN
    FOR entity_record IN SELECT * FROM temp_entities
    LOOP
        -- Parse UUID safely
        BEGIN
            entity_uuid := entity_record.id::UUID;
        EXCEPTION WHEN OTHERS THEN
            CONTINUE; -- Skip invalid UUIDs
        END;
        
        -- Parse parent UUID safely
        parent_uuid := NULL;
        IF entity_record.parent_id IS NOT NULL AND trim(entity_record.parent_id) != '' AND entity_record.parent_id != '""' THEN
            BEGIN
                parent_uuid := entity_record.parent_id::UUID;
            EXCEPTION WHEN OTHERS THEN
                parent_uuid := NULL;
            END;
        END IF;
        
        -- Parse biomes array safely
        biomes_array := NULL;
        IF entity_record.biomes IS NOT NULL AND trim(entity_record.biomes) != '' AND entity_record.biomes != '""' THEN
            BEGIN
                biomes_array := entity_record.biomes::TEXT[];
            EXCEPTION WHEN OTHERS THEN
                biomes_array := NULL;
            END;
        END IF;
        
        -- Parse timestamp safely
        created_timestamp := NOW();
        IF entity_record.created_at IS NOT NULL AND trim(entity_record.created_at) != '' AND entity_record.created_at != '""' THEN
            BEGIN
                created_timestamp := entity_record.created_at::TIMESTAMP;
            EXCEPTION WHEN OTHERS THEN
                created_timestamp := NOW();
            END;
        END IF;
        
        -- Insert entity
        INSERT INTO entities (
            id, name, slug, type, active, tier, parent_id, 
            description, description_summary, url_path, biomes, created_at
        ) VALUES (
            entity_uuid,
            entity_record.name,
            entity_record.slug,
            entity_record.type,
            entity_record.active,
            entity_record.tier,
            parent_uuid,
            entity_record.description,
            entity_record.description_summary,
            entity_record.url_path,
            biomes_array,
            created_timestamp
        ) ON CONFLICT (id) DO UPDATE SET
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
            
    END LOOP;
END $$;

-- Verification
SELECT 'entities' AS table_name, COUNT(*) AS rows_loaded FROM entities;
