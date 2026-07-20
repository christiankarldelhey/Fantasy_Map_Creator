-- Migration: Add slug column to character_state
-- Date: 2026-06-26
-- Description: Gives characters a stable slug for the resolver.

-- Add the column (nullable at first so we can populate existing rows)
ALTER TABLE character_state
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Populate slugs for existing rows from their names
UPDATE character_state
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '_', 'g'))
WHERE slug IS NULL OR slug = '';

-- Enforce uniqueness and not-null
CREATE UNIQUE INDEX IF NOT EXISTS idx_character_state_slug ON character_state (slug);
ALTER TABLE character_state
  ALTER COLUMN slug SET NOT NULL;

-- Auto-generate slug for future inserts/updates that omit it
CREATE OR REPLACE FUNCTION character_state_set_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := LOWER(REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9]+', '_', 'g'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS character_state_set_slug_trigger ON character_state;
CREATE TRIGGER character_state_set_slug_trigger
  BEFORE INSERT OR UPDATE ON character_state
  FOR EACH ROW
  EXECUTE PROCEDURE character_state_set_slug();

-- Verification
SELECT id, name, slug FROM character_state ORDER BY id;
