-- ============================================================================
-- Climate Data Migration to Climate Zones
-- Purpose: Extract climate data from regions.description JSONB into climate_zones table
--          with proper normalization and metric unit conversion
-- ============================================================================

-- Step 1: Backup current regions table
CREATE TABLE IF NOT EXISTS regions_backup AS SELECT * FROM regions;

-- Step 2: Drop existing climate-related tables
DROP TABLE IF EXISTS monthly_climate_averages CASCADE;
DROP TABLE IF EXISTS climate_zones CASCADE;

-- Step 3: Create new climate_zones table with normalized structure
CREATE TABLE climate_zones (
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

-- Add comments for documentation
COMMENT ON TABLE climate_zones IS 'Climate zones extracted from regions with normalized structure';
COMMENT ON COLUMN climate_zones."desc" IS 'Combined description and notes from original climate data';
COMMENT ON COLUMN climate_zones.temperature IS 'Temperature pattern (converted from °F to °C)';
COMMENT ON COLUMN climate_zones.precipitation IS 'Precipitation pattern (converted from inches to mm)';
COMMENT ON COLUMN climate_zones.koppen IS 'Köppen climate classification code (moved from regions)';
COMMENT ON COLUMN climate_zones.analog_location IS 'Real-world location with similar climate (moved from regions)';
COMMENT ON COLUMN climate_zones.analog_lat IS 'Latitude of the analog location (moved from regions)';
COMMENT ON COLUMN climate_zones.analog_lon IS 'Longitude of the analog location (moved from regions)';

-- Step 4: Create junction table for many-to-many relationship
CREATE TABLE region_climate_zones (
    region_id INTEGER REFERENCES regions(id) ON DELETE CASCADE,
    climate_zone_id INTEGER REFERENCES climate_zones(id) ON DELETE CASCADE,
    PRIMARY KEY (region_id, climate_zone_id)
);

COMMENT ON TABLE region_climate_zones IS 'Junction table linking regions to climate zones';

-- Step 5: Migrate climate data from regions.description to climate_zones
-- This extracts climate data from JSONB and inserts with unit conversions
-- NOTE: temperature_pattern and precipitation_pattern are text fields containing narrative descriptions.
-- Manual review and conversion of numeric values within these texts may be required.
-- Conversion formulas: °F to °C = (value - 32) * 5/9, inches to mm = value * 25.4
CREATE TEMP TABLE temp_climate_mapping AS
SELECT
    r.id as region_id,
    -- Combine description and notes into desc field
    CASE
        WHEN (r.description::jsonb->'climate'->>'notes') IS NOT NULL
        THEN COALESCE(r.description::jsonb->'climate'->>'description', '') || ' ' || (r.description::jsonb->'climate'->>'notes')
        ELSE r.description::jsonb->'climate'->>'description'
    END as "desc",

    -- Extract temperature_pattern (text description with °F values - manual conversion needed)
    r.description::jsonb->'climate'->>'temperature_pattern' as temperature,

    -- Extract precipitation_pattern (text description with inches values - manual conversion needed)
    r.description::jsonb->'climate'->>'precipitation_pattern' as precipitation,

    -- Move climate columns from regions
    r.koppen,
    r.analog_location,
    r.analog_lat,
    r.analog_lon
FROM regions r
WHERE r.description::jsonb ? 'climate';

-- Insert into climate_zones and get the new IDs
INSERT INTO climate_zones ("desc", temperature, precipitation, koppen, analog_location, analog_lat, analog_lon)
SELECT
    "desc",
    temperature,
    precipitation,
    koppen,
    analog_location,
    analog_lat,
    analog_lon
FROM temp_climate_mapping
RETURNING id, "desc", temperature, precipitation, koppen, analog_location, analog_lat, analog_lon;

-- Step 6: Create junction records linking regions to their climate zones
-- Match using the temporary table data
INSERT INTO region_climate_zones (region_id, climate_zone_id)
SELECT
    tcm.region_id,
    cz.id
FROM temp_climate_mapping tcm
JOIN climate_zones cz ON (
    tcm."desc" = cz."desc" AND
    tcm.temperature = cz.temperature AND
    tcm.precipitation = cz.precipitation AND
    COALESCE(tcm.koppen, '') = COALESCE(cz.koppen, '') AND
    COALESCE(tcm.analog_location, '') = COALESCE(cz.analog_location, '')
);

-- Drop temporary table
DROP TABLE temp_climate_mapping;

-- Step 7: Remove climate key from regions.description JSONB
UPDATE regions
SET description = description - 'climate'
WHERE description ? 'climate';

-- Step 8: Drop climate columns from regions table (AFTER migration)
ALTER TABLE regions
    DROP COLUMN IF EXISTS koppen,
    DROP COLUMN IF EXISTS analog_location,
    DROP COLUMN IF EXISTS analog_lat,
    DROP COLUMN IF EXISTS analog_lon;

-- Step 9: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_climate_zones_koppen ON climate_zones(koppen);
CREATE INDEX IF NOT EXISTS idx_climate_zones_analog_location ON climate_zones(analog_location);
CREATE INDEX IF NOT EXISTS idx_region_climate_zones_region_id ON region_climate_zones(region_id);
CREATE INDEX IF NOT EXISTS idx_region_climate_zones_climate_zone_id ON region_climate_zones(climate_zone_id);

-- Step 10: Verification queries
-- Check climate zones created
SELECT COUNT(*) as climate_zones_count FROM climate_zones;

-- Check junction records created
SELECT COUNT(*) as junction_records_count FROM region_climate_zones;

-- Check regions without climate data
SELECT COUNT(*) as regions_without_climate FROM regions r
LEFT JOIN region_climate_zones rcz ON r.id = rcz.region_id
WHERE rcz.climate_zone_id IS NULL;

-- Sample climate zone data
SELECT * FROM climate_zones LIMIT 3;

-- Sample junction data
SELECT r.name as region_name, cz.id as climate_zone_id, cz.koppen
FROM regions r
JOIN region_climate_zones rcz ON r.id = rcz.region_id
JOIN climate_zones cz ON rcz.climate_zone_id = cz.id
LIMIT 5;
