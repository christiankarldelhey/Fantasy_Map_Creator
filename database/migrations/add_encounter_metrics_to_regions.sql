-- Migration: Add encounter metrics to regions table
-- Date: 2026-06-20
-- Description: Adds distance_for_encounter, chance_of_encounter, and hours_to_encounter columns
--              by extracting data from regions_backup.encounters JSONB field

-- Step 1: Drop existing columns if they exist (to fix data type)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'regions' AND column_name = 'distance_for_encounter') THEN
        ALTER TABLE regions DROP COLUMN distance_for_encounter;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'regions' AND column_name = 'chance_of_encounter') THEN
        ALTER TABLE regions DROP COLUMN chance_of_encounter;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'regions' AND column_name = 'hours_to_encounter') THEN
        ALTER TABLE regions DROP COLUMN hours_to_encounter;
    END IF;
END $$;

-- Step 2: Add columns to regions table with correct data types
ALTER TABLE regions 
ADD COLUMN distance_for_encounter DECIMAL(10,3),
ADD COLUMN chance_of_encounter DECIMAL(5,2),
ADD COLUMN hours_to_encounter DECIMAL(5,2);

-- Step 3: Add comments
COMMENT ON COLUMN regions.distance_for_encounter IS 'Distance in kilometers to encounter location (metric system)';
COMMENT ON COLUMN regions.chance_of_encounter IS 'Percentage chance of encounter (0-100)';
COMMENT ON COLUMN regions.hours_to_encounter IS 'Time in hours to reach encounter location';

-- Step 4: Migrate data from regions_backup
UPDATE regions r
SET 
    distance_for_encounter = (rb.encounters->>'distance')::DECIMAL(10,3),
    chance_of_encounter = (rb.encounters->>'chance_pct')::DECIMAL(5,2),
    hours_to_encounter = (rb.encounters->>'time_hours')::DECIMAL(5,2)
FROM regions_backup rb
WHERE r.id = rb.id 
  AND rb.encounters IS NOT NULL;

-- Step 5: Verify migration
SELECT 
    COUNT(*) as total_regions,
    COUNT(CASE WHEN distance_for_encounter IS NOT NULL THEN 1 END) as with_distance,
    COUNT(CASE WHEN chance_of_encounter IS NOT NULL THEN 1 END) as with_chance,
    COUNT(CASE WHEN hours_to_encounter IS NOT NULL THEN 1 END) as with_hours
FROM regions;

-- Step 6: Show sample data
SELECT 
    id, 
    name, 
    distance_for_encounter, 
    chance_of_encounter, 
    hours_to_encounter
FROM regions 
WHERE distance_for_encounter IS NOT NULL
LIMIT 5;
