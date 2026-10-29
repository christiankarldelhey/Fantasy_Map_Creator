-- Migration: Add per-trip terrain-phrase rotation state
-- Date: 2026-11-17
-- Description: tripDay resolves each region×category phrase cell to a single
--   phrase per day and records it here, so a trip does not narrate the same
--   terrain sentence twice while alternatives remain.

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS used_terrain_phrases JSONB DEFAULT '{}';

COMMENT ON COLUMN trips.used_terrain_phrases IS
  'Map of "region|category" -> phrase texts already rendered for this trip. Cells reset when every seeded phrase has been used.';
