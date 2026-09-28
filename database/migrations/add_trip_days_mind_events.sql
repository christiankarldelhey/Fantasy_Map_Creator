-- Mind Engine audit trail: the events[] Node translated for the episode open,
-- stored alongside the chapter it produced.
ALTER TABLE trip_days ADD COLUMN IF NOT EXISTS mind_events JSONB;
