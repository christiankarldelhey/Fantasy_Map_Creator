-- Drop backup and temporary tables (PRODUCTION environment)
-- This keeps production database clean and lightweight

-- Drop backup tables
DROP TABLE IF EXISTS character_state_backup;
DROP TABLE IF EXISTS encounters_backup;
DROP TABLE IF EXISTS entities_backup;
DROP TABLE IF EXISTS regions_backup;
DROP TABLE IF EXISTS roads_backup_20260619;
DROP TABLE IF EXISTS roads_merged;
DROP TABLE IF EXISTS roads_original_pre_topology_fix;

-- Drop unused tables
DROP TABLE IF EXISTS detected_peaks;
DROP TABLE IF EXISTS region_climate_zones;

-- Verify tables were dropped (should return empty)
SELECT 
    schemaname,
    tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'character_state_backup',
    'encounters_backup',
    'entities_backup',
    'regions_backup',
    'roads_backup_20260619',
    'roads_merged',
    'roads_original_pre_topology_fix',
    'detected_peaks',
    'region_climate_zones'
  );
