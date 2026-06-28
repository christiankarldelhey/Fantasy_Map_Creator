-- ============================================================================
-- Railway Critical Database Objects Migration
-- Purpose: Create essential functions, tables, and indexes missing in Railway
-- Date: 2026-06-27
-- ============================================================================

-- ============================================================================
-- 1. CRITICAL: Elevation Function
-- This function is required by the /api/dem/point endpoint
-- ============================================================================

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

-- ============================================================================
-- 2. CRITICAL: Climate Transition Function
-- This function is required by the /api/climate/point endpoint
-- ============================================================================

CREATE OR REPLACE FUNCTION get_climate_at_point_with_transition(
    p_lon DECIMAL,
    p_lat DECIMAL,
    p_timestamp TIMESTAMP
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_point GEOMETRY;
    v_main_region_id INTEGER;
    v_main_region_name VARCHAR(255);
    v_main_climate_zone_id INTEGER;
    v_distance_to_boundary DECIMAL;
    v_transition_distance_km DECIMAL := 50; -- 50 km transition zone
    v_is_transition BOOLEAN := FALSE;
    v_result JSON;
    v_climate_data RECORD;
    v_neighbors JSON;
BEGIN
    -- Create point geometry
    v_point := ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326);
    
    -- Find the main region containing the point
    SELECT 
        r.id,
        r.name,
        r.climate_zone_id
    INTO v_main_region_id, v_main_region_name, v_main_climate_zone_id
    FROM regions r
    WHERE ST_Contains(r.geom, v_point)
    LIMIT 1;
    
    -- If point is not in any region, return null
    IF v_main_region_id IS NULL THEN
        RETURN json_build_object(
            'error', 'Point not found in any region'
        );
    END IF;
    
    -- Calculate distance to the boundary of the main region
    SELECT 
        ST_Distance(
            v_point::geography,
            ST_Boundary(r.geom)::geography
        ) / 1000 -- Convert meters to km
    INTO v_distance_to_boundary
    FROM regions r
    WHERE r.id = v_main_region_id;
    
    -- Check if in transition zone
    IF v_distance_to_boundary < v_transition_distance_km THEN
        v_is_transition := TRUE;
    END IF;
    
    -- If not in transition zone, return original climate data
    IF NOT v_is_transition THEN
        SELECT 
            json_build_object(
                'region_id', v_main_region_id,
                'region_name', v_main_region_name,
                'is_transition_zone', FALSE,
                'transition_distance_km', v_distance_to_boundary,
                'climate', json_build_object(
                    'time', cd.time,
                    'temperature_2m', cd.temperature_2m,
                    'precipitation', cd.precipitation,
                    'wind_speed_10m', cd.wind_speed_10m,
                    'wind_direction_10m', cd.wind_direction_10m,
                    'relative_humidity_2m', cd.relative_humidity_2m,
                    'cloud_cover', cd.cloud_cover
                )
            )
        INTO v_result
        FROM climate_data cd
        WHERE cd.climate_zone_id = v_main_climate_zone_id
          AND cd.time = p_timestamp
        LIMIT 1;
        
        -- If no climate data found for timestamp, return error
        IF v_result IS NULL THEN
            RETURN json_build_object(
                'error', 'No climate data found for the specified timestamp'
            );
        END IF;
        
        RETURN v_result;
    END IF;
    
    -- === TRANSITION ZONE: Blend with neighboring regions ===

    -- Find neighboring regions within 50km buffer and calculate blended values in one CTE
    WITH neighboring_regions AS (
        SELECT
            r.id as region_id,
            r.name as region_name,
            r.climate_zone_id,
            ST_Distance(
                v_point::geography,
                ST_Centroid(r.geom)::geography
            ) / 1000 as distance_km
        FROM regions r
        WHERE r.id != v_main_region_id
          AND r.climate_zone_id IS NOT NULL
          AND ST_Intersects(
              ST_Buffer(v_point::geography, v_transition_distance_km * 1000),
              r.geom::geography
          )
    ),
    -- Calculate inverse distance weights
    weighted_regions AS (
        SELECT
            nr.region_id,
            nr.region_name,
            nr.climate_zone_id,
            nr.distance_km,
            -- Weight = 1 / distance (with minimum distance of 1km to avoid division by zero)
            1.0 / GREATEST(nr.distance_km, 1.0) as weight
        FROM neighboring_regions nr
    ),
    -- Add main region with high weight
    all_regions AS (
        SELECT
            v_main_region_id as region_id,
            v_main_region_name as region_name,
            v_main_climate_zone_id as climate_zone_id,
            v_distance_to_boundary as distance_km,
            1.0 / GREATEST(v_distance_to_boundary, 1.0) as weight
        UNION ALL
        SELECT region_id, region_name, climate_zone_id, distance_km, weight
        FROM weighted_regions
    ),
    -- Normalize weights to sum to 1
    normalized_regions AS (
        SELECT
            region_id,
            region_name,
            climate_zone_id,
            distance_km,
            weight / SUM(weight) OVER () as normalized_weight
        FROM all_regions
    ),
    -- Join with climate data and calculate blended values
    climate_with_weights AS (
        SELECT
            nr.region_id,
            nr.region_name,
            nr.distance_km,
            nr.normalized_weight,
            cd.temperature_2m,
            cd.precipitation,
            cd.wind_speed_10m,
            cd.wind_direction_10m,
            cd.relative_humidity_2m,
            cd.cloud_cover,
            sin(radians(cd.wind_direction_10m)) * cd.wind_speed_10m * nr.normalized_weight as sin_component,
            cos(radians(cd.wind_direction_10m)) * cd.wind_speed_10m * nr.normalized_weight as cos_component
        FROM normalized_regions nr
        JOIN climate_data cd ON cd.climate_zone_id = nr.climate_zone_id
        WHERE cd.time = p_timestamp
    ),
    blended_climate AS (
        SELECT
            json_agg(json_build_object(
                'region_id', cw.region_id,
                'region_name', cw.region_name,
                'distance_km', cw.distance_km,
                'weight', cw.normalized_weight
            )) as neighbors_json,
            json_build_object(
                'time', p_timestamp,
                'temperature_2m', SUM(cw.temperature_2m * cw.normalized_weight),
                'precipitation', SUM(cw.precipitation * cw.normalized_weight),
                'wind_speed_10m', SUM(cw.wind_speed_10m * cw.normalized_weight),
                'wind_direction_10m', (
                    CASE
                        WHEN SUM(cw.wind_speed_10m * cw.normalized_weight) = 0 THEN 0
                        ELSE
                            (CASE
                                WHEN degrees(atan2(SUM(cw.sin_component), SUM(cw.cos_component))) < 0
                                THEN 360
                                ELSE 0
                            END) + degrees(atan2(SUM(cw.sin_component), SUM(cw.cos_component)))
                    END
                ),
                'relative_humidity_2m', SUM(cw.relative_humidity_2m * cw.normalized_weight),
                'cloud_cover', SUM(cw.cloud_cover * cw.normalized_weight)
            ) as climate_json
        FROM climate_with_weights cw
    )
    SELECT
        json_build_object(
            'region_id', v_main_region_id,
            'region_name', v_main_region_name,
            'is_transition_zone', TRUE,
            'transition_distance_km', v_distance_to_boundary,
            'neighboring_regions', bc.neighbors_json,
            'climate', bc.climate_json
        )
    INTO v_result
    FROM blended_climate bc;
    
    -- If no climate data found, return error
    IF v_result IS NULL THEN
        RETURN json_build_object(
            'error', 'No climate data found for the specified timestamp'
        );
    END IF;
    
    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_climate_at_point_with_transition IS 
'Returns climate data at a point with transition zone blending when within 50km of region boundary';

-- ============================================================================
-- 2. Detected Peaks Table (for elevation/mountain detection)
-- ============================================================================

CREATE TABLE IF NOT EXISTS detected_peaks (
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
CREATE INDEX IF NOT EXISTS idx_detected_peaks_geom ON detected_peaks USING GIST(geom);

-- Create additional indexes
CREATE INDEX IF NOT EXISTS idx_detected_peaks_altitude_type ON detected_peaks(altitude_type);
CREATE INDEX IF NOT EXISTS idx_detected_peaks_elevation ON detected_peaks(base_elevation);

COMMENT ON TABLE detected_peaks IS 'Mountain peaks detected from map imagery using computer vision';

-- ============================================================================
-- 3. Performance Indexes for Climate Data
-- ============================================================================

-- Composite index for climate_zone_id + time - most common query pattern
CREATE INDEX IF NOT EXISTS idx_climate_data_zone_time 
    ON climate_data(climate_zone_id, time);

-- Index for time-based queries across all climate zones
CREATE INDEX IF NOT EXISTS idx_climate_data_time 
    ON climate_data(time);

-- Index for individual climate zone queries
CREATE INDEX IF NOT EXISTS idx_climate_data_climate_zone_id 
    ON climate_data(climate_zone_id);

-- ============================================================================
-- 4. Performance Indexes for Climate Zones
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_climate_zones_koppen ON climate_zones(koppen);
CREATE INDEX IF NOT EXISTS idx_climate_zones_analog_location ON climate_zones(analog_location);

-- ============================================================================
-- 5. Performance Indexes for Elevation Points
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_elevation_points_geom ON elevation_points USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_elevation_points_altitude_type ON elevation_points(altitude_type);
CREATE INDEX IF NOT EXISTS idx_elevation_points_elevation ON elevation_points(elevation_final);

-- ============================================================================
-- 6. Performance Indexes for Altitude Layers
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_altitude_layers_geom ON altitude_layers USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_altitude_layers_type ON altitude_layers(altitude_type);
CREATE INDEX IF NOT EXISTS idx_altitude_layers_priority ON altitude_layers(priority);

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 'Migration completed successfully' as status;
SELECT COUNT(*) as function_exists FROM pg_proc WHERE proname = 'get_climate_at_point_with_transition';
SELECT COUNT(*) as detected_peaks_exists FROM pg_tables WHERE tablename = 'detected_peaks';
SELECT COUNT(*) as climate_indexes FROM pg_indexes WHERE tablename IN ('climate_data', 'climate_zones', 'elevation_points', 'altitude_layers');
