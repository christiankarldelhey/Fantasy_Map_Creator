-- ============================================================================
-- Directions performance indexes
-- Purpose: ensure the spatial joins used by route calculation can use GIST
-- indexes. They are normally created by schema.sql / railway_critical_objects.sql
-- but this migration makes sure they exist in every environment.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_roads_geom ON roads USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_roads_name ON roads(name);

CREATE INDEX IF NOT EXISTS idx_biomes_geom ON biomes USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_biomes_type ON biomes(type);

CREATE INDEX IF NOT EXISTS idx_altitude_layers_geom ON altitude_layers USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_altitude_layers_type ON altitude_layers(altitude_type);
CREATE INDEX IF NOT EXISTS idx_altitude_layers_priority ON altitude_layers(priority);

CREATE INDEX IF NOT EXISTS idx_locations_geom ON locations USING GIST(geom);

ANALYZE roads;
ANALYZE biomes;
ANALYZE altitude_layers;
ANALYZE locations;
