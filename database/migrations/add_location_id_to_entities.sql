-- Migration: Add location_id column to entities table
-- Description: Where this entity lives — the anchor that turns a gazetteer
--   place into somebody's home. NULL for everything that roams (encounter
--   draws, movers on legs, hazards). A place's host is "the entity living
--   at this location"; several entities may share one location (a family,
--   a household staff).
--   Movers already anchor through mover_legs(kind='resident').location_id;
--   this column carries the same fact for entities that are not movers —
--   the widow of the deep smial is a person, not a campaign.

ALTER TABLE entities
    ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id);

CREATE INDEX IF NOT EXISTS idx_entities_location_id
    ON entities(location_id) WHERE location_id IS NOT NULL;

COMMENT ON COLUMN entities.location_id IS
    'Home anchor: the locations row this entity lives at (place hosts). NULL for roamers';
