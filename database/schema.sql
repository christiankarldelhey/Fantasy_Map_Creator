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
    location_type VARCHAR(100),  -- Normalized lowercase: 'town', 'village', 'manor', 'ruins', 'castle', 'city', 'fortress', 'point of interest', 'fortified town', 'watchtower', etc.
    
    -- Demographics
    population INTEGER,
    inhabitants TEXT,  -- Text description of inhabitants
    
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
-- Table: roads
-- Purpose: Store linear features of roads/paths
-- ============================================================================

CREATE TABLE IF NOT EXISTS roads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    terrain_type VARCHAR(50),
    difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
    cost_factor DECIMAL DEFAULT 1.0,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    geom GEOMETRY(LineString, 4326) NOT NULL,
    CONSTRAINT valid_road_geometry CHECK (ST_IsValid(geom)),
    CONSTRAINT valid_road_srid CHECK (ST_SRID(geom) = 4326)
);

-- Spatial index
CREATE INDEX IF NOT EXISTS idx_roads_geom ON roads USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_roads_name ON roads(name);

-- ============================================================================
-- Table: water
-- Purpose: Store water features (rivers, streams, lakes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS water (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    water_type VARCHAR(50) NOT NULL, -- 'river', 'stream', 'lake'
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    geom GEOMETRY(Geometry, 4326) NOT NULL, -- Supports both LineString (rivers) and Polygon (lakes)
    CONSTRAINT valid_water_geometry CHECK (ST_IsValid(geom)),
    CONSTRAINT valid_water_srid CHECK (ST_SRID(geom) = 4326)
);

-- Spatial index
CREATE INDEX IF NOT EXISTS idx_water_geom ON water USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_water_type ON water(water_type);

-- ============================================================================
-- Table: kingdoms
-- Purpose: Store kingdoms/references for regions
-- ============================================================================

CREATE TABLE IF NOT EXISTS kingdoms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kingdoms_name ON kingdoms(name);

COMMENT ON TABLE kingdoms IS 'Kingdoms and political entities of Middle Earth';

-- ============================================================================
-- Table: regions
-- Purpose: Store polygon features (biomes, provinces, climate zones)
-- ============================================================================

CREATE TABLE IF NOT EXISTS regions (
    -- Identifiers
    id SERIAL PRIMARY KEY,
    
    -- Basic information
    name VARCHAR(255) NOT NULL,
    region_type VARCHAR(50),  -- 'biome', 'province', 'climate_zone'
    
    -- Political information
    kingdom_id INTEGER REFERENCES kingdoms(id),
    
    -- Climate information
    climate_zone_id INTEGER REFERENCES climate_zones(id) ON DELETE SET NULL UNIQUE,
    
    -- Description fields (flattened from JSONB)
    land JSONB,  -- Array of land features
    fauna JSONB,  -- Fauna information
    flora JSONB,  -- Flora information
    notes TEXT,  -- General notes
    people JSONB,  -- People information
    source JSONB,  -- Source references (supplement, supplement_code)
    products TEXT,  -- Products/resources
    description_text TEXT,  -- Main description text
    
    -- Statistics
    area_km2 DECIMAL,  -- Will be calculated with ST_Area
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Encounters
    encounters JSONB DEFAULT '[]'::jsonb,
    
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
CREATE INDEX IF NOT EXISTS idx_regions_kingdom_id ON regions(kingdom_id);

COMMENT ON TABLE regions IS 'Regions, kingdoms and biomes of Middle Earth';
COMMENT ON COLUMN regions.area_km2 IS 'Area in square kilometers (calculated with ST_Area)';

-- ============================================================================
-- Table: biomes
-- Purpose: Store environmental/geographic features (forests, mountains, rivers, etc.)
-- These can overlap with political regions
-- ============================================================================

CREATE TABLE IF NOT EXISTS biomes (
    -- Identifiers
    id SERIAL PRIMARY KEY,
    
    -- Basic information
    name VARCHAR(255) NOT NULL,  -- Standard type (e.g., "Forest") or specific name (e.g., "Fangorn")
    type VARCHAR(50),  -- 'forest', 'hills', 'marsh', 'mountains', 'river', 'lake', 'plateau', 'barrow'
    
    -- Description
    description TEXT,  -- NULL for standard biomes, text for specific named locations
    
    -- Statistics
    area_km2 DECIMAL,  -- Will be calculated with ST_Area
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- GEOMETRY
    geom GEOMETRY(Polygon, 4326) NOT NULL
);

-- Spatial index
CREATE INDEX IF NOT EXISTS idx_biomes_geom ON biomes USING GIST(geom);

-- Additional indexes
CREATE INDEX IF NOT EXISTS idx_biomes_type ON biomes(type);

COMMENT ON TABLE biomes IS 'Environmental and geographic features (forests, mountains, rivers, etc.)';
COMMENT ON COLUMN biomes.name IS 'Biome name - standard type (e.g., Forest) or specific name (e.g., Fangorn)';
COMMENT ON COLUMN biomes.type IS 'Biome category: forest, hills, marsh, mountains, river, lake, plateau, barrow';
COMMENT ON COLUMN biomes.description IS 'NULL for standard biomes, text for specific named locations';

-- ============================================================================
-- Table: climate_zones
-- Purpose: Climate zones extracted from regions with normalized structure
-- ============================================================================

CREATE TABLE IF NOT EXISTS climate_zones (
    id SERIAL PRIMARY KEY,
    "desc" TEXT,
    temperature TEXT,
    precipitation TEXT,
    koppen VARCHAR(50),
    analog_location VARCHAR(255),
    analog_lat DECIMAL,
    analog_lon DECIMAL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_climate_zones_koppen ON climate_zones(koppen);
CREATE INDEX IF NOT EXISTS idx_climate_zones_analog_location ON climate_zones(analog_location);

COMMENT ON TABLE climate_zones IS 'Climate zones with 1-to-1 relationship to regions';
COMMENT ON COLUMN climate_zones."desc" IS 'Combined description and notes from original climate data';
COMMENT ON COLUMN climate_zones.temperature IS 'Temperature pattern (converted from °F to °C)';
COMMENT ON COLUMN climate_zones.precipitation IS 'Precipitation pattern (converted from inches to mm)';
COMMENT ON COLUMN climate_zones.koppen IS 'Köppen climate classification code';
COMMENT ON COLUMN climate_zones.analog_location IS 'Real-world location with similar climate';
COMMENT ON COLUMN climate_zones.analog_lat IS 'Latitude of the analog location';
COMMENT ON COLUMN climate_zones.analog_lon IS 'Longitude of the analog location';

-- ============================================================================
-- Table: encounters
-- Purpose: Store normalized encounter types (creatures, dangers, NPCs, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    probability_by_region JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_encounters_slug ON encounters(slug);
CREATE INDEX IF NOT EXISTS idx_encounters_category ON encounters(category);
CREATE INDEX IF NOT EXISTS idx_encounters_name ON encounters(name);

COMMENT ON TABLE encounters IS 'Normalized encounter types (creatures, dangers, NPCs, etc.)';
COMMENT ON COLUMN encounters.id IS 'UUID primary key';
COMMENT ON COLUMN encounters.name IS 'Display name of the encounter';
COMMENT ON COLUMN encounters.slug IS 'URL-friendly unique identifier';
COMMENT ON COLUMN encounters.category IS 'Category (e.g., Animals, Inanimate_Dangers, Men, Orcs_Half_Orcs)';
COMMENT ON COLUMN encounters.probability_by_region IS 'Array of {region, probability} objects for each region';

-- ============================================================================
-- Table: entities
-- Purpose: Store Middle-earth entities (fauna, flora, creatures, races, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS entities (
    -- Identifiers
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic information
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,  -- 'humans', 'dwarves', 'elves', 'orcs', 'hobbits', 'plants', 'trees', 'water_animals', 'insects', 'undead', 'flying_animals', 'demons', 'drakes', 'amphibians', 'herbivores', 'riding_animals', 'other_animals', 'carnivores', 'giants', 'trolls', 'giant_insects', 'pukel', 'water_creatures'
    description TEXT,
    
    -- Multimedia
    url_path TEXT,  -- Path to image file (NULL for now)
    
    -- Geographic information
    region_id INTEGER REFERENCES regions(id) ON DELETE SET NULL,
    biomes TEXT[],  -- Array of biome names (e.g., '{marsh,desert,forest}')
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entities_slug ON entities(slug);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
CREATE INDEX IF NOT EXISTS idx_entities_region_id ON entities(region_id);

COMMENT ON TABLE entities IS 'Middle-earth entities (fauna, flora, creatures, races, etc.)';
COMMENT ON COLUMN entities.id IS 'UUID primary key';
COMMENT ON COLUMN entities.name IS 'Display name of the entity';
COMMENT ON COLUMN entities.slug IS 'URL-friendly unique identifier (lowercase with underscores)';
COMMENT ON COLUMN entities.type IS 'Entity type category';
COMMENT ON COLUMN entities.description IS 'Detailed description of the entity';
COMMENT ON COLUMN entities.url_path IS 'Path to image file (NULL for now)';
COMMENT ON COLUMN entities.region_id IS 'Foreign key to regions table';
COMMENT ON COLUMN entities.biomes IS 'Array of biome names where this entity can be found';

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
