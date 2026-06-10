-- Migration: Create normalized encounters tables
-- This file creates the encounters and region_encounters tables
-- Run this after updating schema.sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table: encounters
CREATE TABLE IF NOT EXISTS encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
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

-- Table: region_encounters
CREATE TABLE IF NOT EXISTS region_encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id INTEGER REFERENCES regions(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES encounters(id) ON DELETE CASCADE,
    probability_pct INTEGER CHECK (probability_pct BETWEEN 0 AND 100),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(region_id, encounter_id)
);

CREATE INDEX IF NOT EXISTS idx_region_encounters_region ON region_encounters(region_id);
CREATE INDEX IF NOT EXISTS idx_region_encounters_encounter ON region_encounters(encounter_id);

COMMENT ON TABLE region_encounters IS 'Relationship between regions and encounters with probabilities';
COMMENT ON COLUMN region_encounters.region_id IS 'Foreign key to regions table';
COMMENT ON COLUMN region_encounters.encounter_id IS 'Foreign key to encounters table';
COMMENT ON COLUMN region_encounters.probability_pct IS 'Probability percentage (0-100)';
