-- Migration: Fix regions encounter metrics
-- Date: 2026-06-21
-- Description: Fixes NULL values and inconsistent encounter metrics in regions table
--              - Ered Luin (ID 47): Copy metrics from ID 27
--              - Mordor (ID 74): Adjust hours_to_encounter from 20 to 1
--              - Nurn (ID 76): Adjust hours_to_encounter from 20 to 2
--              - Lone-lands (ID 68): Adjust hours_to_encounter from 2 to 6
--              - Weather Hills (ID 61): Adjust hours_to_encounter from 2 to 6

-- Step 1: Fix Ered Luin (ID 47) NULLs by copying from ID 27
UPDATE regions r1
SET 
    distance_for_encounter = r2.distance_for_encounter,
    chance_of_encounter = r2.chance_of_encounter,
    hours_to_encounter = r2.hours_to_encounter
FROM regions r2
WHERE r1.id = 47 
  AND r2.id = 27;

-- Step 2: Fix Mordor (ID 74) - adjust hours_to_encounter from 20 to 1
UPDATE regions
SET hours_to_encounter = 1.00
WHERE id = 74;

-- Step 3: Fix Nurn (ID 76) - adjust hours_to_encounter from 20 to 2
UPDATE regions
SET hours_to_encounter = 2.00
WHERE id = 76;

-- Step 4: Fix Lone-lands (ID 81) - adjust hours_to_encounter from 2 to 6
UPDATE regions
SET hours_to_encounter = 6.00
WHERE id = 81;

-- Step 5: Fix Weather Hills (ID 61) - adjust hours_to_encounter from 2 to 6
UPDATE regions
SET hours_to_encounter = 6.00
WHERE id = 61;

-- Step 5.5: Revert North Misty Mountains (ID 68) to original value (was incorrectly updated)
UPDATE regions
SET hours_to_encounter = 6.00
WHERE id = 68;

-- Step 6: Verify the changes
SELECT 
    id, 
    name, 
    distance_for_encounter, 
    chance_of_encounter, 
    hours_to_encounter,
    CASE 
        WHEN hours_to_encounter > 0 THEN (distance_for_encounter::DECIMAL / hours_to_encounter)
        ELSE NULL 
    END as implied_speed_kmh
FROM regions 
WHERE id IN (47, 74, 76, 81, 61)
ORDER BY id;

-- Step 7: Verify no remaining NULL encounter metrics
SELECT 
    COUNT(*) as total_regions,
    COUNT(CASE WHEN distance_for_encounter IS NULL THEN 1 END) as null_distance,
    COUNT(CASE WHEN chance_of_encounter IS NULL THEN 1 END) as null_chance,
    COUNT(CASE WHEN hours_to_encounter IS NULL THEN 1 END) as null_hours
FROM regions;

-- Step 8: Verify no extreme anomalies (speed < 0.3 or > 15 km/h)
SELECT 
    id, 
    name, 
    distance_for_encounter, 
    chance_of_encounter, 
    hours_to_encounter,
    CASE 
        WHEN hours_to_encounter > 0 THEN (distance_for_encounter::DECIMAL / hours_to_encounter)
        ELSE NULL 
    END as implied_speed_kmh
FROM regions 
WHERE hours_to_encounter > 0
  AND (distance_for_encounter::DECIMAL / hours_to_encounter < 0.3 
       OR distance_for_encounter::DECIMAL / hours_to_encounter > 15)
ORDER BY implied_speed_kmh;
