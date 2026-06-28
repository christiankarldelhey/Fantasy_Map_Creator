-- Update missing location descriptions from CSV
-- Only fills NULL descriptions; does NOT overwrite existing ones

-- Create temp table matching CSV structure
CREATE TEMP TABLE temp_locations_28_jun (
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
\copy temp_locations_28_jun FROM 'data_public/locations-28-jun-updated.csv' DELIMITER ',' CSV HEADER;

-- Update only NULL descriptions from CSV
UPDATE locations
SET 
    description = temp.description,
    updated_at = NOW()
FROM temp_locations_28_jun temp
WHERE locations.id = temp.id
  AND locations.description IS NULL
  AND temp.description IS NOT NULL
  AND temp.description <> '';

-- Drop temp table
DROP TABLE temp_locations_28_jun;

-- Summary
SELECT 
    COUNT(*) FILTER (WHERE description IS NOT NULL AND description <> '') AS locations_with_descriptions,
    COUNT(*) FILTER (WHERE description IS NULL) AS locations_without_descriptions
FROM locations;
