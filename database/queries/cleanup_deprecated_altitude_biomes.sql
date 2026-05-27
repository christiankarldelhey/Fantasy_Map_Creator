-- ============================================================================
-- Cleanup Deprecated Altitude Data from Biomes Table
-- ============================================================================
-- Purpose: Remove altitude-related records from biomes table since they
--          have been migrated to altitude_layers table
-- ============================================================================

-- Show what will be deleted (for verification)
SELECT 
    type,
    COUNT(*) as count,
    ROUND(SUM(area_km2)::numeric, 2) as total_area_km2
FROM biomes
WHERE type IN ('hills', 'mountains_low', 'mountains_med', 'mountains_high', 'mountains')
GROUP BY type
ORDER BY type;

-- Delete the deprecated altitude records
DELETE FROM biomes 
WHERE type IN ('hills', 'mountains_low', 'mountains_med', 'mountains_high', 'mountains');

-- Verify deletion (should return 0 rows)
SELECT COUNT(*) as remaining_altitude_records 
FROM biomes 
WHERE type IN ('hills', 'mountains_low', 'mountains_med', 'mountains_high', 'mountains');

-- Show remaining biome types
SELECT type, COUNT(*) as count
FROM biomes
GROUP BY type
ORDER BY type;
