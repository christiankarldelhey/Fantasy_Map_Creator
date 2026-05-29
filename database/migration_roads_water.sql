-- ============================================================================
-- Migration: Split paths into roads and water tables, and migrate lakes from biomes
-- ============================================================================

BEGIN;

-- 1. Create roads table
CREATE TABLE IF NOT EXISTS roads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    terrain_type VARCHAR(50),
    difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
    cost_factor DECIMAL DEFAULT 1.0,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    geom GEOMETRY(LineString, 4326) NOT NULL,
    CONSTRAINT valid_road_geom CHECK (ST_IsValid(geom)),
    CONSTRAINT valid_road_srid CHECK (ST_SRID(geom) = 4326)
);

CREATE INDEX IF NOT EXISTS idx_roads_geom ON roads USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_roads_name ON roads(name);

-- 2. Create water table
CREATE TABLE IF NOT EXISTS water (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    water_type VARCHAR(50) NOT NULL, -- 'river', 'stream', 'lake'
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    geom GEOMETRY(Geometry, 4326) NOT NULL, -- Generic Geometry to support LineString and Polygon
    CONSTRAINT valid_water_geom CHECK (ST_IsValid(geom)),
    CONSTRAINT valid_water_srid CHECK (ST_SRID(geom) = 4326)
);

CREATE INDEX IF NOT EXISTS idx_water_geom ON water USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_water_type ON water(water_type);

-- 3. Migrate paths of type 'road' to roads
INSERT INTO roads (name, terrain_type, difficulty, cost_factor, description, created_at, geom)
SELECT name, terrain_type, difficulty, cost_factor, description, created_at, geom
FROM paths
WHERE path_type = 'road';

-- 4. Migrate paths of type 'river' and 'stream' to water
INSERT INTO water (name, water_type, description, created_at, geom)
SELECT name, path_type, description, created_at, geom
FROM paths
WHERE path_type IN ('river', 'stream');

-- 5. Migrate biomes of type 'lake' to water
INSERT INTO water (name, water_type, description, created_at, geom)
SELECT name, 'lake', description, created_at, geom
FROM biomes
WHERE type = 'lake';

-- 6. Delete lakes from biomes
DELETE FROM biomes
WHERE type = 'lake';

-- 7. Drop the old paths table
DROP TABLE IF EXISTS paths;

COMMIT;
