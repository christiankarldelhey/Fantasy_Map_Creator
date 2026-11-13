-- ============================================================================
-- ADR-0014 (#104): drop legacy narrative columns and tables
-- ----------------------------------------------------------------------------
-- DESTRUCTIVE — the only irreversible step of the places_narration epic.
-- GATE: run a verified `pg_dump` before applying this file. There is no
-- rollback path other than restoring the dump.
--
-- Every drop below already has its canonical replacement live in
-- places_narration and every reader resolves narration first with these
-- columns/tables as fallback (verified: readers COALESCE/join, all drifts
-- were zero at migration time). After this file the fallbacks are gone.
--
-- Code changes that must land in the same commit (readers/writers of the
-- dropped objects):
--   backend/domains/game/routes/trips.js (~l.542)
--     trip_days INSERT writes places_interaction_id → write 'ovn:'||id into
--     places_narration_id instead.
--   backend/scripts/replay_mind_trip.js (~l.58)
--     overnight title/description from places_interactions → places_narration
--     payload ('ovn:'||id or places_narration_id).
--   database/seeds/scripts/load-seeds.js
--     ensureSchema adds places_interaction_id+FK (~l.1396) → places_narration_id TEXT;
--     remove seedRegionBiomeDescriptions, seedRegionBiomeVariants,
--     seedRegionSeasonalDescriptions, seedPlacesInteractions and the
--     backfillOvernightRecords/backfillBiomeRecords calls + functions;
--     remove the record-geom inherit UPDATE and the geom column writes.
--   backend/domains/game/services/world/placesInteractions.js
--     delete the places_interactions fallback query.
--   backend/domains/story/services/naturalLanguage/terrainPhrases.js
--     delete the region_biome_descriptions fallback query.
--   backend/domains/map/routes/adminGeoref.js
--     POST /locations description/description_es params write legacy columns —
--     a description should create a depiction record instead.
--   locations.sql / export — seeded INSERTs may carry description columns;
--     regenerate or strip on export.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. places_interactions → kind='interaction' + action='rest' records (ovn:*)
-- ---------------------------------------------------------------------------
-- trip_days.places_interaction_id is an int FK into this table. Rewrite it as
-- a text pointer to the record id before dropping.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'trip_days' AND column_name = 'places_interaction_id') THEN
    ALTER TABLE trip_days DROP CONSTRAINT IF EXISTS trip_days_places_interaction_id_fkey;
    ALTER TABLE trip_days ADD COLUMN IF NOT EXISTS places_narration_id TEXT;
    UPDATE trip_days td
       SET places_narration_id = 'ovn:' || td.places_interaction_id
     WHERE td.places_interaction_id IS NOT NULL
       AND td.places_narration_id IS NULL
       AND EXISTS (SELECT 1 FROM places_narration p
                    WHERE p.id = 'ovn:' || td.places_interaction_id);
    ALTER TABLE trip_days DROP COLUMN places_interaction_id;
    ALTER TABLE trip_days
      ADD CONSTRAINT trip_days_places_narration_id_fkey
      FOREIGN KEY (places_narration_id) REFERENCES places_narration(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DROP TABLE IF EXISTS places_interactions;

-- ---------------------------------------------------------------------------
-- 2. Generated phrase/prose banks → scope-bound records
-- ---------------------------------------------------------------------------
-- region_biome_descriptions → dep:biome:* (kind='depiction', type×region_id)
-- region_seasonal_descriptions → dep:reg:* variants column
DROP TABLE IF EXISTS region_biome_descriptions;
DROP TABLE IF EXISTS region_seasonal_descriptions;

-- ---------------------------------------------------------------------------
-- 3. Gazetteer prose columns → depiction/region/kingdom records
-- ---------------------------------------------------------------------------
ALTER TABLE locations
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS description_es;

ALTER TABLE water
  DROP COLUMN IF EXISTS description;

ALTER TABLE biomes
  DROP COLUMN IF EXISTS description;

ALTER TABLE regions
  DROP COLUMN IF EXISTS description_text,
  DROP COLUMN IF EXISTS description_summary,
  DROP COLUMN IF EXISTS land,
  DROP COLUMN IF EXISTS people,
  DROP COLUMN IF EXISTS products,
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS source;

ALTER TABLE kingdoms
  DROP COLUMN IF EXISTS description;

-- ---------------------------------------------------------------------------
-- 4. places_narration.geom — deprecated record-owned point
-- ---------------------------------------------------------------------------
-- Position lives on the anchor (locations.geom) since #105. Verified before
-- writing this file: every record with geom had a location_id; readers
-- COALESCE(anchor.geom, record.geom).
ALTER TABLE places_narration DROP COLUMN IF EXISTS geom;

-- ---------------------------------------------------------------------------
-- Post-checks (run as part of the file so a failure aborts loudly)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  orphan_count int;
BEGIN
  -- no narration record may reference a legacy table that no longer exists
  SELECT COUNT(*) INTO orphan_count
    FROM places_narration p
   WHERE p.id LIKE 'ovn:%'
     AND p.payload->'legacy_id' IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'ovn:* records missing payload.legacy_id: %', orphan_count;
  END IF;
END $$;
