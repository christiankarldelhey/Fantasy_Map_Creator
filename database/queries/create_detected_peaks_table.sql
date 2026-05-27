-- ============================================================================
-- Create Detected Peaks Table
-- ============================================================================
-- Purpose: Store mountain peaks detected from map imagery using computer vision
-- ============================================================================

-- Drop existing table if it exists
DROP TABLE IF EXISTS detected_peaks CASCADE;

-- Create the detected_peaks table
CREATE TABLE detected_peaks (
    id SERIAL PRIMARY KEY,
    
    -- Geometry (point location of the peak)
    geom GEOMETRY(Point, 4326) NOT NULL,
    
    -- Classification (determined by spatial join with altitude_layers)
    altitude_type VARCHAR(50),  -- 'hills', 'mountains_low', 'mountains_med', 'mountains_high'
    
    -- Elevation assignment
    base_elevation DECIMAL,  -- Base elevation in meters based on altitude_type
    
    -- Detection metadata
    confidence DECIMAL,  -- Confidence score from CV detection (0-1)
    symbol_area INTEGER,  -- Area of detected symbol in pixels
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_peak_geometry CHECK (ST_IsValid(geom)),
    CONSTRAINT valid_peak_srid CHECK (ST_SRID(geom) = 4326),
    CONSTRAINT valid_confidence CHECK (confidence >= 0 AND confidence <= 1)
);

-- Create spatial index
CREATE INDEX idx_detected_peaks_geom ON detected_peaks USING GIST(geom);

-- Create additional indexes
CREATE INDEX idx_detected_peaks_altitude_type ON detected_peaks(altitude_type);
CREATE INDEX idx_detected_peaks_elevation ON detected_peaks(base_elevation);

-- Comments for documentation
COMMENT ON TABLE detected_peaks IS 'Mountain peaks detected from map imagery using computer vision';
COMMENT ON COLUMN detected_peaks.geom IS 'POINT geometry in EPSG:4326 (WGS84) - location of detected peak';
COMMENT ON COLUMN detected_peaks.altitude_type IS 'Type of altitude zone: hills, mountains_low, mountains_med, mountains_high';
COMMENT ON COLUMN detected_peaks.base_elevation IS 'Base elevation in meters assigned based on altitude_type';
COMMENT ON COLUMN detected_peaks.confidence IS 'Detection confidence score (0-1) from computer vision algorithm';
COMMENT ON COLUMN detected_peaks.symbol_area IS 'Area of the detected mountain symbol in pixels';

-- Verification query
SELECT 
    'detected_peaks' as table_name,
    COUNT(*) as row_count
FROM detected_peaks;
