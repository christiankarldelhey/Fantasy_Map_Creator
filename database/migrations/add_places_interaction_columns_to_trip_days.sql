-- Migration: Persist resolved overnight interaction and its effects on trip_days
-- Date: 2026-07-14
-- Description: Adds columns so the future character-state system can read them.

ALTER TABLE trip_days
  ADD COLUMN IF NOT EXISTS places_interaction_id INTEGER REFERENCES places_interactions(id),
  ADD COLUMN IF NOT EXISTS rest_quality SMALLINT,
  ADD COLUMN IF NOT EXISTS shadow_effect SMALLINT;

COMMENT ON COLUMN trip_days.places_interaction_id IS 'Resolved places_interactions row for the night';
COMMENT ON COLUMN trip_days.rest_quality IS 'Energy recovery from the resolved overnight interaction (0..3)';
COMMENT ON COLUMN trip_days.shadow_effect IS 'Shadow stat shift from the resolved overnight interaction (-2..+2)';
