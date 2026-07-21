-- Migration: add end-state columns for character death and trip termination
-- Date: 2026-07-21

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS end_cause TEXT,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP;

ALTER TABLE character_state
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'alive'
  CONSTRAINT chk_character_state_status CHECK (status IN ('alive', 'dead'));

ALTER TABLE character_state_log
  ADD COLUMN IF NOT EXISTS fate TEXT;
