-- Migration: Persist opening/closing energy and shadow on trip_days for daily tracking
-- Date: 2026-07-15
-- Description: Adds energy/shadow start/end columns so each generated day
--              keeps a snapshot of the traveller's state.

ALTER TABLE trip_days
  ADD COLUMN IF NOT EXISTS energy_start INT,
  ADD COLUMN IF NOT EXISTS energy_end   INT,
  ADD COLUMN IF NOT EXISTS shadow_start INT,
  ADD COLUMN IF NOT EXISTS shadow_end   INT;

COMMENT ON COLUMN trip_days.energy_start IS 'Energy at start of day (opening)';
COMMENT ON COLUMN trip_days.energy_end   IS 'Energy at end of day (closing)';
COMMENT ON COLUMN trip_days.shadow_start IS 'Shadow at start of day (opening)';
COMMENT ON COLUMN trip_days.shadow_end   IS 'Shadow at end of day (closing)';
