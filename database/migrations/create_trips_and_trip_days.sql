-- Migration: Create trips and trip_days tables
-- Date: 2026-06-21
-- Description: Persistence for the Trip / Day generator.
--              - trips: stores a journey, its computed route and metadata
--              - trip_days: stores each generated day (geo sampling, climate,
--                encounters by hour, generated prompt and AI narrative)

-- ============================================================================
-- Table: trips
-- ============================================================================
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(255),

    -- Endpoints
    start_lng DOUBLE PRECISION NOT NULL,
    start_lat DOUBLE PRECISION NOT NULL,
    end_lng DOUBLE PRECISION NOT NULL,
    end_lat DOUBLE PRECISION NOT NULL,

    transport_mode VARCHAR(20) NOT NULL DEFAULT 'walk',

    -- Start date (mapped to the 1950 climate dataset year)
    start_date DATE NOT NULL,

    -- Full output of the directions/routing service
    route JSONB NOT NULL,

    -- Summary metrics
    total_distance_km DOUBLE PRECISION,
    total_time_hours DOUBLE PRECISION,

    -- How many days have been generated so far
    current_day INTEGER NOT NULL DEFAULT 0,

    -- Consumed region-description indices per trip (for rotating descriptions)
    used_region_descriptions JSONB DEFAULT '{}',

    -- Journey status and end-state tracking
    status    TEXT NOT NULL DEFAULT 'active',
    end_cause TEXT,
    ended_at  TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE trips
  ADD CONSTRAINT IF NOT EXISTS chk_trips_status CHECK (status IN ('active', 'dead', 'completed'));

COMMENT ON TABLE trips IS 'Journeys with their computed route and metadata';
COMMENT ON COLUMN trips.route IS 'Full GeoJSON output of the directions/routing service';
COMMENT ON COLUMN trips.start_date IS 'Journey start date (mapped to 1950 climate dataset)';
COMMENT ON COLUMN trips.current_day IS 'Number of days generated so far';

-- ============================================================================
-- Table: trip_days
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,

    day_number INTEGER NOT NULL,
    date DATE NOT NULL,

    -- Day start (previous camp) and end (camp) positions
    start_lng DOUBLE PRECISION NOT NULL,
    start_lat DOUBLE PRECISION NOT NULL,
    end_lng DOUBLE PRECISION NOT NULL,
    end_lat DOUBLE PRECISION NOT NULL,

    -- Distance/time actually covered this day
    distance_km DOUBLE PRECISION,
    walking_hours DOUBLE PRECISION,

    -- Geo sampling along the day's leg
    geometry JSONB,        -- LineString of the leg covered this day
    regions JSONB,         -- ordered regions crossed
    biomes JSONB,          -- biomes crossed
    altitude JSONB,        -- altitude/elevation types crossed
    road_types JSONB,      -- road / trail / off_road usage
    locations JSONB,       -- locations passed through
    climate JSONB,         -- climate for the day

    -- Encounters: array of { hour, phase, region, entity }
    encounters JSONB DEFAULT '[]'::jsonb,

    -- Prompt built without AI, and the AI-generated narrative (filled later)
    prompt TEXT,
    narrative TEXT,

    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_trip_day UNIQUE (trip_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_trip_days_trip_id ON trip_days(trip_id);

COMMENT ON TABLE trip_days IS 'Per-day generated content of a trip';
COMMENT ON COLUMN trip_days.encounters IS 'Array of { hour, phase, region, entity } objects';
COMMENT ON COLUMN trip_days.prompt IS 'Structured prompt built without AI';
COMMENT ON COLUMN trip_days.narrative IS 'AI-generated chapter (filled later)';

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'trips' AS table_name, COUNT(*) AS rows FROM trips
UNION ALL
SELECT 'trip_days', COUNT(*) FROM trip_days;
