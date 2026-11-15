-- Migration: Create movers seed family (Living Map)
-- Date: 2026-10-29
-- Description: Authored beings whose reach is a function of the in-world date
--   (TA 3017-3018). Immutable seed data: nothing at runtime writes here.
--   Vocabulary: backend/CONTEXT.md (Mover, Leg, March, Presence, Resident,
--   Trail, Crossing, Trace, Beat, Unease). Decision: ADR-0012.
-- Idempotent: safe to run on every deploy.
--
--   entities      — who it is: the being row (tier='mover'), shared identity
--   mover_legs    — the stretches of its story, each with a date window
--   mover_trails  — baked day-by-day points (march legs only)
--
--   (the standalone `movers` table was dropped: identity unified into
--    entities — see movers_identity_into_entities.sql; mover_beats dropped
--    too: authored leg content lives in entities_narration variants)

CREATE TABLE IF NOT EXISTS campaigns (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        VARCHAR(255) UNIQUE NOT NULL,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON campaigns(slug);

COMMENT ON TABLE campaigns IS 'Named story arcs that relate legs across different movers (e.g. the hunt for Gollum)';

-- ============================================================================
-- Table: mover_legs
-- Purpose: one stretch of a mover's story — where it is and what it is doing
--          over a window of dates. Three kinds:
--            march    — follows a baked trail (mover_trails rows)
--            presence — roams a region; joins the phase pool as a flagged entry
--            resident — anchored to a place; met when the traveller stops
-- ============================================================================
CREATE TABLE IF NOT EXISTS mover_legs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id   UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id),  -- which story this leg serves
    leg_index   INT NOT NULL,

    kind        TEXT NOT NULL,          -- 'march' | 'presence' | 'resident'
    date_from   DATE NOT NULL,
    date_to     DATE NOT NULL,

    -- presence scope
    region_id   INTEGER REFERENCES regions(id),

    -- resident scope (places_interactions-style)
    location_id   INTEGER REFERENCES locations(id),
    location_type TEXT,

    -- presence pool entry
    level       INT,                    -- 1-8, same scale as entities' probability levels
    road_bias   JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {road_type: level_delta}

    -- march reach
    notice_radius_km  NUMERIC,          -- distance sign: a Trace, not an encounter
    contact_radius_km NUMERIC,          -- inside this = a Crossing

    visibility  TEXT NOT NULL DEFAULT 'signs',  -- 'visible' | 'signs' | 'hidden'

    -- resident behaviour
    greeting    BOOLEAN NOT NULL DEFAULT false,  -- true: also fires on pass-through

    -- day-phase availability: the day's four windows
    -- (morning / afternoon / before_sleep / mid_night)
    active_phases TEXT[] NOT NULL DEFAULT '{morning,afternoon,before_sleep,mid_night}',

    -- content
    hostile     BOOLEAN NOT NULL DEFAULT false,  -- feeds region Unease

    created_at  TIMESTAMP DEFAULT NOW(),

    UNIQUE (entity_id, leg_index)
);

-- Upgrade path for DBs where the table exists already — must run BEFORE the
-- constraint guards below (chk_mover_legs_phases reads active_phases).
ALTER TABLE mover_legs
    ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id),
    ADD COLUMN IF NOT EXISTS active_phases TEXT[] NOT NULL DEFAULT '{morning,afternoon,before_sleep,mid_night}';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_mover_legs_kind') THEN
        ALTER TABLE mover_legs
            ADD CONSTRAINT chk_mover_legs_kind CHECK (kind IN ('march', 'presence', 'resident'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_mover_legs_visibility') THEN
        ALTER TABLE mover_legs
            ADD CONSTRAINT chk_mover_legs_visibility CHECK (visibility IN ('visible', 'signs', 'hidden'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_mover_legs_window') THEN
        ALTER TABLE mover_legs
            ADD CONSTRAINT chk_mover_legs_window CHECK (date_to >= date_from);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_mover_legs_level') THEN
        ALTER TABLE mover_legs
            ADD CONSTRAINT chk_mover_legs_level CHECK (level IS NULL OR level BETWEEN 1 AND 8);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_mover_legs_phases') THEN
        ALTER TABLE mover_legs
            ADD CONSTRAINT chk_mover_legs_phases CHECK (
                active_phases <@ '{morning,afternoon,before_sleep,mid_night}'::text[]
                AND array_length(active_phases, 1) >= 1
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_mover_legs_scope') THEN
        ALTER TABLE mover_legs
            ADD CONSTRAINT chk_mover_legs_scope CHECK (
                 (kind = 'march')
              OR (kind = 'presence' AND region_id IS NOT NULL)
              OR (kind = 'resident' AND (location_id IS NOT NULL OR location_type IS NOT NULL))
            );
    END IF;
END $$;

DO $$
BEGIN
    -- Sur une base ancienne la colonne s'appelle encore mover_id : la
    -- migration movers_identity_into_entities.sql la renomme juste après.
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'mover_legs' AND column_name = 'entity_id') THEN
        CREATE INDEX IF NOT EXISTS idx_mover_legs_entity ON mover_legs(entity_id);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_mover_legs_campaign ON mover_legs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_mover_legs_region   ON mover_legs(region_id);
CREATE INDEX IF NOT EXISTS idx_mover_legs_location ON mover_legs(location_id);
CREATE INDEX IF NOT EXISTS idx_mover_legs_dates    ON mover_legs(date_from, date_to);

COMMENT ON TABLE mover_legs IS 'Legs of a mover story: march / presence / resident, each with its own window, visibility, trace and beats';
COMMENT ON COLUMN mover_legs.campaign_id IS 'The story arc this leg belongs to (legs across movers share a campaign)';
COMMENT ON COLUMN mover_legs.road_bias IS 'Per road_type level deltas for presence legs (e.g. {"off_road":2,"road_major":-2})';
COMMENT ON COLUMN mover_legs.active_phases IS 'Day windows in which this leg can produce a crossing (morning/afternoon/before_sleep/mid_night)';
COMMENT ON COLUMN mover_legs.hostile IS 'Active hostile leg tints its region with Unease';

-- ============================================================================
-- Table: mover_trails
-- Purpose: baked day-by-day positions of march legs. Produced by the
--          authoring bake (drawn GeoJSON -> daily resample); read-only here.
-- ============================================================================
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

COMMENT ON TABLE mover_trails IS 'Baked day-by-day positions of march legs — the immutable living-map trail';
