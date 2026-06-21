-- Create character_state table to persist company/character location
CREATE TABLE IF NOT EXISTS character_state (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) DEFAULT 'Company',
    current_lng DOUBLE PRECISION,
    current_lat DOUBLE PRECISION,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed with Bree's coordinates if empty
INSERT INTO character_state (name, current_lng, current_lat)
SELECT 'Company', ST_X(geom), ST_Y(geom)
FROM locations
WHERE name = 'Bree'
LIMIT 1;

-- If for any reason Bree is not in the locations table yet, seed with default coordinates
INSERT INTO character_state (id, name, current_lng, current_lat)
SELECT 1, 'Company', 27.5, -34.2
WHERE NOT EXISTS (SELECT 1 FROM character_state);
