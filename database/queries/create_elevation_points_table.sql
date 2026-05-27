-- ============================================================================
-- Create Elevation Points Table (Manual Reference Points)
-- ============================================================================
-- Purpose: Store manually created elevation reference points for DEM generation
-- ============================================================================

-- Drop existing table if it exists
DROP TABLE IF EXISTS elevation_points CASCADE;

-- Create the elevation_points table
CREATE TABLE elevation_points (
    id SERIAL PRIMARY KEY,
    
    -- Geometry (point location)
    geom GEOMETRY(Point, 4326) NOT NULL,
    
    -- Classification (from altitude_layers or manual)
    altitude_type VARCHAR(50),  -- 'hills', 'mountains_low', 'mountains_med', 'mountains_high', 'plain'
    
    -- Neighbor density analysis
    neighbor_count INTEGER DEFAULT 0,
    neighbor_density DECIMAL DEFAULT 0,
    
    -- Elevation calculations
    elevation_base DECIMAL,      -- Base elevation from altitude_type
    elevation_density DECIMAL,   -- Adjustment from neighbor density
    elevation_perlin DECIMAL,    -- Adjustment from Perlin noise
    elevation_final DECIMAL,     -- Final calculated elevation
    
    -- Source information
    source VARCHAR(50) DEFAULT 'manual',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_elevation_point_geometry CHECK (ST_IsValid(geom)),
    CONSTRAINT valid_elevation_point_srid CHECK (ST_SRID(geom) = 4326),
    CONSTRAINT valid_elevation_value CHECK (elevation_final IS NULL OR (elevation_final >= 0 AND elevation_final <= 10000))
);

-- Create spatial index
CREATE INDEX idx_elevation_points_geom ON elevation_points USING GIST(geom);

-- Create additional indexes
CREATE INDEX idx_elevation_points_altitude_type ON elevation_points(altitude_type);
CREATE INDEX idx_elevation_points_elevation ON elevation_points(elevation_final);

-- Comments for documentation
COMMENT ON TABLE elevation_points IS 'Manual elevation reference points for DEM generation (~10k points)';
COMMENT ON COLUMN elevation_points.geom IS 'POINT geometry in EPSG:4326 (WGS84)';
COMMENT ON COLUMN elevation_points.altitude_type IS 'Type: plain, hills, mountains_low, mountains_med, mountains_high';
COMMENT ON COLUMN elevation_points.neighbor_count IS 'Number of neighbors within 1.5km radius';
COMMENT ON COLUMN elevation_points.neighbor_density IS 'Normalized density (0-1)';
COMMENT ON COLUMN elevation_points.elevation_final IS 'Final elevation in meters';

-- Verification query
SELECT 
    'elevation_points' as table_name,
    COUNT(*) as row_count
FROM elevation_points;
