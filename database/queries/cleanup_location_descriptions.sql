-- ============================================================================
-- Cleanup Location Descriptions
-- Purpose: Remove "Origin: " and "Purpose: " prefixes from location descriptions
-- ============================================================================

BEGIN;

-- Remove "Origin: " prefix from location descriptions (case-insensitive)
UPDATE locations
SET description = REGEXP_REPLACE(description, 'Origin:\s*', '', 'gi')
WHERE description ~* 'Origin:';

-- Remove "Purpose: " prefix from location descriptions (case-insensitive)
UPDATE locations
SET description = REGEXP_REPLACE(description, 'Purpose:\s*', '', 'gi')
WHERE description ~* 'Purpose:';

-- Remove "Origin: " prefix from region descriptions (if any)
UPDATE regions
SET description = description - 'Origin'
WHERE description ? 'Origin';

-- Remove "Purpose: " prefix from region descriptions (if any)
UPDATE regions
SET description = description - 'Purpose'
WHERE description ? 'Purpose';

COMMIT;

-- Verify the changes
SELECT COUNT(*) as locations_updated FROM locations WHERE description IS NOT NULL;
SELECT COUNT(*) as regions_updated FROM regions WHERE description IS NOT NULL;
