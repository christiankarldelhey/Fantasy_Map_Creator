-- Migration: drop dead encounter-metric columns from regions
-- distance_for_encounter and hours_to_encounter fed an abandoned
-- distance/time-based encounter model; nothing reads them.
-- chance_of_encounter survives — it is now the per-phase encounter
-- roll read by the encounter engine.
ALTER TABLE regions
  DROP COLUMN IF EXISTS distance_for_encounter,
  DROP COLUMN IF EXISTS hours_to_encounter;
