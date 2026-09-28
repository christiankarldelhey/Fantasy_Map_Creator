-- Mind call audit: exact wire payloads of the episode open and close calls.
-- mind_events is superseded (the events[] live inside mind_open.request.events).
ALTER TABLE trip_days
  ADD COLUMN IF NOT EXISTS mind_open JSONB,
  ADD COLUMN IF NOT EXISTS mind_close JSONB,
  DROP COLUMN IF EXISTS mind_events;
