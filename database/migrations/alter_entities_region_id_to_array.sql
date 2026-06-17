-- Migration: Convert region_id to region_ids array in entities table
-- This allows entities to be associated with multiple regions

-- Step 1: Create backup
CREATE TABLE IF NOT EXISTS entities_backup AS SELECT * FROM entities;

-- Step 2: Add new column as array
ALTER TABLE entities ADD COLUMN IF NOT EXISTS region_ids INTEGER[];

-- Step 3: Migrate existing data from region_id to region_ids
UPDATE entities 
SET region_ids = CASE 
  WHEN region_id IS NOT NULL THEN ARRAY[region_id]
  ELSE NULL
END
WHERE region_ids IS NULL;

-- Step 4: Drop old column and constraint
ALTER TABLE entities DROP CONSTRAINT IF EXISTS entities_region_id_fkey;
ALTER TABLE entities DROP COLUMN IF EXISTS region_id;

-- Step 5: Create GIN index for array operations
CREATE INDEX IF NOT EXISTS idx_entities_region_ids ON entities USING GIN (region_ids);

-- Step 6: Add comment
COMMENT ON COLUMN entities.region_ids IS 'Array of region IDs where this entity can be found. Allows entities to exist in multiple regions.';
