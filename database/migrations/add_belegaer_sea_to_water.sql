-- Migration: Add Belegaer Sea to Water Table
-- Date: 2026-06-24
-- Description: Copies Belegaer polygon from regions table to water table as a sea type
--              and updates schema comment to include 'sea' as a valid water_type

-- Step 1: Insert Belegaer polygon into water table
INSERT INTO water (name, water_type, description, geom)
SELECT 
    'Belegaer' as name,
    'sea' as water_type,
    'The Great Sea of Middle-earth, separating the western lands from Aman' as description,
    geom
FROM regions
WHERE id = 29;

-- Step 2: Update schema comment for water_type column
COMMENT ON COLUMN water.water_type IS 'Water feature type: river, stream, lake, sea';

-- Step 3: Verify the insertion
SELECT 
    id, 
    name, 
    water_type, 
    ST_AsText(geom) as geometry_sample
FROM water 
WHERE water_type = 'sea';

-- Step 4: Count water entries by type
SELECT 
    water_type, 
    COUNT(*) as count
FROM water 
GROUP BY water_type 
ORDER BY water_type;
