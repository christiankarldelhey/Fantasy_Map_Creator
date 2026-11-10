-- Migration: locations.visible_in_map
-- Date: 2026-07-15
-- Description: Adventure locations (authored for ficha anchoring, ADR-0013) live
--              in the same gazetteer table but are not drawn on the public map
--              layers. Existing gazetteer rows default to visible.

ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS visible_in_map BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN locations.visible_in_map IS 'Drawn on the public map layers; false for adventure-only anchor points (ADR-0013)';
