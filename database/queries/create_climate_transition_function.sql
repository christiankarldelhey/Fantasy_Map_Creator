-- ============================================================================
-- Climate Transition Zone Function
-- Purpose: Get climate data at a point with transition zone blending
--          when the point is within 50km of a region boundary
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
-- Test the function
-- ============================================================================

-- Test 1: Point inside a region (not in transition zone)
-- SELECT get_climate_at_point_with_transition(-0.5, 45.0, '1950-06-15 12:00:00');

-- Test 2: Point near boundary (should be in transition zone)
-- SELECT get_climate_at_point_with_transition(-0.5, 45.0, '1950-06-15 12:00:00');
