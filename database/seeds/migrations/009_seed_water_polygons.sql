-- Migration: Seed water data with mixed geometries
-- Date: 2026-06-29
-- Description: Load water master data with mixed geometries from GeoJSON seed file

-- Create temporary table for GeoJSON import
DROP TABLE IF EXISTS temp_water;

CREATE TABLE temp_water (
    id INTEGER,
    name VARCHAR(255),
    water_type VARCHAR(50),
    description TEXT,
    geom GEOMETRY(Geometry, 4326)
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
        SELECT pg_read_file('/Users/christiankarldelhey/Documents/Middle Earth Map/database/seeds/data/geojson/water.geojson')
    )::JSON;
    
    -- Process each feature
    FOR feature IN SELECT * FROM json_array_elements(geojson_data->'features')
    LOOP
        properties := feature->'properties';
        geometry := feature->'geometry';
        
        -- Insert into temporary table
        INSERT INTO temp_water (
            id, name, water_type, description, geom
        ) VALUES (
            (properties->>'id')::INTEGER,
            properties->>'name',
            properties->>'water_type',
            properties->>'description',
            ST_GeomFromGeoJSON(geometry::text, 4326)
        );
        
        feature_count := feature_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Processed % water features', feature_count;
END $$;

-- Insert into main table with conflict resolution
INSERT INTO water (
    id, name, water_type, description, geom, created_at
)
SELECT 
    id, name, water_type, description, geom, NOW()
FROM temp_water
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    water_type = EXCLUDED.water_type,
    description = EXCLUDED.description,
    geom = EXCLUDED.geom;

-- Clean up temporary table
DROP TABLE temp_water;

-- Verification
SELECT 'water' AS table_name, COUNT(*) AS rows_loaded FROM water WHERE geom IS NOT NULL;
