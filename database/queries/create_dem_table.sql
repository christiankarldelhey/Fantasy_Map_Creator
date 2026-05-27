-- ============================================================================
-- Create DEM (Digital Elevation Model) Table
-- ============================================================================
-- Purpose: Store raster elevation data generated from altitude layers and
--          detected peaks
-- ============================================================================

-- Enable PostGIS Raster extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis_raster;

-- Drop existing table if it exists
DROP TABLE IF EXISTS dem_elevation CASCADE;

-- Create the dem_elevation table
CREATE TABLE dem_elevation (
    rid SERIAL PRIMARY KEY,
    
    -- Raster data (elevation values)
    rast RASTER,
    
    -- Metadata about the DEM generation
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create spatial index on raster
CREATE INDEX idx_dem_elevation_rast ON dem_elevation USING GIST(ST_ConvexHull(rast));

-- Comments for documentation
COMMENT ON TABLE dem_elevation IS 'Digital Elevation Model (DEM) raster data combining altitude layers, detected peaks, and procedural noise';
COMMENT ON COLUMN dem_elevation.rast IS 'Raster with elevation values in meters';
COMMENT ON COLUMN dem_elevation.metadata IS 'JSON metadata: resolution, bounds, generation date, algorithm version, etc.';

-- Helper function to get elevation at a point
CREATE OR REPLACE FUNCTION get_elevation_at_point(lon DOUBLE PRECISION, lat DOUBLE PRECISION)
RETURNS DOUBLE PRECISION AS $$
DECLARE
    elevation DOUBLE PRECISION;
BEGIN
    SELECT ST_Value(rast, ST_SetSRID(ST_MakePoint(lon, lat), 4326))
    INTO elevation
    FROM dem_elevation
    WHERE ST_Intersects(rast, ST_SetSRID(ST_MakePoint(lon, lat), 4326))
    LIMIT 1;
    
    RETURN COALESCE(elevation, 0);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_elevation_at_point IS 'Get elevation in meters at a specific lon/lat point';

-- Verification query
SELECT 
    'dem_elevation' as table_name,
    COUNT(*) as raster_count,
    pg_size_pretty(pg_total_relation_size('dem_elevation')) as table_size
FROM dem_elevation;
