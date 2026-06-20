-- Migration: Round distance_for_encounter to integer
-- Date: 2026-06-20
-- Description: Changes distance_for_encounter from DECIMAL to INTEGER, rounding to nearest whole number

-- Step 1: Change column type to INTEGER with rounding
ALTER TABLE regions 
ALTER COLUMN distance_for_encounter TYPE INTEGER 
USING ROUND(distance_for_encounter);

-- Step 2: Update comment
COMMENT ON COLUMN regions.distance_for_encounter IS 'Distance in kilometers to encounter location (rounded to nearest whole number)';

-- Step 3: Verify the change
SELECT 
    id, 
    name, 
    distance_for_encounter, 
    chance_of_encounter, 
    hours_to_encounter
FROM regions 
WHERE distance_for_encounter IS NOT NULL
LIMIT 10;
