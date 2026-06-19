-- ============================================================================
-- Database Schema Refactor: Unify Entities and Drop Encounters
-- ============================================================================

-- Step 1: Create backup tables (replace if exists)
DROP TABLE IF EXISTS entities_backup CASCADE;
CREATE TABLE entities_backup AS SELECT * FROM entities;

DROP TABLE IF EXISTS encounters_backup CASCADE;
CREATE TABLE encounters_backup AS SELECT * FROM encounters;

DROP TABLE IF EXISTS regions_backup CASCADE;
CREATE TABLE regions_backup AS SELECT * FROM regions;

-- Step 2: Drop encounters table
DROP TABLE IF EXISTS encounters CASCADE;

-- Step 3: Refactor entities table
-- Drop old region_id column
ALTER TABLE entities DROP COLUMN IF EXISTS region_id;

-- Add new columns
ALTER TABLE entities ADD COLUMN IF NOT EXISTS tier VARCHAR(50);
ALTER TABLE entities ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES entities(id) ON DELETE SET NULL;
ALTER TABLE entities ADD COLUMN IF NOT EXISTS region_ids INTEGER[];
ALTER TABLE entities ADD COLUMN IF NOT EXISTS probability_by_region JSONB DEFAULT '[]'::jsonb;

-- Drop old index on region_id
DROP INDEX IF EXISTS idx_entities_region_id;

-- Create new index on region_ids
DROP INDEX IF EXISTS idx_entities_region_ids;
CREATE INDEX idx_entities_region_ids ON entities USING GIN(region_ids);

-- Create index on parent_id
DROP INDEX IF EXISTS idx_entities_parent_id;
CREATE INDEX idx_entities_parent_id ON entities(parent_id);

-- Step 4: Clean regions table
-- Remove 'list' key from people JSONB
UPDATE regions 
SET people = people - 'list'
WHERE people ? 'list';

-- Drop columns from regions
ALTER TABLE regions DROP COLUMN IF EXISTS encounters;
ALTER TABLE regions DROP COLUMN IF EXISTS fauna;
ALTER TABLE regions DROP COLUMN IF EXISTS flora;

-- Step 5: Update comments
COMMENT ON COLUMN entities.tier IS 'Entity tier (e.g., encounter, etc.)';
COMMENT ON COLUMN entities.parent_id IS 'Parent entity for hierarchical relationships';
COMMENT ON COLUMN entities.region_ids IS 'Array of region IDs where this entity can be found';
COMMENT ON COLUMN entities.probability_by_region IS 'Array of {region, probability} objects for encounter probabilities';

COMMENT ON TABLE entities IS 'Unified entities table combining previous entities and encounters data';
