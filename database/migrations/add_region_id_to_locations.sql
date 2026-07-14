-- Migration: Add region_id to locations and backfill via point-in-polygon
-- Date: 2026-07-14
-- Description: Resolves which region polygon each location point falls inside.

ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS region_id INTEGER REFERENCES regions(id);

CREATE INDEX IF NOT EXISTS idx_locations_region_id ON locations(region_id);

UPDATE locations l
SET region_id = r.id
FROM regions r
WHERE ST_Contains(r.geom, l.geom);

COMMENT ON COLUMN locations.region_id IS 'Region containing the location point (resolved by point-in-polygon)';

-- Report any locations that did not fall inside a region polygon.
SELECT COUNT(*) AS locations_without_region
FROM locations
WHERE region_id IS NULL;
