-- ============================================================================
-- Middle Earth GIS - Spatial Queries Examples
-- PostgreSQL + PostGIS
-- ============================================================================

-- ============================================================================
-- BASIC QUERIES
-- ============================================================================

-- 1. Count all locations
SELECT COUNT(*) as total_locations FROM locations;

-- 2. Count locations by type
SELECT 
    location_type, 
    COUNT(*) as count 
FROM locations 
WHERE location_type IS NOT NULL
GROUP BY location_type 
ORDER BY count DESC;

-- 3. View sample locations with coordinates
SELECT 
    name,
    location_type,
    population,
    ST_X(geom) as longitude,
    ST_Y(geom) as latitude
FROM locations
LIMIT 10;

-- 4. Find largest cities by population
SELECT 
    name,
    location_type,
    population,
    ST_X(geom) as longitude,
    ST_Y(geom) as latitude
FROM locations
WHERE population IS NOT NULL
ORDER BY population DESC
LIMIT 10;

-- ============================================================================
-- SPATIAL DISTANCE QUERIES
-- ============================================================================

-- 5. Calculate distance between two specific locations (in meters)
-- Example: Distance between first two cities
SELECT 
    a.name as from_location,
    b.name as to_location,
    ROUND(ST_Distance(a.geom::geography, b.geom::geography)::numeric, 2) as distance_meters,
    ROUND((ST_Distance(a.geom::geography, b.geom::geography) / 1000)::numeric, 2) as distance_km
FROM locations a, locations b
WHERE a.id = 1 AND b.id = 2;

-- 6. Find all locations within 50km of a specific point
-- Replace coordinates with your target location
SELECT 
    name,
    location_type,
    population,
    ROUND(ST_Distance(
        geom::geography,
        ST_SetSRID(ST_MakePoint(2.943926, 40.441266), 4326)::geography
    )::numeric / 1000, 2) as distance_km
FROM locations
WHERE ST_DWithin(
    geom::geography,
    ST_SetSRID(ST_MakePoint(2.943926, 40.441266), 4326)::geography,
    50000  -- 50km in meters
)
ORDER BY distance_km;

-- 7. Find 5 nearest locations to a specific point
SELECT 
    name,
    location_type,
    population,
    ROUND(ST_Distance(
        geom::geography,
        ST_SetSRID(ST_MakePoint(0, 50), 4326)::geography
    )::numeric / 1000, 2) as distance_km
FROM locations
ORDER BY geom::geography <-> ST_SetSRID(ST_MakePoint(0, 50), 4326)::geography
LIMIT 5;

-- 8. Distance matrix between all cities (WARNING: can be slow with many locations)
SELECT 
    a.name as from_city,
    b.name as to_city,
    ROUND((ST_Distance(a.geom::geography, b.geom::geography) / 1000)::numeric, 2) as distance_km
FROM locations a
CROSS JOIN locations b
WHERE a.id < b.id  -- Avoid duplicates
  AND a.location_type = 'city'
  AND b.location_type = 'city'
ORDER BY distance_km
LIMIT 20;

-- ============================================================================
-- SPATIAL CONTAINMENT QUERIES
-- ============================================================================

-- 9. Find which locations are within regions
SELECT 
    l.name as location_name,
    l.location_type,
    r.name as region_name
FROM locations l
JOIN regions r ON ST_Contains(r.geom, l.geom)
ORDER BY r.name, l.name;

-- 10. Count locations per region
SELECT 
    r.name as region_name,
    COUNT(l.id) as location_count
FROM regions r
LEFT JOIN locations l ON ST_Contains(r.geom, l.geom)
GROUP BY r.name
ORDER BY location_count DESC;

-- ============================================================================
-- AREA AND PERIMETER CALCULATIONS
-- ============================================================================

-- 11. Calculate area of all regions in km²
SELECT 
    name,
    region_type,
    ROUND((ST_Area(geom::geography) / 1000000)::numeric, 2) as area_km2,
    ROUND((ST_Perimeter(geom::geography) / 1000)::numeric, 2) as perimeter_km
FROM regions
ORDER BY area_km2 DESC;

-- 12. Update area_km2 column for all regions
UPDATE regions
SET area_km2 = ST_Area(geom::geography) / 1000000;

-- ============================================================================
-- BOUNDING BOX QUERIES
-- ============================================================================

-- 13. Get bounding box of all locations
SELECT 
    ST_XMin(extent) as min_longitude,
    ST_YMin(extent) as min_latitude,
    ST_XMax(extent) as max_longitude,
    ST_YMax(extent) as max_latitude
FROM (
    SELECT ST_Extent(geom) as extent
    FROM locations
) as bbox;

-- 14. Find center point of all locations
SELECT 
    ST_X(center) as center_longitude,
    ST_Y(center) as center_latitude
FROM (
    SELECT ST_Centroid(ST_Collect(geom)) as center
    FROM locations
) as center_point;

-- ============================================================================
-- BUFFER QUERIES
-- ============================================================================

-- 15. Create 10km buffer around a location and find what's inside
-- Replace location name with your target
WITH target_location AS (
    SELECT geom
    FROM locations
    WHERE name = 'Gwaerost'
    LIMIT 1
)
SELECT 
    l.name,
    l.location_type,
    ROUND(ST_Distance(l.geom::geography, t.geom::geography)::numeric / 1000, 2) as distance_km
FROM locations l, target_location t
WHERE ST_DWithin(l.geom::geography, t.geom::geography, 10000)  -- 10km
  AND l.geom != t.geom  -- Exclude the target itself
ORDER BY distance_km;

-- ============================================================================
-- ADVANCED SPATIAL QUERIES
-- ============================================================================

-- 16. Find clusters of locations (locations within 20km of each other)
SELECT 
    a.name as location_1,
    b.name as location_2,
    ROUND((ST_Distance(a.geom::geography, b.geom::geography) / 1000)::numeric, 2) as distance_km
FROM locations a
JOIN locations b ON a.id < b.id
WHERE ST_DWithin(a.geom::geography, b.geom::geography, 20000)  -- 20km
ORDER BY distance_km
LIMIT 50;

-- 17. Find locations along a line (e.g., a road or river)
-- This creates a line and finds locations within 5km of it
WITH sample_line AS (
    SELECT ST_MakeLine(
        ST_SetSRID(ST_MakePoint(0, 50), 4326),
        ST_SetSRID(ST_MakePoint(5, 52), 4326)
    ) as geom
)
SELECT 
    l.name,
    l.location_type,
    ROUND(ST_Distance(l.geom::geography, sl.geom::geography)::numeric / 1000, 2) as distance_km
FROM locations l, sample_line sl
WHERE ST_DWithin(l.geom::geography, sl.geom::geography, 5000)  -- 5km
ORDER BY distance_km;

-- 18. Calculate density of locations (locations per 1000 km²)
WITH region_stats AS (
    SELECT 
        r.name as region_name,
        r.area_km2,
        COUNT(l.id) as location_count
    FROM regions r
    LEFT JOIN locations l ON ST_Contains(r.geom, l.geom)
    GROUP BY r.name, r.area_km2
)
SELECT 
    region_name,
    location_count,
    ROUND(area_km2::numeric, 2) as area_km2,
    ROUND((location_count::numeric / NULLIF(area_km2, 0) * 1000)::numeric, 2) as density_per_1000km2
FROM region_stats
WHERE area_km2 IS NOT NULL
ORDER BY density_per_1000km2 DESC;

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

-- 19. Check for invalid geometries
SELECT 
    id,
    name,
    ST_IsValid(geom) as is_valid,
    ST_IsValidReason(geom) as invalid_reason
FROM locations
WHERE NOT ST_IsValid(geom);

-- 20. Verify all geometries have correct SRID (should be 4326)
SELECT 
    'locations' as table_name,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE ST_SRID(geom) = 4326) as correct_srid,
    COUNT(*) FILTER (WHERE ST_SRID(geom) != 4326) as incorrect_srid
FROM locations
UNION ALL
SELECT 
    'regions' as table_name,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE ST_SRID(geom) = 4326) as correct_srid,
    COUNT(*) FILTER (WHERE ST_SRID(geom) != 4326) as incorrect_srid
FROM regions;

-- ============================================================================
-- EXPORT QUERIES
-- ============================================================================

-- 21. Export locations as GeoJSON (for use in web maps)
SELECT jsonb_build_object(
    'type', 'FeatureCollection',
    'features', jsonb_agg(
        jsonb_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(geom)::jsonb,
            'properties', jsonb_build_object(
                'name', name,
                'type', location_type,
                'population', population,
                'description', description
            )
        )
    )
) as geojson
FROM locations;

-- 22. Simple CSV export format
SELECT 
    name,
    location_type,
    population,
    ST_X(geom) as longitude,
    ST_Y(geom) as latitude
FROM locations
ORDER BY name;

-- ============================================================================
-- STATISTICS
-- ============================================================================

-- 23. Overall database statistics
SELECT 
    'Locations' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT location_type) as unique_types,
    SUM(population) as total_population,
    AVG(population) as avg_population
FROM locations
UNION ALL
SELECT 
    'Regions' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT region_type) as unique_types,
    NULL as total_population,
    NULL as avg_population
FROM regions;

-- ============================================================================
-- TIPS FOR USING THESE QUERIES
-- ============================================================================

/*
TIPS:
1. Replace coordinates and location names with your actual data
2. Adjust distance thresholds (in meters) as needed
3. Use LIMIT to avoid overwhelming results
4. For large datasets, add indexes: CREATE INDEX idx_name ON table(column);
5. Use EXPLAIN ANALYZE before queries to check performance
6. Remember: geography type uses meters, geometry type uses degrees

DISTANCE UNITS:
- geography: meters (use / 1000 for km)
- geometry: degrees (not useful for real distances)

COMMON FUNCTIONS:
- ST_Distance: Calculate distance between geometries
- ST_DWithin: Find geometries within distance
- ST_Contains: Check if geometry A contains geometry B
- ST_Intersects: Check if geometries overlap
- ST_Buffer: Create buffer around geometry
- ST_Area: Calculate area (in m² for geography)
- ST_Length: Calculate length of lines
*/
