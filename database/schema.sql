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

    -- Geographic location
    region VARCHAR(100),  -- 'Eriador', 'Gondor', 'Rohan', etc. (legacy free-text)
    region_id INTEGER,  -- → regions.id; resolved from point-in-polygon (FK lands below)

    -- Multimedia
    image_url TEXT,
    
    -- Narrative link
    depiction_id TEXT,  -- → places_narration.id (FK added below; mute gazetteer keeps no prose)

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- GEOMETRY (most important)
    geom GEOMETRY(Point, 4326),  -- NULL until the admin georef anchors the place
    
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
CREATE INDEX IF NOT EXISTS idx_locations_depiction ON locations(depiction_id) WHERE depiction_id IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE locations IS 'Point locations in Middle Earth (cities, castles, towns)';
COMMENT ON COLUMN locations.geom IS 'POINT geometry in EPSG:4326 (WGS84)';
COMMENT ON COLUMN locations.location_type IS 'Settlement type: city, castle, town, mansion, fortress, ruins';
COMMENT ON COLUMN locations.region_id IS 'Region containing the location point (resolved by point-in-polygon)';

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
    depiction_id TEXT,  -- → places_narration.id
    created_at TIMESTAMP DEFAULT NOW(),
    geom GEOMETRY(LineString, 4326) NOT NULL,
    CONSTRAINT valid_road_geometry CHECK (ST_IsValid(geom)),
    CONSTRAINT valid_road_srid CHECK (ST_SRID(geom) = 4326)
);

-- Spatial index
CREATE INDEX IF NOT EXISTS idx_roads_geom ON roads USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_roads_name ON roads(name);
CREATE INDEX IF NOT EXISTS idx_roads_depiction ON roads(depiction_id) WHERE depiction_id IS NOT NULL;

-- ============================================================================
-- Table: water
-- Purpose: Store water features (rivers, streams, lakes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS water (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    water_type VARCHAR(50) NOT NULL, -- 'river', 'stream', 'lake', 'sea'
    depiction_id TEXT,  -- → places_narration.id
    created_at TIMESTAMP DEFAULT NOW(),
    geom GEOMETRY(Geometry, 4326) NOT NULL, -- Supports both LineString (rivers) and Polygon (lakes)
    CONSTRAINT valid_water_geometry CHECK (ST_IsValid(geom)),
    CONSTRAINT valid_water_srid CHECK (ST_SRID(geom) = 4326)
);

-- Spatial index
CREATE INDEX IF NOT EXISTS idx_water_geom ON water USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_water_type ON water(water_type);
CREATE INDEX IF NOT EXISTS idx_water_depiction ON water(depiction_id) WHERE depiction_id IS NOT NULL;

-- ============================================================================
-- Table: kingdoms
-- Purpose: Store kingdoms/references for regions
-- ============================================================================

CREATE TABLE IF NOT EXISTS kingdoms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    depiction_id TEXT,  -- → places_narration.id (kingdom prose lives on the record)
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kingdoms_name ON kingdoms(name);
CREATE INDEX IF NOT EXISTS idx_kingdoms_depiction ON kingdoms(depiction_id) WHERE depiction_id IS NOT NULL;

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
    climate_zone_id INTEGER UNIQUE,  -- → climate_zones.id ON DELETE SET NULL (FK lands below)
    
    -- Prose lives in places_narration (the region's depiction record); this
    -- table carries only physical/political facts (#104).
    cultural_family TEXT,  -- Resolved from regions.geojson; drives lodging/night logic

    -- Statistics
    area_km2 DECIMAL,  -- Will be calculated with ST_Area
    
    -- Encounter metrics
    distance_for_encounter INTEGER,  -- Distance in kilometers to encounter location (rounded to nearest whole number)
    chance_of_encounter DECIMAL(5,2),  -- Percentage chance of encounter (0-100)
    hours_to_encounter DECIMAL(5,2),  -- Time in hours to reach encounter location
    
    -- Narrative link
    depiction_id TEXT,  -- → places_narration.id (region prose + facts live on the record)

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),

    -- GEOMETRY
    geom GEOMETRY(Geometry, 4326) NOT NULL,

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
CREATE INDEX IF NOT EXISTS idx_regions_depiction ON regions(depiction_id) WHERE depiction_id IS NOT NULL;

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

    -- Statistics
    area_km2 DECIMAL,  -- Will be calculated with ST_Area
    
    -- Narrative link
    depiction_id TEXT,  -- → places_narration.id

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),

    -- GEOMETRY
    geom GEOMETRY(Geometry, 4326) NOT NULL -- seed data mixes Polygon and MultiPolygon
);

-- Spatial index
CREATE INDEX IF NOT EXISTS idx_biomes_geom ON biomes USING GIST(geom);

-- Additional indexes
CREATE INDEX IF NOT EXISTS idx_biomes_type ON biomes(type);
CREATE INDEX IF NOT EXISTS idx_biomes_depiction ON biomes(depiction_id) WHERE depiction_id IS NOT NULL;

COMMENT ON TABLE biomes IS 'Environmental and geographic features (forests, mountains, rivers, etc.)';
COMMENT ON COLUMN biomes.name IS 'Biome name - standard type (e.g., Forest) or specific name (e.g., Fangorn)';
COMMENT ON COLUMN biomes.type IS 'Biome category: forest, hills, marsh, mountains, river, lake, plateau, barrow';

-- ============================================================================
-- Table: places_narration
-- Purpose: All quiet narrative over a mute gazetteer — one canonical record
--          shape for every voice the world has (ADR-0014/0015). Records carry
--          no geometry: position is borrowed from the anchor location, a
--          feature's depiction_id, or a scope (type × region_id ×
--          cultural_family). kind says what the voice is anchored to, not
--          which legacy table it came from: 'place' is a location ficha with
--          radii; 'ambient' is every other scope-bound voice (region, biome,
--          water, arrival, lore). Every record may carry every prose field —
--          aspect is the face seen from outside, presence what being there
--          is like. A record may also own Situations — the authored moments
--          it can speak, gated by tags/when; what the traveller does inside
--          them lives in `interactions`. Conditional content gates on
--          universal tags
--          (see narration_tags / tags.json), not per-kind condition strings.
--          Seed data: database/seeds/data/json/places.json (authored fichas)
--          + narration.json (generated dep:* / ovn:* records).
-- ============================================================================

CREATE TABLE IF NOT EXISTS places_narration (
    id                  TEXT PRIMARY KEY,                -- ficha code: 'E-01', 'dep:loc:…', 'ovn:*'
    kind                TEXT NOT NULL CHECK (kind IN ('place', 'ambient')),
    location_id         INTEGER REFERENCES locations(id), -- hosted-at anchor (1:N); NULL until positioned
    region_id           INTEGER REFERENCES regions(id),  -- scope region (first of region_ids)
    region_ids          INTEGER[],                       -- authored multi-region list
    name                JSONB,                           -- {en, es}
    type                JSONB,                           -- {en, es} — scope matching uses ->>'en'
    cultural_family     TEXT,                            -- scope dimension for generic records
    priority            SMALLINT NOT NULL DEFAULT 0,     -- tie-breaker between competing records
    tags                TEXT[] NOT NULL DEFAULT '{}',    -- thematic tags ('people','vista',…)
    size_radius_km      NUMERIC(8,2),                    -- traveller is AT the record's place
    influence_radius_km NUMERIC(8,2),                    -- askable / felt from afar

    -- Universal prose slots — any record may carry any of them
    aspect              JSONB,                           -- {en, es}: the face seen from outside, up close
    sighted_far         JSONB,                           -- {en, es}: the silhouette from beyond reach, before it is known
    presence            JSONB,                           -- {en, es}: what being there is like
    lore                JSONB,                           -- {en, es}: background, history, what is known
    secret              JSONB,                           -- {when: {en,es}, text: {en,es}}
    sections            JSONB,                           -- [{key, en, es}]
    facts               JSONB,                           -- structured gazetteer reference data
    notes               JSONB,                           -- {en, es} author/narrator notes
    channel             JSONB,                           -- {en, es}: dominant sense/theme of the voice
    traveller_use       JSONB,                           -- {en, es}: what the traveller can do with it

    -- Conditional prose: [{id?, text: {en,es}, tags: [], not_tags: [], when: {en,es}}]
    variants            JSONB,
    -- Ordered prose list consumed one entry per day (region summaries)
    rotation            JSONB,

    -- Situation descriptors: [{id, tags, not_tags, when, once, mind,
    --   situation: {en,es}, stance: {en,es}}] — gating + prose only.
    --   The executable options (acts, effects) live in `interactions`,
    --   linked by payload.situation → situations[].id.
    situations          JSONB,

    refs                JSONB,                           -- authored feature bindings → depiction_id
    payload             JSONB NOT NULL DEFAULT '{}'::jsonb  -- provenance only (origin, legacy_id, anchor_hint)
);

CREATE INDEX IF NOT EXISTS idx_pn_kind      ON places_narration(kind);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'places_narration' AND column_name = 'region_id') THEN
    CREATE INDEX IF NOT EXISTS idx_pn_region ON places_narration(region_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_pn_location  ON places_narration(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pn_region_ids ON places_narration USING GIN(region_ids);
CREATE INDEX IF NOT EXISTS idx_pn_tags      ON places_narration USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_pn_payload   ON places_narration USING GIN(payload);

COMMENT ON TABLE  places_narration IS 'One canonical record for every voice the world has (ADR-0014/0015)';
COMMENT ON COLUMN places_narration.kind IS 'place (anchored ficha) | ambient (scope-bound voice)';
COMMENT ON COLUMN places_narration.location_id IS 'Hosted-at anchor to a gazetteer location; NULL until positioned';
COMMENT ON COLUMN places_narration.region_ids IS 'Authored multi-region list; scope region is its first element';
COMMENT ON COLUMN places_narration.aspect IS 'The face seen from outside, up close {en, es}';
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'places_narration' AND column_name = 'region_id') THEN
    COMMENT ON COLUMN places_narration.region_id IS 'Scope region for the resolver ladder (first of region_ids)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'places_narration' AND column_name = 'sighted_far') THEN
    COMMENT ON COLUMN places_narration.sighted_far IS 'The silhouette seen from beyond reach — what a place reads as before it is known {en, es}';
  END IF;
END $$;
COMMENT ON COLUMN places_narration.presence IS 'What being there is like {en, es}';
COMMENT ON COLUMN places_narration.situations IS 'Situation descriptors: tag-gated authored moments (prose + gates); their options live in `interactions`';

-- ============================================================================
-- Table: narration_tags
-- Purpose: Closed registry of gating/driver tags (ADR-0015) seeded from
--          database/seeds/data/json/tags.json. World and Mind emit a tag set
--          each moment; conditional content declares tags/not_tags against
--          this vocabulary. value='*' marks a pattern family (any value
--          matching the seed's pattern is legal, e.g. region_day:12).
-- ============================================================================

CREATE TABLE IF NOT EXISTS narration_tags (
    family      TEXT NOT NULL,
    value       TEXT NOT NULL,                 -- concrete value or '*'
    description JSONB,                          -- {en, es}
    PRIMARY KEY (family, value)
);

COMMENT ON TABLE narration_tags IS 'Closed registry of gating/driver tags (ADR-0015)';
COMMENT ON COLUMN places_narration.refs IS 'Authored feature bindings {table-key: [ids]}; materializes to depiction_id';
COMMENT ON COLUMN places_narration.cultural_family IS 'Scope dimension for generic records';
COMMENT ON COLUMN places_narration.priority IS 'Tie-breaker when several records match a scope';
COMMENT ON COLUMN places_narration.size_radius_km IS 'Within it the traveller is AT the place';
COMMENT ON COLUMN places_narration.influence_radius_km IS 'Within it the place is askable and felt from afar';
COMMENT ON COLUMN places_narration.payload IS 'Kind-unique spec + provenance only — never scalar copies of columns';

-- The described-as link: every gazetteer feature may point at the single
-- narration record that depicts it. Columns are declared on the tables
-- above; the FKs land here once places_narration exists (mirror of
-- add_depiction_id_to_geometry_tables.sql / _to_kingdoms.sql).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'locations_depiction_id_fkey') THEN
    ALTER TABLE locations ADD CONSTRAINT locations_depiction_id_fkey
      FOREIGN KEY (depiction_id) REFERENCES places_narration(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'water_depiction_id_fkey') THEN
    ALTER TABLE water ADD CONSTRAINT water_depiction_id_fkey
      FOREIGN KEY (depiction_id) REFERENCES places_narration(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'biomes_depiction_id_fkey') THEN
    ALTER TABLE biomes ADD CONSTRAINT biomes_depiction_id_fkey
      FOREIGN KEY (depiction_id) REFERENCES places_narration(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roads_depiction_id_fkey') THEN
    ALTER TABLE roads ADD CONSTRAINT roads_depiction_id_fkey
      FOREIGN KEY (depiction_id) REFERENCES places_narration(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'regions_depiction_id_fkey') THEN
    ALTER TABLE regions ADD CONSTRAINT regions_depiction_id_fkey
      FOREIGN KEY (depiction_id) REFERENCES places_narration(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kingdoms_depiction_id_fkey') THEN
    ALTER TABLE kingdoms ADD CONSTRAINT kingdoms_depiction_id_fkey
      FOREIGN KEY (depiction_id) REFERENCES places_narration(id) ON DELETE SET NULL;
  END IF;
END $$;

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

-- Deferred foreign keys for references declared before their tables exist in
-- this file's creation order (locations → regions, regions → climate_zones).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'locations_region_id_fkey') THEN
    ALTER TABLE locations ADD CONSTRAINT locations_region_id_fkey
      FOREIGN KEY (region_id) REFERENCES regions(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'regions_climate_zone_id_fkey') THEN
    ALTER TABLE regions ADD CONSTRAINT regions_climate_zone_id_fkey
      FOREIGN KEY (climate_zone_id) REFERENCES climate_zones(id) ON DELETE SET NULL;
  END IF;
END $$;

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

    -- Whether this entity is an NPC (can talk / interact socially).
    --   true for humans, elves, dwarves, hobbits, orcs, maiar, living_trees, undead, drakes.
    --   false for animals, plants, hazards, etc.
    is_npc BOOLEAN NOT NULL DEFAULT false,

    -- Home anchor: where this entity lives — place hosts only.
    --   NULL for roamers (encounter draws, mover legs, hazards).
    --   Several entities may share one location (a household).
    location_id INTEGER REFERENCES locations(id),

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entities_slug ON entities(slug);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
CREATE INDEX IF NOT EXISTS idx_entities_region_ids ON entities USING GIN(region_ids);
CREATE INDEX IF NOT EXISTS idx_entities_parent_id ON entities(parent_id);
CREATE INDEX IF NOT EXISTS idx_entities_location_id ON entities(location_id) WHERE location_id IS NOT NULL;

COMMENT ON TABLE entities IS 'Unified entities table combining previous entities and encounters data';
COMMENT ON COLUMN entities.id IS 'UUID primary key';
COMMENT ON COLUMN entities.name IS 'Display name of the entity';
COMMENT ON COLUMN entities.slug IS 'URL-friendly unique identifier (lowercase with underscores)';
COMMENT ON COLUMN entities.type IS 'Entity type category';
COMMENT ON COLUMN entities.active IS 'Activity pattern: day, night, or all-day';
COMMENT ON COLUMN entities.tier IS 'Entity tier: encounter (procedural pool), group, mover (being with an agenda)';
COMMENT ON COLUMN entities.parent_id IS 'Parent entity for hierarchical relationships';
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
    race TEXT,  -- Narration race-gate value (race:* tags on entities_narration): dunedain, elf, ...
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
    resistance INT NOT NULL DEFAULT 0,        -- bonus to resistance rolls
    permadeath BOOLEAN NOT NULL DEFAULT false,-- if true, a slain outcome ends the trip
    status TEXT NOT NULL DEFAULT 'alive',     -- alive or dead
    -- Skills (0-10, fixed per character, copied to clones from their template)
    skill_tracking INT NOT NULL DEFAULT 0 CHECK (skill_tracking BETWEEN 0 AND 10),
    skill_persuasion INT NOT NULL DEFAULT 0 CHECK (skill_persuasion BETWEEN 0 AND 10),
    skill_ranged INT NOT NULL DEFAULT 0 CHECK (skill_ranged BETWEEN 0 AND 10),
    skill_melee INT NOT NULL DEFAULT 0 CHECK (skill_melee BETWEEN 0 AND 10),
    skill_lore INT NOT NULL DEFAULT 0 CHECK (skill_lore BETWEEN 0 AND 10),
    skill_stealth INT NOT NULL DEFAULT 0 CHECK (skill_stealth BETWEEN 0 AND 10),
    skill_endurance INT NOT NULL DEFAULT 0 CHECK (skill_endurance BETWEEN 0 AND 10),
    skill_insight INT NOT NULL DEFAULT 0 CHECK (skill_insight BETWEEN 0 AND 10),
    skill_deception INT NOT NULL DEFAULT 0 CHECK (skill_deception BETWEEN 0 AND 10),
    skill_intimidation INT NOT NULL DEFAULT 0 CHECK (skill_intimidation BETWEEN 0 AND 10),
    -- Persistent conditions: causes behind the energy level, separate from
    -- the one-off wound cost applied per encounter outcome.
    fatigue INT NOT NULL DEFAULT 0 CHECK (fatigue BETWEEN 0 AND 100),
    wounded TEXT NOT NULL DEFAULT 'none' CHECK (wounded IN ('none', 'wounded', 'badly_wounded')),
    sick BOOLEAN NOT NULL DEFAULT false,
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
    fate         TEXT,            -- end-of-day fate (living, slain, dead_exhaustion, etc.)
    fatigue      INT,             -- persistent fatigue condition at end of day (0-100)
    wounded      TEXT,            -- persistent wound condition at end of day
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
-- Tables: mover_legs, mover_trails
-- Purpose: Living Map — authored beings whose reach is a function of the
--          in-world date (TA 3017-3018). Immutable seed data. Identity lives
--          in entities (tier='mover'); the old `movers` table is gone.
--          Canonical DDL lives in database/migrations/ (applied by
--          ensureSchema in load-seeds.js); kept here in sync for reference.
-- Vocabulary: backend/CONTEXT.md. Decision: docs/adr/0012.
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaigns (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        VARCHAR(255) UNIQUE NOT NULL,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON campaigns(slug);

CREATE TABLE IF NOT EXISTS mover_legs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id   UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id),
    leg_index   INT NOT NULL,
    kind        TEXT NOT NULL,          -- 'march' | 'presence' | 'resident'
    date_from   DATE NOT NULL,
    date_to     DATE NOT NULL,
    region_id   INTEGER REFERENCES regions(id),
    location_id   INTEGER REFERENCES locations(id),
    location_type TEXT,
    level       INT,
    road_bias   JSONB NOT NULL DEFAULT '{}'::jsonb,
    notice_radius_km  NUMERIC,
    contact_radius_km NUMERIC,
    visibility  TEXT NOT NULL DEFAULT 'signs',
    greeting    BOOLEAN NOT NULL DEFAULT false,
    active_phases TEXT[] NOT NULL DEFAULT '{morning,afternoon,before_sleep,mid_night}',
    hostile     BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE (entity_id, leg_index),
    CONSTRAINT chk_mover_legs_kind CHECK (kind IN ('march', 'presence', 'resident')),
    CONSTRAINT chk_mover_legs_visibility CHECK (visibility IN ('visible', 'signs', 'hidden')),
    CONSTRAINT chk_mover_legs_window CHECK (date_to >= date_from),
    CONSTRAINT chk_mover_legs_level CHECK (level IS NULL OR level BETWEEN 1 AND 8),
    CONSTRAINT chk_mover_legs_phases CHECK (
        active_phases <@ '{morning,afternoon,before_sleep,mid_night}'::text[]
        AND array_length(active_phases, 1) >= 1
    ),
    CONSTRAINT chk_mover_legs_scope CHECK (
         (kind = 'march')
      OR (kind = 'presence' AND region_id IS NOT NULL)
      OR (kind = 'resident' AND (location_id IS NOT NULL OR location_type IS NOT NULL))
    )
);
CREATE INDEX IF NOT EXISTS idx_mover_legs_entity   ON mover_legs(entity_id);
CREATE INDEX IF NOT EXISTS idx_mover_legs_campaign ON mover_legs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_mover_legs_region   ON mover_legs(region_id);
CREATE INDEX IF NOT EXISTS idx_mover_legs_location ON mover_legs(location_id);
CREATE INDEX IF NOT EXISTS idx_mover_legs_dates    ON mover_legs(date_from, date_to);

CREATE TABLE IF NOT EXISTS mover_trails (
    id      BIGSERIAL PRIMARY KEY,
    leg_id  UUID NOT NULL REFERENCES mover_legs(id) ON DELETE CASCADE,
    date    DATE NOT NULL,
    geom    GEOMETRY(Point, 4326) NOT NULL,
    CONSTRAINT valid_trail_geometry CHECK (ST_IsValid(geom)),
    CONSTRAINT valid_trail_srid CHECK (ST_SRID(geom) = 4326),
    UNIQUE (leg_id, date)
);
CREATE INDEX IF NOT EXISTS idx_mover_trails_geom ON mover_trails USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_mover_trails_date ON mover_trails(date);
CREATE INDEX IF NOT EXISTS idx_mover_trails_leg  ON mover_trails(leg_id);

-- ============================================================================
-- Table: entities_narration
-- Purpose: the voice of beings — sibling of places_narration, same record
--          anatomy. Absorbs encounter_forms (kind='form'), npc_interactions
--          (kind='contact') and entity prose (kind='entity'). Facts stay on
--          entities (procedural presence) and mover_legs (scheduled presence).
--          See docs/design/entities-narration.md.
-- ============================================================================

CREATE TABLE IF NOT EXISTS entities_narration (
    id              TEXT PRIMARY KEY,              -- 'ent:*' | 'form:*' | 'cnt:*'
    kind            TEXT NOT NULL
                    CHECK (kind IN ('entity', 'form', 'contact')),
    entity_id       UUID REFERENCES entities(id),
    entity_ids      UUID[],
    entity_type     TEXT,
    family          TEXT,
    mover_leg_id    UUID REFERENCES mover_legs(id) ON DELETE CASCADE,
    region_id       INTEGER REFERENCES regions(id),
    region_ids      INTEGER[],
    location_id     INTEGER REFERENCES locations(id),
    cultural_family TEXT,
    form            TEXT,
    priority        SMALLINT NOT NULL DEFAULT 0,
    tags            TEXT[] NOT NULL DEFAULT '{}',

    aspect          JSONB,
    presence        JSONB,
    lore            JSONB,
    secret          JSONB,
    sections        JSONB,
    facts           JSONB,
    notes           JSONB,
    channel         JSONB,
    traveller_use   JSONB,
    variants        JSONB,
    rotation        JSONB,
    situations      JSONB,
    disposition     JSONB,

    weight          INTEGER,
    intensity       INTEGER,
    min_danger      INTEGER,
    max_danger      INTEGER,
    triggers_roll   BOOLEAN,

    payload         JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_en_kind        ON entities_narration(kind);
CREATE INDEX IF NOT EXISTS idx_en_entity      ON entities_narration(entity_id)      WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_en_entity_ids  ON entities_narration USING GIN(entity_ids);
CREATE INDEX IF NOT EXISTS idx_en_entity_type ON entities_narration(entity_type)    WHERE entity_type IS NOT NULL;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'entities_narration' AND column_name = 'family') THEN
    CREATE INDEX IF NOT EXISTS idx_en_family     ON entities_narration(family) WHERE family IS NOT NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_en_mover_leg   ON entities_narration(mover_leg_id)   WHERE mover_leg_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_en_region      ON entities_narration(region_id)      WHERE region_id IS NOT NULL;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'entities_narration' AND column_name = 'region_ids') THEN
    CREATE INDEX IF NOT EXISTS idx_en_region_ids ON entities_narration USING GIN(region_ids);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_en_location    ON entities_narration(location_id)    WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_en_form        ON entities_narration(form)           WHERE form IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_en_scope       ON entities_narration(kind, entity_type, region_id, form);
CREATE INDEX IF NOT EXISTS idx_en_tags        ON entities_narration USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_en_payload     ON entities_narration USING GIN(payload);

COMMENT ON TABLE  entities_narration IS 'The voice of beings — sibling of places_narration. entity ficha | contact-shape draw | contact substance';
COMMENT ON COLUMN entities_narration.kind IS 'entity (ficha) | form (contact-shape draw) | contact (substance per scope+form)';
COMMENT ON COLUMN entities_narration.mover_leg_id IS 'Narrowest scope: this record exists while that leg is live; mover_beats arrive as variants';
COMMENT ON COLUMN entities_narration.form IS 'Contact-shape key (glimpsed_far, stalks, parley…); on contact rows NULL = wildcard';
COMMENT ON COLUMN entities_narration.disposition IS 'How the being is disposed in the contact {en, es} (was npc_attitude)';

-- ============================================================================
-- Table: interactions
-- What the traveller can do inside a Situation. One row per option — a lone
-- row means an inevitable action. Every row points to exactly one parent
-- Situation (places_narration XOR entities_narration). Outcomes mutate host
-- Condition only — body, items, coins, lodging, shadow; never Mood.
-- ============================================================================

CREATE TABLE IF NOT EXISTS interactions (
    id                      TEXT PRIMARY KEY,
    places_narration_id     TEXT REFERENCES places_narration(id)   ON DELETE CASCADE,
    entities_narration_id   TEXT REFERENCES entities_narration(id) ON DELETE CASCADE,

    act                     TEXT NOT NULL,        -- Mind-owned closed vocabulary
    label                   JSONB,                -- {en, es} — player-facing choice text
    need_tags               TEXT[] NOT NULL DEFAULT '{}',
    skill                   JSONB,                -- {name, min?, difficulty?}; NULL = automatic success
    outcomes                JSONB NOT NULL,       -- {success:{text?,effects[]}, failure?}
    payload                 JSONB NOT NULL DEFAULT '{}',
    created_at              TIMESTAMP DEFAULT NOW(),

    CONSTRAINT interactions_one_parent
        CHECK (num_nonnulls(places_narration_id, entities_narration_id) = 1)
);

CREATE INDEX IF NOT EXISTS idx_interactions_place
    ON interactions(places_narration_id)   WHERE places_narration_id   IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interactions_entity
    ON interactions(entities_narration_id) WHERE entities_narration_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interactions_act ON interactions(act);

COMMENT ON TABLE interactions IS
    'What the traveller can do inside a Situation. One row per option — a lone row means an inevitable action (destino manifiesto). Outcomes mutate host Condition only.';
COMMENT ON COLUMN interactions.act IS
    'Mind-owned closed vocabulary (approach/avoid/talk/trade/accept/help/defy/rest). Shared by preference scoring and Event representation.';
COMMENT ON COLUMN interactions.outcomes IS
    '{success, failure?} each {text?, effects: typed list}. Effects touch host Condition only — body, items, coins, lodging, shadow. Never Mood.';

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
