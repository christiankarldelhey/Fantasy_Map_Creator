-- ============================================================================
-- trip_days.places_narration_id (#104, step 1 of 2)
-- ----------------------------------------------------------------------------
-- Text pointer to the resolved overnight record, replacing the int FK into
-- places_interactions. Added + backfilled here; the legacy column and table
-- drop in drop_legacy_narrative_tables.sql once writers/readers are swapped.
-- ============================================================================

ALTER TABLE trip_days
  ADD COLUMN IF NOT EXISTS places_narration_id TEXT;

-- Backfill only while the legacy column still exists: the drop migration
-- removes it, and reseeds on a post-drop DB must not reference it.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'trip_days' AND column_name = 'places_interaction_id') THEN
    UPDATE trip_days td
       SET places_narration_id = 'ovn:' || td.places_interaction_id
     WHERE td.places_interaction_id IS NOT NULL
       AND td.places_narration_id IS NULL
       AND EXISTS (SELECT 1 FROM places_narration p
                    WHERE p.id = 'ovn:' || td.places_interaction_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'trip_days_places_narration_id_fkey') THEN
    ALTER TABLE trip_days
      ADD CONSTRAINT trip_days_places_narration_id_fkey
      FOREIGN KEY (places_narration_id) REFERENCES places_narration(id);
  END IF;
END $$;
