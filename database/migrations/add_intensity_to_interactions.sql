-- interactions.intensity — the choice's own force dial (#184): the same
-- authored 0-4 scale as encounter_forms and places_narration. A 'defy'
-- hits harder than an 'avoid' under the same encounter; NULL lets the
-- outcome inherit the encounter's force on the wire.
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS intensity smallint;
