-- ============================================================================
-- Middle Earth GIS Database Schema
-- PostgreSQL + PostGIS
-- ============================================================================

-- Ensure PostGIS extension is enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- Table: locations
-- Purpose: Store point locations (cities, castles, towns, fortresses, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS locations (
    -- Identifiers
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) UNIQUE,  -- ID from original GeoJSON
    
    -- Basic information
    name VARCHAR(255) NOT NULL,
    location_type VARCHAR(100),  -- 'city', 'castle', 'town', 'mansion', 'fortress', 'ruins'
    
    -- Demographics
    population INTEGER,
    race VARCHAR(100),  -- 'Hobbits', 'Dunedain', 'Northmen', etc.
    
    -- Description
    description TEXT,
    
    -- Geographic location
    region VARCHAR(100),  -- 'Eriador', 'Gondor', 'Rohan', etc.
    
    -- Multimedia
    image_url TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- GEOMETRY (most important)
    geom GEOMETRY(Point, 4326) NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_geometry CHECK (ST_IsValid(geom)),
    CONSTRAINT valid_srid CHECK (ST_SRID(geom) = 4326)
);

-- Spatial index (CRITICAL for performance)
CREATE INDEX IF NOT EXISTS idx_locations_geom ON locations USING GIST(geom);

-- Indexes for common searches
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);
CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(location_type);
CREATE INDEX IF NOT EXISTS idx_locations_region ON locations(region);

-- Comments for documentation
COMMENT ON TABLE locations IS 'Point locations in Middle Earth (cities, castles, towns)';
COMMENT ON COLUMN locations.geom IS 'POINT geometry in EPSG:4326 (WGS84)';
COMMENT ON COLUMN locations.location_type IS 'Settlement type: city, castle, town, mansion, fortress, ruins';

-- ============================================================================
-- Table: paths
-- Purpose: Store linear features (roads, rivers, routes, borders)
-- ============================================================================

CREATE TABLE IF NOT EXISTS paths (
    -- Identifiers
    id SERIAL PRIMARY KEY,
    
    -- Basic information
    name VARCHAR(255),
    path_type VARCHAR(50),  -- 'road', 'river', 'border', 'route'
    
    -- Terrain characteristics
    terrain_type VARCHAR(50),  -- 'mountain', 'forest', 'plains', 'swamp'
    difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),  -- 1=easy, 5=hard
    
    -- For future routing
    cost_factor DECIMAL DEFAULT 1.0,  -- Cost multiplier (1.0 = normal)
    
    -- Description
    description TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- GEOMETRY
    geom GEOMETRY(LineString, 4326) NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_path_geometry CHECK (ST_IsValid(geom)),
    CONSTRAINT valid_path_srid CHECK (ST_SRID(geom) = 4326),
    CONSTRAINT min_two_points CHECK (ST_NPoints(geom) >= 2)
);

-- Spatial index
CREATE INDEX IF NOT EXISTS idx_paths_geom ON paths USING GIST(geom);

-- Additional indexes
CREATE INDEX IF NOT EXISTS idx_paths_type ON paths(path_type);
CREATE INDEX IF NOT EXISTS idx_paths_terrain ON paths(terrain_type);

COMMENT ON TABLE paths IS 'Roads, rivers and routes in Middle Earth';
COMMENT ON COLUMN paths.cost_factor IS 'Cost factor for routing algorithms (1.0 = normal speed)';

-- ============================================================================
-- Table: regions
-- Purpose: Store polygon features (kingdoms, biomes, provinces, climate zones)
-- ============================================================================

CREATE TABLE IF NOT EXISTS regions (
    -- Identifiers
    id SERIAL PRIMARY KEY,
    
    -- Basic information
    name VARCHAR(255) NOT NULL,
    region_type VARCHAR(50),  -- 'kingdom', 'biome', 'province', 'climate_zone'
    
    -- Political information
    ruler VARCHAR(255),  -- King, lord, governor
    allegiance VARCHAR(100),  -- 'Free Peoples', 'Mordor', 'Neutral'
    
    -- Geographic information
    biome VARCHAR(50),  -- 'forest', 'plains', 'mountain', 'swamp', 'desert'
    climate VARCHAR(50),  -- 'temperate', 'cold', 'warm', 'mediterranean'
    
    -- Description
    description TEXT,
    
    -- Statistics
    area_km2 DECIMAL,  -- Will be calculated with ST_Area
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- GEOMETRY
    geom GEOMETRY(Polygon, 4326) NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_region_geometry CHECK (ST_IsValid(geom)),
    CONSTRAINT valid_region_srid CHECK (ST_SRID(geom) = 4326),
    CONSTRAINT closed_polygon CHECK (ST_IsClosed(ST_ExteriorRing(geom)))
);

-- Spatial index
CREATE INDEX IF NOT EXISTS idx_regions_geom ON regions USING GIST(geom);

-- Additional indexes
CREATE INDEX IF NOT EXISTS idx_regions_type ON regions(region_type);
CREATE INDEX IF NOT EXISTS idx_regions_biome ON regions(biome);

COMMENT ON TABLE regions IS 'Regions, kingdoms and biomes of Middle Earth';
COMMENT ON COLUMN regions.area_km2 IS 'Area in square kilometers (calculated with ST_Area)';

-- ============================================================================
-- Table: climate_zones (for future climate system)
-- Purpose: European climate zones to map to Middle Earth
-- ============================================================================

CREATE TABLE IF NOT EXISTS climate_zones (
    id SERIAL PRIMARY KEY,
    
    -- Geographic information
    region_name VARCHAR(255),  -- 'Northern Europe', 'Mediterranean', etc.
    climate_type VARCHAR(50),  -- 'oceanic', 'continental', 'mediterranean', 'alpine'
    
    -- Coordinate ranges
    latitude_min DECIMAL,
    latitude_max DECIMAL,
    longitude_min DECIMAL,
    longitude_max DECIMAL,
    
    -- Geometry (zone polygon)
    geom GEOMETRY(Polygon, 4326),
    
    CONSTRAINT valid_climate_geom CHECK (ST_IsValid(geom))
);

CREATE INDEX IF NOT EXISTS idx_climate_zones_geom ON climate_zones USING GIST(geom);

-- ============================================================================
-- Table: monthly_climate_averages (for future climate system)
-- Purpose: Store monthly climate data
-- ============================================================================

CREATE TABLE IF NOT EXISTS monthly_climate_averages (
    id SERIAL PRIMARY KEY,
    climate_zone_id INTEGER REFERENCES climate_zones(id),
    
    -- Month (1-12)
    month INTEGER CHECK (month BETWEEN 1 AND 12),
    
    -- Climate averages
    avg_temp_max DECIMAL,  -- °C
    avg_temp_min DECIMAL,  -- °C
    avg_precipitation DECIMAL,  -- mm
    avg_humidity INTEGER,  -- %
    avg_wind_speed DECIMAL,  -- km/h
    
    -- Typical description
    typical_weather VARCHAR(100),  -- 'Sunny', 'Rainy', 'Cloudy', 'Snowy'
    
    UNIQUE(climate_zone_id, month)
);

CREATE INDEX IF NOT EXISTS idx_climate_month ON monthly_climate_averages(climate_zone_id, month);

-- ============================================================================
-- Verification queries
-- ============================================================================

-- Verify PostGIS version
SELECT PostGIS_Version();

-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verify spatial indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexdef LIKE '%GIST%'
ORDER BY tablename;
