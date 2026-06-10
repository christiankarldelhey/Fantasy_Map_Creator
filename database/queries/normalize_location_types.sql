-- ============================================================================
-- Normalize Location Types
-- Purpose: Normalize all location_type values to consistent lowercase format
-- ============================================================================

BEGIN;

-- All "Castle" (case-insensitive) → "castle"
UPDATE locations
SET location_type = 'castle'
WHERE location_type ~* 'Castle';

-- All "Fishing Village" → "village"
UPDATE locations
SET location_type = 'village'
WHERE location_type = 'Fishing Village';

-- All "Hobbit Village" → "village"
UPDATE locations
SET location_type = 'village'
WHERE location_type = 'Hobbit Village';

-- "Walled Town" → "fortified town"
UPDATE locations
SET location_type = 'fortified town'
WHERE location_type = 'Walled Town';

-- "Coastal Town" → "town"
UPDATE locations
SET location_type = 'town'
WHERE location_type = 'Coastal Town';

-- "Market Town" → "town"
UPDATE locations
SET location_type = 'town'
WHERE location_type = 'Market Town';

-- "Town" → "town" (already correct, but ensure lowercase)
UPDATE locations
SET location_type = 'town'
WHERE location_type = 'Town';

-- "Fortress" → "fortress" (ensure lowercase)
UPDATE locations
SET location_type = 'fortress'
WHERE location_type = 'Fortress';

-- "Beacon-tower" → "watchtower"
UPDATE locations
SET location_type = 'watchtower'
WHERE location_type = 'Beacon-tower';

-- NULL (Bar-Lymen, id: 1123) → "point of interest"
UPDATE locations
SET location_type = 'point of interest'
WHERE location_type IS NULL;

-- Normalize remaining types to lowercase
UPDATE locations
SET location_type = LOWER(location_type)
WHERE location_type ~ '[A-Z]';

COMMIT;

-- Verify the changes
SELECT DISTINCT location_type, COUNT(*) as count 
FROM locations 
GROUP BY location_type 
ORDER BY count DESC;
