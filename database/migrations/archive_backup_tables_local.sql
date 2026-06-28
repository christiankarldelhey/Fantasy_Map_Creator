-- Move backup and temporary tables to archive schema (LOCAL environment)
-- This keeps data accessible but hides it from main schema view

-- Create archive schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS archive;

-- Move backup tables to archive schema
ALTER TABLE IF EXISTS character_state_backup SET SCHEMA archive;
ALTER TABLE IF EXISTS encounters_backup SET SCHEMA archive;
ALTER TABLE IF EXISTS entities_backup SET SCHEMA archive;
ALTER TABLE IF EXISTS regions_backup SET SCHEMA archive;
ALTER TABLE IF EXISTS roads_backup_20260619 SET SCHEMA archive;
ALTER TABLE IF EXISTS roads_merged SET SCHEMA archive;
ALTER TABLE IF EXISTS roads_original_pre_topology_fix SET SCHEMA archive;

-- Move unused tables to archive schema
ALTER TABLE IF EXISTS detected_peaks SET SCHEMA archive;
ALTER TABLE IF EXISTS region_climate_zones SET SCHEMA archive;

-- Verify the tables were moved
SELECT 
    schemaname,
    tablename
FROM pg_tables
WHERE schemaname = 'archive'
ORDER BY tablename;
