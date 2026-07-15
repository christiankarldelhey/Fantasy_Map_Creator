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
    region VARCHAR(100),  -- 'Eriador', 'Gondor', 'Rohan', etc. (legacy free-text)
    region_id INTEGER REFERENCES regions(id),  -- resolved from point-in-polygon

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
CREATE INDEX IF NOT EXISTS idx_locations_region_id ON locations(region_id);

-- Comments for documentation
COMMENT ON TABLE locations IS 'Point locations in Middle Earth (cities, castles, towns)';
COMMENT ON COLUMN locations.geom IS 'POINT geometry in EPSG:4326 (WGS84)';
COMMENT ON COLUMN locations.location_type IS 'Settlement type: city, castle, town, mansion, fortress, ruins';
COMMENT ON COLUMN locations.region_id IS 'Region containing the location point (resolved by point-in-polygon)';

-- ============================================================================
-- Table: places_interactions
-- Purpose: Narrative/mechanical effects for spending time in a place or region
-- ============================================================================

CREATE TABLE IF NOT EXISTS places_interactions (
    id                SERIAL PRIMARY KEY,
    interaction_type  TEXT    NOT NULL,          -- 'overnight' (only value for now)
    location_id       INTEGER REFERENCES locations(id),   -- nullable
    location_type     TEXT,                       -- 'village','town',… nullable
    region_id         INTEGER REFERENCES regions(id),     -- nullable
    cultural_family   TEXT,                       -- nullable
    title             TEXT,                       -- e.g. 'The Prancing Pony'
    description       TEXT    NOT NULL,           -- narrator reference material
    rest_quality      SMALLINT,                   -- 0..3
    shadow_effect     SMALLINT,                   -- -2..+2
    priority          SMALLINT NOT NULL DEFAULT 0 -- higher wins on tie
);

CREATE INDEX IF NOT EXISTS idx_pi_location  ON places_interactions(interaction_type, location_id);
CREATE INDEX IF NOT EXISTS idx_pi_type_reg  ON places_interactions(interaction_type, location_type, region_id);
CREATE INDEX IF NOT EXISTS idx_pi_type_fam  ON places_interactions(interaction_type, location_type, cultural_family);
CREATE INDEX IF NOT EXISTS idx_pi_region    ON places_interactions(interaction_type, region_id);
CREATE INDEX IF NOT EXISTS idx_pi_family    ON places_interactions(interaction_type, cultural_family);

ALTER TABLE places_interactions
  ADD CONSTRAINT chk_scope CHECK (
     (location_id IS NOT NULL)
  OR (location_type IS NOT NULL AND region_id IS NOT NULL)
  OR (location_type IS NOT NULL AND cultural_family IS NOT NULL)
  OR (location_type IS NOT NULL AND region_id IS NULL AND cultural_family IS NULL)
  OR (location_type IS NULL AND region_id IS NOT NULL)
  OR (location_type IS NULL AND cultural_family IS NOT NULL)
  );

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
    water_type VARCHAR(50) NOT NULL, -- 'river', 'stream', 'lake', 'sea'
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
    notes TEXT,  -- General notes
    people JSONB,  -- People information (symbol, military, population, description)
    source JSONB,  -- Source references (supplement, supplement_code)
    products TEXT,  -- Products/resources
    description_text TEXT,  -- Main description text
    description_summary TEXT,  -- Summary description of the region
    cultural_family TEXT,  -- Resolved from regions.geojson; drives lodging/night logic

    -- Statistics
    area_km2 DECIMAL,  -- Will be calculated with ST_Area
    
    -- Encounter metrics
    distance_for_encounter INTEGER,  -- Distance in kilometers to encounter location (rounded to nearest whole number)
    chance_of_encounter DECIMAL(5,2),  -- Percentage chance of encounter (0-100)
    hours_to_encounter DECIMAL(5,2),  -- Time in hours to reach encounter location
    
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
CREATE INDEX IF NOT EXISTS idx_regions_kingdom_id ON regions(kingdom_id);

COMMENT ON TABLE regions IS 'Regions, kingdoms and biomes of Middle Earth';
COMMENT ON COLUMN regions.area_km2 IS 'Area in square kilometers (calculated with ST_Area)';
COMMENT ON COLUMN regions.distance_for_encounter IS 'Distance in kilometers to encounter location (rounded to nearest whole number)';
COMMENT ON COLUMN regions.chance_of_encounter IS 'Percentage chance of encounter (0-100)';
COMMENT ON COLUMN regions.hours_to_encounter IS 'Time in hours to reach encounter location';

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
-- Table: entities
-- Purpose: Unified table for Middle-earth entities (fauna, flora, creatures, races, encounters)
-- ============================================================================

CREATE TABLE IF NOT EXISTS entities (
    -- Identifiers
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic information
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,  -- 'humans', 'dwarves', 'elves', 'orcs', 'hobbits', 'plants', 'trees', 'water_animals', 'insects', 'undead', 'flying_animals', 'demons', 'drakes', 'amphibians', 'herbivores', 'riding_animals', 'other_animals', 'carnivores', 'giants', 'trolls', 'giant_insects', 'pukel', 'water_creatures'
    active VARCHAR(50) DEFAULT 'all-day',  -- Activity pattern: 'day', 'night', 'all-day'
    tier VARCHAR(50),  -- Entity tier (e.g., encounter, etc.)
    parent_id UUID REFERENCES entities(id) ON DELETE SET NULL,  -- Parent entity for hierarchical relationships
    description TEXT,
    description_summary TEXT,  -- Summary description of the entity (used for encounter prompts)
    
    -- Multimedia
    url_path TEXT,  -- Path to image file (NULL for now)
    
    -- Geographic information
    region_ids INTEGER[],  -- Array of region IDs where this entity can be found
    biomes TEXT[],  -- Array of biome names (e.g., '{marsh,desert,forest}')
    
    -- Encounter probabilities
    probability_by_region JSONB DEFAULT '[]'::jsonb,  -- Array of {region, probability} objects

    -- Shadow weight: signed per-entity effect on the traveller's spirit.
    --   positive = darkens (dragon, undead, orcs), zero = neutral,
    --   negative = lightens (elves, good Maiar, a hobbit hearth).
    shadow_weight INT NOT NULL DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entities_slug ON entities(slug);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
CREATE INDEX IF NOT EXISTS idx_entities_region_ids ON entities USING GIN(region_ids);
CREATE INDEX IF NOT EXISTS idx_entities_parent_id ON entities(parent_id);

COMMENT ON TABLE entities IS 'Unified entities table combining previous entities and encounters data';
COMMENT ON COLUMN entities.id IS 'UUID primary key';
COMMENT ON COLUMN entities.name IS 'Display name of the entity';
COMMENT ON COLUMN entities.slug IS 'URL-friendly unique identifier (lowercase with underscores)';
COMMENT ON COLUMN entities.type IS 'Entity type category';
COMMENT ON COLUMN entities.active IS 'Activity pattern: day, night, or all-day';
COMMENT ON COLUMN entities.tier IS 'Entity tier (e.g., encounter, etc.)';
COMMENT ON COLUMN entities.parent_id IS 'Parent entity for hierarchical relationships';
COMMENT ON COLUMN entities.description IS 'Detailed description of the entity';
COMMENT ON COLUMN entities.description_summary IS 'Summary description of the entity (used for encounter prompts)';
COMMENT ON COLUMN entities.url_path IS 'Path to image file (NULL for now)';
COMMENT ON COLUMN entities.region_ids IS 'Array of region IDs where this entity can be found';
COMMENT ON COLUMN entities.biomes IS 'Array of biome names where this entity can be found';
COMMENT ON COLUMN entities.probability_by_region IS 'Array of {region, probability} objects for encounter probabilities';

-- ============================================================================
-- Table: character_state
-- Purpose: Store character/company state and location
-- ============================================================================

CREATE TABLE IF NOT EXISTS character_state (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    current_lng DOUBLE PRECISION,
    current_lat DOUBLE PRECISION,
    type VARCHAR(50),  -- Character type (e.g., Noldor, Sindar, Human, Dwarf)
    gender VARCHAR(20),  -- Character gender (male, female)
    active BOOLEAN DEFAULT false,  -- Whether this character is currently active
    description TEXT,  -- Character description
    entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
    system_prompt TEXT,  -- Custom narrator voice instructions for this character
    introduction_instructions TEXT,  -- Custom introduction instructions for this character
    -- Journey persistence: energy (the body) and shadow (the spirit)
    energy INT NOT NULL DEFAULT 100,          -- 0..100, live value (meaningful on clones)
    shadow INT NOT NULL DEFAULT 0,            -- 0..100, live value (meaningful on clones)
    energy_initial INT NOT NULL DEFAULT 100,  -- per-character starting energy (set on templates)
    shadow_initial INT NOT NULL DEFAULT 0,    -- per-character starting shadow (set on templates)
    last_rest_at TIMESTAMP,                   -- last time the traveller had a proper rest (rest_quality >= 2)
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_character_state_active ON character_state(active);

-- ============================================================================
-- Table: character_state_log
-- Purpose: Per-day trail of energy/shadow for a clone during a trip (the curve
--          and cross-day causal callbacks). The clone row holds the CURRENT
--          value; this log holds the history.
-- ============================================================================

CREATE TABLE IF NOT EXISTS character_state_log (
    id           SERIAL PRIMARY KEY,
    character_id INT  NOT NULL REFERENCES character_state(id),  -- the clone
    trip_id      UUID NOT NULL,
    day_number   INT  NOT NULL,
    energy       INT  NOT NULL,
    shadow       INT  NOT NULL,
    note         TEXT,            -- e.g. "fight with the bear", "slept at Rivendell"
    created_at   TIMESTAMP DEFAULT NOW(),
    UNIQUE (character_id, trip_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_character_state_log_char ON character_state_log(character_id, trip_id, day_number);

COMMENT ON TABLE character_state IS 'Character state and location tracking';
COMMENT ON COLUMN character_state.active IS 'Whether this character is currently active (only one can be active at a time)';
COMMENT ON COLUMN character_state.type IS 'Character type (e.g., Noldor, Sindar, Human, Dwarf)';
COMMENT ON COLUMN character_state.gender IS 'Character gender (male, female)';
COMMENT ON COLUMN character_state.system_prompt IS 'Custom narrator voice instructions for this character (replaces default SYSTEM_PROMPT)';
COMMENT ON COLUMN character_state.introduction_instructions IS 'Custom introduction instructions for this character (replaces default introduction)';

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
