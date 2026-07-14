-- Migration: Add cultural_family to regions
-- Date: 2026-07-14
-- Description: Reads the new regions.geojson seed file and populates the column.

ALTER TABLE regions
  ADD COLUMN IF NOT EXISTS cultural_family TEXT;

DO $$
DECLARE
  geojson_data JSON;
  feature JSON;
BEGIN
  geojson_data := pg_read_file('/Users/christiankarldelhey/Documents/Middle Earth Map/database/seeds/data/geojson/regions.geojson')::JSON;

  FOR feature IN SELECT * FROM jsonb_array_elements(geojson_data::JSONB->'features')
  LOOP
    UPDATE regions
    SET cultural_family = NULLIF(feature->'properties'->>'cultural_family', '')
    WHERE id = (feature->'properties'->>'id')::INTEGER;
  END LOOP;
END $$;

COMMENT ON COLUMN regions.cultural_family IS 'Cultural family driving lodging, night, and dialogue logic (read from seed data, never hard-coded)';
