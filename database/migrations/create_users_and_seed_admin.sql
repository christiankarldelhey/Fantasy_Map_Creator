-- Migration: Create users table and seed admin user
-- Date: 2026-06-24
-- Description: User model for persisting settings (active character, active trip, directions, language, climate time)

-- ============================================================================
-- Table: users
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),  -- NULL for now (no auth in MVP)
    active_character_id INTEGER REFERENCES character_state(id) ON DELETE SET NULL,
    active_trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active_character_id ON users(active_character_id);
CREATE INDEX IF NOT EXISTS idx_users_active_trip_id ON users(active_trip_id);

COMMENT ON TABLE users IS 'User accounts with settings for persisting state across sessions';
COMMENT ON COLUMN users.active_character_id IS 'Currently active character (FK to character_state)';
COMMENT ON COLUMN users.active_trip_id IS 'Currently active trip (FK to trips)';
COMMENT ON COLUMN users.settings IS 'JSONB settings: { narrative_language, current_climate_time, is_real_time, directions: { destination, is_active } }';

-- ============================================================================
-- Seed admin user (if not exists)
-- ============================================================================
INSERT INTO users (email, settings)
VALUES ('admin@middleearth.com', '{}'::jsonb)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'users' AS table_name, COUNT(*) AS rows FROM users;
