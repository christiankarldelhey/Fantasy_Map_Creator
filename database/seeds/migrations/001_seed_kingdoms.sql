-- Migration: Seed kingdoms data
-- Date: 2026-06-29
-- Description: Load kingdoms master data from CSV seed file

-- Create temporary table for CSV import
DROP TABLE IF EXISTS temp_kingdoms;

CREATE TABLE temp_kingdoms (
    id INTEGER,
    name VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP
);

-- Import data from CSV file
COPY temp_kingdoms(id, name, description, created_at)
FROM '/Users/christiankarldelhey/Documents/Middle Earth Map/database/seeds/data/csv/kingdoms.csv'
DELIMITER ','
CSV HEADER
QUOTE '"';

-- Insert into main table with conflict resolution
INSERT INTO kingdoms (id, name, description, created_at)
SELECT id, name, description, created_at
FROM temp_kingdoms
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    created_at = EXCLUDED.created_at;

-- Clean up temporary table
DROP TABLE temp_kingdoms;

-- Verification
SELECT 'kingdoms' AS table_name, COUNT(*) AS rows_loaded FROM kingdoms;
