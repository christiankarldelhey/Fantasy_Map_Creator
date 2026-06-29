-- Migration: Seed climate zones data
-- Date: 2026-06-29
-- Description: Load climate zones master data from CSV seed file

-- Create temporary table for CSV import
DROP TABLE IF EXISTS temp_climate_zones;

CREATE TABLE temp_climate_zones (
    id INTEGER,
    "desc" TEXT,
    temperature TEXT,
    precipitation TEXT,
    koppen VARCHAR(50),
    analog_location VARCHAR(255),
    analog_lat DECIMAL,
    analog_lon DECIMAL,
    created_at TIMESTAMP
);

-- Import data from CSV file
COPY temp_climate_zones(id, "desc", temperature, precipitation, koppen, analog_location, analog_lat, analog_lon, created_at)
FROM '/Users/christiankarldelhey/Documents/Middle Earth Map/database/seeds/data/csv/climate_zones.csv'
DELIMITER ','
CSV HEADER
QUOTE '"';

-- Insert into main table with conflict resolution
INSERT INTO climate_zones (id, "desc", temperature, precipitation, koppen, analog_location, analog_lat, analog_lon, created_at)
SELECT id, "desc", temperature, precipitation, koppen, analog_location, analog_lat, analog_lon, created_at
FROM temp_climate_zones
ON CONFLICT (id) DO UPDATE SET
    "desc" = EXCLUDED."desc",
    temperature = EXCLUDED.temperature,
    precipitation = EXCLUDED.precipitation,
    koppen = EXCLUDED.koppen,
    analog_location = EXCLUDED.analog_location,
    analog_lat = EXCLUDED.analog_lat,
    analog_lon = EXCLUDED.analog_lon,
    created_at = EXCLUDED.created_at;

-- Clean up temporary table
DROP TABLE temp_climate_zones;

-- Verification
SELECT 'climate_zones' AS table_name, COUNT(*) AS rows_loaded FROM climate_zones;
