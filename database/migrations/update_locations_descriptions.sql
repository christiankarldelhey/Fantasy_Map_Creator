-- Update location descriptions from CSV
-- Run from project root so the relative CSV path resolves correctly

-- Create temp table matching CSV structure
CREATE TEMP TABLE temp_locations (
    id INTEGER,
    external_id VARCHAR(255),
    name VARCHAR(255),
    location_type VARCHAR(100),
    population TEXT,
    description TEXT,
    region VARCHAR(100),
    image_url TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    geom TEXT,
    inhabitants TEXT,
    url_path TEXT,
    slug VARCHAR(255)
);

-- Import CSV data
\copy temp_locations FROM 'data_public/locations_updated-28-6.csv' DELIMITER ',' CSV HEADER;

-- Update descriptions only for rows with non-empty descriptions
UPDATE locations
SET 
    description = temp.description,
    updated_at = NOW()
FROM temp_locations temp
WHERE locations.id = temp.id
  AND temp.description IS NOT NULL
  AND temp.description <> '';

-- Drop temp table
DROP TABLE temp_locations;

-- Summary
SELECT 
    COUNT(*) FILTER (WHERE description IS NOT NULL AND description <> '') AS locations_with_descriptions
FROM locations;
