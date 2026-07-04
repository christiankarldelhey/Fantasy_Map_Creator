-- Migration: Add terrain_phrases column to trip_days
-- Date: 2026-07-03
-- Description: Stores the region-specific terrain phrase map used by the day
--              so that subsequent days can build a DO NOT REUSE list.

ALTER TABLE trip_days
  ADD COLUMN IF NOT EXISTS terrain_phrases JSONB DEFAULT NULL;

COMMENT ON COLUMN trip_days.terrain_phrases IS
    'Map of region-specific terrain phrases used by this day (region -> category -> phrases). Used for anti-repetition in following days.';
