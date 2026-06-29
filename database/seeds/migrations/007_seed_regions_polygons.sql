-- Migration: Seed regions data with polygon geometries
-- Date: 2026-06-29
-- Description: Load regions master data with polygon geometries from GeoJSON seed file

-- Create temporary table for GeoJSON import
DROP TABLE IF EXISTS temp_regions;

CREATE TABLE temp_regions (
    id INTEGER,
    name VARCHAR(255),
    region_type VARCHAR(50),
    kingdom_id INTEGER,
    climate_zone_id INTEGER,
    description_text TEXT,
    description_summary TEXT,
    area_km2 DECIMAL,
    distance_for_encounter INTEGER,
    chance_of_encounter DECIMAL(5,2),
    hours_to_encounter DECIMAL(5,2),
    geom GEOMETRY(Polygon, 4326)
);

-- Import and process GeoJSON data
DO $$
DECLARE
    geojson_data JSON;
    feature JSON;
    properties JSON;
    geometry JSON;
    feature_count INTEGER := 0;
BEGIN
    -- Read GeoJSON file
    geojson_data := (
        SELECT pg_read_file('/Users/christiankarldelhey/Documents/Middle Earth Map/database/seeds/data/geojson/regions.geojson')
    )::JSON;
    
    -- Process each feature
    FOR feature IN SELECT * FROM json_array_elements(geojson_data->'features')
    LOOP
        properties := feature->'properties';
        geometry := feature->'geometry';
        
        -- Insert into temporary table
        INSERT INTO temp_regions (
            id, name, region_type, kingdom_id, climate_zone_id,
            description_text, description_summary, area_km2,
            distance_for_encounter, chance_of_encounter, hours_to_encounter,
            geom
        ) VALUES (
            (properties->>'id')::INTEGER,
            properties->>'name',
            properties->>'region_type',
            CASE WHEN properties->>'kingdom_id' = '' THEN NULL ELSE (properties->>'kingdom_id')::INTEGER END,
            CASE WHEN properties->>'climate_zone_id' = '' THEN NULL ELSE (properties->>'climate_zone_id')::INTEGER END,
            properties->>'description_text',
            properties->>'description_summary',
            CASE WHEN properties->>'area_km2' = '' THEN NULL ELSE (properties->>'area_km2')::DECIMAL END,
            CASE WHEN properties->>'distance_for_encounter' = '' THEN NULL ELSE (properties->>'distance_for_encounter')::INTEGER END,
            CASE WHEN properties->>'chance_of_encounter' = '' THEN NULL ELSE (properties->>'chance_of_encounter')::DECIMAL(5,2) END,
            CASE WHEN properties->>'hours_to_encounter' = '' THEN NULL ELSE (properties->>'hours_to_encounter')::DECIMAL(5,2) END,
            ST_GeomFromGeoJSON(geometry::text, 4326)
        );
        
        feature_count := feature_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Processed % regions features', feature_count;
END $$;

-- Insert into main table with conflict resolution
INSERT INTO regions (
    id, name, region_type, kingdom_id, climate_zone_id,
    description_text, description_summary, area_km2,
    distance_for_encounter, chance_of_encounter, hours_to_encounter,
    geom, created_at
)
SELECT 
    id, name, region_type, kingdom_id, climate_zone_id,
    description_text, description_summary, area_km2,
    distance_for_encounter, chance_of_encounter, hours_to_encounter,
    geom, NOW()
FROM temp_regions
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    region_type = EXCLUDED.region_type,
    kingdom_id = EXCLUDED.kingdom_id,
    climate_zone_id = EXCLUDED.climate_zone_id,
    description_text = EXCLUDED.description_text,
    description_summary = EXCLUDED.description_summary,
    area_km2 = EXCLUDED.area_km2,
    distance_for_encounter = EXCLUDED.distance_for_encounter,
    chance_of_encounter = EXCLUDED.chance_of_encounter,
    hours_to_encounter = EXCLUDED.hours_to_encounter,
    geom = EXCLUDED.geom;

-- Clean up temporary table
DROP TABLE temp_regions;

-- Verification
SELECT 'regions' AS table_name, COUNT(*) AS rows_loaded FROM regions WHERE geom IS NOT NULL;
