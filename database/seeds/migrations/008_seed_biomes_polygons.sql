-- Migration: Seed biomes data with polygon geometries
-- Date: 2026-06-29
-- Description: Load biomes master data with polygon geometries from GeoJSON seed file

-- Create temporary table for GeoJSON import
DROP TABLE IF EXISTS temp_biomes;

CREATE TABLE temp_biomes (
    id INTEGER,
    name VARCHAR(255),
    type VARCHAR(50),
    description TEXT,
    area_km2 DECIMAL,
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
        SELECT pg_read_file('/Users/christiankarldelhey/Documents/Middle Earth Map/database/seeds/data/geojson/biomes.geojson')
    )::JSON;
    
    -- Process each feature
    FOR feature IN SELECT * FROM json_array_elements(geojson_data->'features')
    LOOP
        properties := feature->'properties';
        geometry := feature->'geometry';
        
        -- Insert into temporary table
        INSERT INTO temp_biomes (
            id, name, type, description, area_km2, geom
        ) VALUES (
            (properties->>'id')::INTEGER,
            properties->>'name',
            properties->>'type',
            properties->>'description',
            CASE WHEN properties->>'area_km2' = '' THEN NULL ELSE (properties->>'area_km2')::DECIMAL END,
            ST_GeomFromGeoJSON(geometry::text, 4326)
        );
        
        feature_count := feature_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Processed % biomes features', feature_count;
END $$;

-- Insert into main table with conflict resolution
INSERT INTO biomes (
    id, name, type, description, area_km2, geom, created_at
)
SELECT 
    id, name, type, description, area_km2, geom, NOW()
FROM temp_biomes
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    description = EXCLUDED.description,
    area_km2 = EXCLUDED.area_km2,
    geom = EXCLUDED.geom;

-- Clean up temporary table
DROP TABLE temp_biomes;

-- Verification
SELECT 'biomes' AS table_name, COUNT(*) AS rows_loaded FROM biomes WHERE geom IS NOT NULL;
