-- Migration: sighted_far on places_narration
-- Date: 2026-11-16
-- Description: a place's third face. `aspect` is what it looks like from
--              outside, up close; `presence` is what being there is like;
--              `sighted_far` is the silhouette read from beyond its reach —
--              rooftops, smoke, a broken tower on the horizon, before the
--              place is even known by name. Distant sightings carry this
--              line alone: no census, no ficha prose. {en, es}; only 'en'
--              is authored for now.

ALTER TABLE places_narration ADD COLUMN IF NOT EXISTS sighted_far JSONB;

COMMENT ON COLUMN places_narration.sighted_far IS 'The silhouette seen from beyond reach — what a place reads as before it is known {en, es}';
