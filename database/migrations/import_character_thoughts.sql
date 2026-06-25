-- Migration: Import character thoughts from CSV
-- Date: 2026-06-25
-- Description: Restores character thoughts from CSV backup

-- Create temporary table for CSV import
DROP TABLE IF EXISTS temp_thoughts_import;

CREATE TABLE temp_thoughts_import (
    character_id INTEGER,
    thought TEXT,
    type VARCHAR(50),
    thought_id INTEGER
);

-- Import CSV data
COPY temp_thoughts_import(character_id, thought, type, thought_id)
FROM '/Users/christiankarldelhey/Documents/Middle Earth Map/data_public/thoughts - Hoja 1.csv'
DELIMITER ','
CSV HEADER
QUOTE '"';

-- Insert data into character_thoughts
INSERT INTO character_thoughts (character_id, thought, type, thought_id)
SELECT character_id, thought, type, thought_id
FROM temp_thoughts_import;

-- Drop temporary table
DROP TABLE temp_thoughts_import;

-- Verification
SELECT COUNT(*) as total_thoughts FROM character_thoughts;
SELECT character_id, COUNT(*) as thought_count FROM character_thoughts GROUP BY character_id;
