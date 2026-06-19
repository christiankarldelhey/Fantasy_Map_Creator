-- ============================================================================
-- Road Network Topology Fix Migration
-- ============================================================================
-- Purpose: Fix road network topology by:
--   1. Merging fragments with same name that touch
--   2. Splitting roads at all intersections using ST_Node
-- 
-- This creates a topologically correct network where the routing algorithm
-- can find paths between any connected points.
-- ============================================================================

-- Step 1: Create Backup
-- ============================================================================
DROP TABLE IF EXISTS roads_backup_20260619;
CREATE TABLE roads_backup_20260619 AS 
SELECT * FROM roads;

-- Verify backup
DO $$
DECLARE
  backup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO backup_count FROM roads_backup_20260619;
  RAISE NOTICE 'Backup created with % rows', backup_count;
END $$;

-- Step 2: PHASE 1 - Merge Fragments with Same Name
-- ============================================================================
DROP TABLE IF EXISTS roads_merged;
CREATE TABLE roads_merged AS
WITH road_groups AS (
  -- Group roads by name and merge touching geometries
  SELECT 
    name,
    terrain_type,
    difficulty,
    cost_factor,
    ST_LineMerge(ST_Union(geom)) as geom
  FROM roads
  GROUP BY name, terrain_type, difficulty, cost_factor
)
SELECT 
  ROW_NUMBER() OVER () as id,
  name,
  terrain_type,
  difficulty,
  cost_factor,
  (ST_Dump(geom)).geom as geom
FROM road_groups;

-- Create spatial index
CREATE INDEX roads_merged_geom_idx ON roads_merged USING GIST(geom);

-- Report merge results
DO $$
DECLARE
  original_count INTEGER;
  merged_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO original_count FROM roads;
  SELECT COUNT(*) INTO merged_count FROM roads_merged;
  RAISE NOTICE 'Phase 1 Complete: % fragments merged into % segments', original_count, merged_count;
END $$;

-- Step 3: PHASE 2 - Split at Intersections using ST_Node
-- ============================================================================
DROP TABLE IF EXISTS roads_noded;
CREATE TABLE roads_noded AS
WITH unioned AS (
  -- Union all geometries into one
  SELECT ST_Union(geom) as geom
  FROM roads_merged
),
noded AS (
  -- Force nodes at all intersections
  SELECT ST_Node(geom) as geom
  FROM unioned
),
dumped AS (
  -- Separate into individual segments
  SELECT 
    (ST_Dump(geom)).path[1] as segment_id,
    (ST_Dump(geom)).geom as geom
  FROM noded
)
SELECT 
  segment_id as id,
  geom
FROM dumped;

-- Create spatial index
CREATE INDEX roads_noded_geom_idx ON roads_noded USING GIST(geom);

-- Report node results
DO $$
DECLARE
  noded_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO noded_count FROM roads_noded;
  RAISE NOTICE 'Phase 2 Complete: % topologically correct segments created', noded_count;
END $$;

-- Step 4: Transfer Metadata to Final Segments
-- ============================================================================
-- Add metadata columns
ALTER TABLE roads_noded
  ADD COLUMN name VARCHAR(255),
  ADD COLUMN terrain_type VARCHAR(100),
  ADD COLUMN difficulty INTEGER,
  ADD COLUMN cost_factor NUMERIC;

-- Transfer metadata from merged roads (which have the correct metadata)
UPDATE roads_noded rn
SET 
  name = rm.name,
  terrain_type = rm.terrain_type,
  difficulty = rm.difficulty,
  cost_factor = rm.cost_factor
FROM roads_merged rm
WHERE ST_Intersects(rn.geom, rm.geom)
  AND rn.name IS NULL;

-- Verify all segments have metadata
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM roads_noded WHERE name IS NULL;
  IF null_count > 0 THEN
    RAISE WARNING 'Warning: % segments without metadata', null_count;
  ELSE
    RAISE NOTICE 'Metadata transfer complete: All segments have metadata';
  END IF;
END $$;

-- Step 5: Replace Original Table
-- ============================================================================
-- Rename original table
ALTER TABLE roads RENAME TO roads_original_pre_topology_fix;

-- Rename new table to roads
ALTER TABLE roads_noded RENAME TO roads;

-- Recreate spatial index with correct name
DROP INDEX IF EXISTS roads_noded_geom_idx;
CREATE INDEX roads_geom_idx ON roads USING GIST(geom);

-- Update statistics
ANALYZE roads;

-- Step 6: Verification
-- ============================================================================
DO $$
DECLARE
  original_count INTEGER;
  final_count INTEGER;
  null_name INTEGER;
  null_difficulty INTEGER;
  null_terrain INTEGER;
BEGIN
  SELECT COUNT(*) INTO original_count FROM roads_backup_20260619;
  SELECT COUNT(*) INTO final_count FROM roads;
  SELECT COUNT(*) INTO null_name FROM roads WHERE name IS NULL;
  SELECT COUNT(*) INTO null_difficulty FROM roads WHERE difficulty IS NULL;
  SELECT COUNT(*) INTO null_terrain FROM roads WHERE terrain_type IS NULL;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Original segments: %', original_count;
  RAISE NOTICE 'Final segments: %', final_count;
  RAISE NOTICE 'Segments without name: %', null_name;
  RAISE NOTICE 'Segments without difficulty: %', null_difficulty;
  RAISE NOTICE 'Segments without terrain: %', null_terrain;
  RAISE NOTICE '========================================';
END $$;

-- Final summary query
SELECT 
  'Backup' as table_name, COUNT(*) as segment_count FROM roads_backup_20260619
UNION ALL
SELECT 
  'Final' as table_name, COUNT(*) as segment_count FROM roads;
