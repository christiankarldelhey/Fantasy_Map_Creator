-- ============================================================================
-- Process Altitude Layers - PostGIS Script
-- ============================================================================
-- Purpose: Create altitude_layers table with merged and non-overlapping
--          altitude zones following the hierarchy:
--          hills < mountains_low < mountains_med < mountains_high
--
-- Process:
-- 1. Merge overlapping polygons of the same altitude type
-- 2. Remove overlaps between different types, keeping higher altitude
-- ============================================================================

-- Drop existing table if it exists
DROP TABLE IF EXISTS altitude_layers CASCADE;

-- Create the altitude_layers table
CREATE TABLE altitude_layers (
    id SERIAL PRIMARY KEY,
    altitude_type VARCHAR(50) NOT NULL,
    priority INTEGER NOT NULL,
    geom GEOMETRY(Geometry, 4326) NOT NULL,
    area_km2 DECIMAL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT valid_altitude_geometry CHECK (ST_IsValid(geom)),
    CONSTRAINT valid_altitude_srid CHECK (ST_SRID(geom) = 4326)
);

-- Create spatial index
CREATE INDEX idx_altitude_layers_geom ON altitude_layers USING GIST(geom);
CREATE INDEX idx_altitude_layers_type ON altitude_layers(altitude_type);
CREATE INDEX idx_altitude_layers_priority ON altitude_layers(priority);

COMMENT ON TABLE altitude_layers IS 'Processed altitude layers with merged polygons and resolved overlaps';
COMMENT ON COLUMN altitude_layers.priority IS 'Altitude priority: 1=hills, 2=mountains_low, 3=mountains_med, 4=mountains_high';

-- ============================================================================
-- STEP 1: Merge overlapping polygons of the same type
-- ============================================================================

-- Create temporary table with merged geometries for each altitude type
-- Use ST_MakeValid to fix any invalid geometries before merging
CREATE TEMP TABLE merged_altitude AS
WITH merged_by_type AS (
    -- Merge all hills
    SELECT 
        'hills' AS altitude_type,
        1 AS priority,
        ST_Union(ST_MakeValid(geom)) AS geom
    FROM biomes
    WHERE type = 'hills'
      AND geom IS NOT NULL
    
    UNION ALL
    
    -- Merge all mountains_low
    SELECT 
        'mountains_low' AS altitude_type,
        2 AS priority,
        ST_Union(ST_MakeValid(geom)) AS geom
    FROM biomes
    WHERE type = 'mountains_low'
      AND geom IS NOT NULL
    
    UNION ALL
    
    -- Merge all mountains_med
    SELECT 
        'mountains_med' AS altitude_type,
        3 AS priority,
        ST_Union(ST_MakeValid(geom)) AS geom
    FROM biomes
    WHERE type = 'mountains_med'
      AND geom IS NOT NULL
    
    UNION ALL
    
    -- Merge all mountains_high
    SELECT 
        'mountains_high' AS altitude_type,
        4 AS priority,
        ST_Union(ST_MakeValid(geom)) AS geom
    FROM biomes
    WHERE type = 'mountains_high'
      AND geom IS NOT NULL
)
SELECT * FROM merged_by_type WHERE geom IS NOT NULL;

-- ============================================================================
-- STEP 2: Resolve overlaps - keep higher altitude layer
-- ============================================================================
-- Process from highest to lowest priority, cutting out overlapping areas
-- from lower priority layers

-- Create temporary table for processed layers
CREATE TEMP TABLE processed_altitude AS
WITH 
-- Get mountains_high (highest priority - no modifications needed)
mountains_high_layer AS (
    SELECT 
        altitude_type,
        priority,
        geom
    FROM merged_altitude
    WHERE altitude_type = 'mountains_high'
),

-- Get mountains_med and remove areas covered by mountains_high
mountains_med_layer AS (
    SELECT 
        m.altitude_type,
        m.priority,
        CASE 
            WHEN h.geom IS NOT NULL THEN 
                ST_MakeValid(ST_Difference(m.geom, h.geom))
            ELSE 
                m.geom
        END AS geom
    FROM merged_altitude m
    LEFT JOIN mountains_high_layer h ON ST_Intersects(m.geom, h.geom)
    WHERE m.altitude_type = 'mountains_med'
),

-- Get mountains_low and remove areas covered by mountains_high and mountains_med
mountains_low_layer AS (
    SELECT 
        m.altitude_type,
        m.priority,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM mountains_high_layer h 
                WHERE ST_Intersects(m.geom, h.geom)
            ) OR EXISTS (
                SELECT 1 FROM mountains_med_layer med 
                WHERE ST_Intersects(m.geom, med.geom)
            ) THEN
                -- Remove both high and med overlaps
                ST_MakeValid(
                    ST_Difference(
                        ST_Difference(
                            m.geom,
                            COALESCE((SELECT geom FROM mountains_high_layer), ST_GeomFromText('POLYGON EMPTY', 4326))
                        ),
                        COALESCE((SELECT geom FROM mountains_med_layer), ST_GeomFromText('POLYGON EMPTY', 4326))
                    )
                )
            ELSE 
                m.geom
        END AS geom
    FROM merged_altitude m
    WHERE m.altitude_type = 'mountains_low'
),

-- Get hills and remove areas covered by all mountain types
hills_layer AS (
    SELECT 
        m.altitude_type,
        m.priority,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM mountains_high_layer h 
                WHERE ST_Intersects(m.geom, h.geom)
            ) OR EXISTS (
                SELECT 1 FROM mountains_med_layer med 
                WHERE ST_Intersects(m.geom, med.geom)
            ) OR EXISTS (
                SELECT 1 FROM mountains_low_layer low 
                WHERE ST_Intersects(m.geom, low.geom)
            ) THEN
                -- Remove all mountain overlaps
                ST_MakeValid(
                    ST_Difference(
                        ST_Difference(
                            ST_Difference(
                                m.geom,
                                COALESCE((SELECT geom FROM mountains_high_layer), ST_GeomFromText('POLYGON EMPTY', 4326))
                            ),
                            COALESCE((SELECT geom FROM mountains_med_layer), ST_GeomFromText('POLYGON EMPTY', 4326))
                        ),
                        COALESCE((SELECT geom FROM mountains_low_layer), ST_GeomFromText('POLYGON EMPTY', 4326))
                    )
                )
            ELSE 
                m.geom
        END AS geom
    FROM merged_altitude m
    WHERE m.altitude_type = 'hills'
)

-- Combine all processed layers
SELECT * FROM mountains_high_layer
UNION ALL
SELECT * FROM mountains_med_layer
UNION ALL
SELECT * FROM mountains_low_layer
UNION ALL
SELECT * FROM hills_layer;

-- ============================================================================
-- STEP 3: Insert processed data into altitude_layers table
-- ============================================================================

INSERT INTO altitude_layers (altitude_type, priority, geom)
SELECT 
    altitude_type,
    priority,
    geom
FROM processed_altitude
WHERE geom IS NOT NULL 
  AND NOT ST_IsEmpty(geom)
  AND ST_IsValid(geom);

-- ============================================================================
-- STEP 4: Calculate areas
-- ============================================================================

UPDATE altitude_layers
SET area_km2 = ST_Area(geom::geography) / 1000000;

-- ============================================================================
-- STEP 5: Validation and Statistics
-- ============================================================================

-- Show statistics
SELECT 
    altitude_type,
    priority,
    COUNT(*) AS num_features,
    ROUND(SUM(area_km2)::numeric, 2) AS total_area_km2,
    ROUND(AVG(area_km2)::numeric, 2) AS avg_area_km2
FROM altitude_layers
GROUP BY altitude_type, priority
ORDER BY priority;

-- Verify no invalid geometries
SELECT 
    altitude_type,
    COUNT(*) AS invalid_count
FROM altitude_layers
WHERE NOT ST_IsValid(geom)
GROUP BY altitude_type;

-- Check for overlaps between different altitude types (should be none)
SELECT 
    a1.altitude_type AS type1,
    a2.altitude_type AS type2,
    COUNT(*) AS overlap_count
FROM altitude_layers a1
JOIN altitude_layers a2 ON a1.id < a2.id
WHERE a1.priority != a2.priority
  AND ST_Intersects(a1.geom, a2.geom)
  AND ST_Area(ST_Intersection(a1.geom, a2.geom)) > 0.0001
GROUP BY a1.altitude_type, a2.altitude_type;

-- Show total count
SELECT COUNT(*) AS total_altitude_features FROM altitude_layers;

-- Clean up temporary tables
DROP TABLE IF EXISTS merged_altitude;
DROP TABLE IF EXISTS processed_altitude;

COMMENT ON TABLE altitude_layers IS 'Processed altitude layers: merged same-type polygons and resolved overlaps keeping higher altitude';
