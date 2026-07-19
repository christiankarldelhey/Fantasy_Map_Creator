-- Migration: Persist the AI generation/sampling parameters used per chapter
-- Date: 2026-07-19
-- Description: Adds the provider and sampling config actually used to generate
--              each day's narrative, so the "System" tab can show them faithfully
--              per chapter and generations remain reproducible after tuning.

ALTER TABLE trip_days
  ADD COLUMN IF NOT EXISTS ia_provider       TEXT,
  ADD COLUMN IF NOT EXISTS temperature       DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS frequency_penalty DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS presence_penalty  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS top_p             DOUBLE PRECISION;

COMMENT ON COLUMN trip_days.ia_provider       IS 'AI provider that produced the narrative (gemini | groq)';
COMMENT ON COLUMN trip_days.temperature       IS 'Sampling temperature used for this chapter';
COMMENT ON COLUMN trip_days.frequency_penalty IS 'Frequency penalty used for this chapter';
COMMENT ON COLUMN trip_days.presence_penalty  IS 'Presence penalty used for this chapter';
COMMENT ON COLUMN trip_days.top_p             IS 'Top-p (nucleus sampling) used for this chapter';
