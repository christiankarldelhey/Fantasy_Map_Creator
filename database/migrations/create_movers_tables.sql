-- Migration: Create movers seed family (Living Map)
-- Date: 2026-10-29
-- Description: Authored beings whose reach is a function of the in-world date
--   (TA 3017-3018). Immutable seed data: nothing at runtime writes here.
--   Vocabulary: backend/CONTEXT.md (Mover, Leg, March, Presence, Resident,
--   Trail, Crossing, Trace, Beat, Unease). Decision: ADR-0012.
-- Idempotent: safe to run on every deploy.
--
--   movers        — who it is (person / company / faceless host)
--   mover_legs    — the stretches of its story, each with a date window
--   mover_beats   — authored crossing content per leg (1:N for variants)
--   mover_trails  — baked day-by-day points (march legs only)

-- ============================================================================
-- Table: movers
-- ============================================================================
CREATE TABLE IF NOT EXISTS movers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        VARCHAR(255) UNIQUE NOT NULL,
    name        VARCHAR(255) NOT NULL,
    kind        TEXT NOT NULL,          -- 'person' | 'company' | 'host'
    canon       BOOLEAN NOT NULL DEFAULT false,
    motivation  TEXT,                   -- why they move; also fuels narration
    description TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_movers_kind') THEN
        ALTER TABLE movers
            ADD CONSTRAINT chk_movers_kind CHECK (kind IN ('person', 'company', 'host'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_movers_slug ON movers(slug);
CREATE INDEX IF NOT EXISTS idx_movers_kind ON movers(kind);

COMMENT ON TABLE movers IS 'Authored beings that move through the world on a calendar (Living Map). Read-only at runtime.';
COMMENT ON COLUMN movers.kind IS 'person (named individual), company (named group), host (faceless army/multitude)';
COMMENT ON COLUMN movers.motivation IS 'Why this mover moves — the political or personal reason behind its legs';

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
    mover_id    UUID NOT NULL REFERENCES movers(id) ON DELETE CASCADE,
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

    -- content
    trace       TEXT,                   -- authored distance-sign for this leg
    hostile     BOOLEAN NOT NULL DEFAULT false,  -- feeds region Unease

    created_at  TIMESTAMP DEFAULT NOW(),

    UNIQUE (mover_id, leg_index)
);

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
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_mover_legs_scope') THEN
        ALTER TABLE mover_legs
            ADD CONSTRAINT chk_mover_legs_scope CHECK (
                 (kind = 'march')
              OR (kind = 'presence' AND region_id IS NOT NULL)
              OR (kind = 'resident' AND (location_id IS NOT NULL OR location_type IS NOT NULL))
            );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mover_legs_mover    ON mover_legs(mover_id);
CREATE INDEX IF NOT EXISTS idx_mover_legs_region   ON mover_legs(region_id);
CREATE INDEX IF NOT EXISTS idx_mover_legs_location ON mover_legs(location_id);
CREATE INDEX IF NOT EXISTS idx_mover_legs_dates    ON mover_legs(date_from, date_to);

COMMENT ON TABLE mover_legs IS 'Legs of a mover story: march / presence / resident, each with its own window, visibility, trace and beats';
COMMENT ON COLUMN mover_legs.road_bias IS 'Per road_type level deltas for presence legs (e.g. {"off_road":2,"road_major":-2})';
COMMENT ON COLUMN mover_legs.hostile IS 'Active hostile leg tints its region with Unease';

-- ============================================================================
-- Table: mover_beats
-- Purpose: authored crossing content per leg. 1:N via variant — 'base' today,
--          room for seasonal/repeat variants without re-migrating.
-- ============================================================================
CREATE TABLE IF NOT EXISTS mover_beats (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leg_id   UUID NOT NULL REFERENCES mover_legs(id) ON DELETE CASCADE,
    variant  TEXT NOT NULL DEFAULT 'base',
    title    VARCHAR(255),
    text     TEXT NOT NULL,
    effects  JSONB NOT NULL DEFAULT '{}'::jsonb,  -- fixed v1 effects, e.g. {"shadow": -1}
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE (leg_id, variant)
);

CREATE INDEX IF NOT EXISTS idx_mover_beats_leg ON mover_beats(leg_id);

COMMENT ON TABLE mover_beats IS 'Authored encounter content of a leg: who is met, what they are doing, what it leaves';
COMMENT ON COLUMN mover_beats.effects IS 'Optional fixed effects applied by the crossing, e.g. {"shadow": -1, "info": "..."}';

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
