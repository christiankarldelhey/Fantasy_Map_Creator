-- Migration: Convert regions.description_summary to TEXT[] and add trip rotation state
-- Date: 2026-07-21
-- Description: description_summary now holds an array of rotating region descriptions.

-- Step 1: Convert the column to an array type (wrap legacy strings in a single-element array).
ALTER TABLE regions
  ALTER COLUMN description_summary TYPE TEXT[]
  USING CASE
    WHEN description_summary IS NULL THEN NULL
    ELSE ARRAY[description_summary]::TEXT[]
  END;

-- Step 2: Add per-trip tracking of consumed description indices per region.
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS used_region_descriptions JSONB DEFAULT '{}';

COMMENT ON COLUMN trips.used_region_descriptions IS
  'Map of region name -> used description_summary indices for rotating descriptions';

-- Step 3: Backfill / refresh description_summary from the updated regions.geojson seed file.
DO $$
DECLARE
    geojson_data JSON;
    feature JSON;
    properties JSON;
    new_summary TEXT[];
    updated_count INTEGER := 0;
BEGIN
    geojson_data := (
        SELECT pg_read_file('/Users/christiankarldelhey/Documents/Middle Earth Map/database/seeds/data/geojson/regions.geojson')
    )::JSON;

    FOR feature IN SELECT * FROM json_array_elements(geojson_data->'features')
    LOOP
        properties := feature->'properties';

        IF json_typeof(properties->'description_summary') = 'array' THEN
            new_summary := ARRAY(
                SELECT json_array_elements_text(properties->'description_summary')
            );
        ELSE
            new_summary := NULL;
        END IF;

        UPDATE regions
           SET description_summary = new_summary
         WHERE id = (properties->>'id')::INTEGER;

        IF FOUND THEN
            updated_count := updated_count + 1;
        END IF;
    END LOOP;

    RAISE NOTICE 'Updated % regions with array description_summary', updated_count;
END $$;

-- Step 4: Verify
SELECT id, name, pg_typeof(description_summary) AS column_type
FROM regions
LIMIT 1;
