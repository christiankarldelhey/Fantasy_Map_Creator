-- Migration: Merge region_encounters into encounters table
-- This adds probability_by_region column to encounters and migrates data

BEGIN;

-- Add probability_by_region column to encounters
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS probability_by_region JSONB DEFAULT '[]'::jsonb;

-- Migrate data from region_encounters to encounters.probability_by_region
UPDATE encounters e
SET probability_by_region = (
  SELECT json_agg(
    json_build_object(
      'region', r.name,
      'probability', re.probability_pct
    )
  )
  FROM region_encounters re
  JOIN regions r ON re.region_id = r.id
  WHERE re.encounter_id = e.id
);

-- Drop the region_encounters table
DROP TABLE IF EXISTS region_encounters;

COMMIT;

-- Verify results
SELECT 'Total encounters:' as info, COUNT(*) FROM encounters;
SELECT 'Encounters with region probabilities:' as info, COUNT(*) FROM encounters WHERE jsonb_array_length(probability_by_region) > 0;
