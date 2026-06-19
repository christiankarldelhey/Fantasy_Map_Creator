-- Migration: Add url_path and slug to locations table
-- Purpose: Enable dynamic image resolution with fallback logic

-- Add url_path column
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS url_path TEXT DEFAULT 'assets/locations';

-- Add slug column
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- Populate url_path for existing records
UPDATE locations 
SET url_path = 'assets/locations' 
WHERE url_path IS NULL;

-- Populate slug for existing records (snake_case of name with ID suffix to avoid duplicates)
UPDATE locations 
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '_', 'g')) || '_' || id::text
WHERE slug IS NULL;

-- Create index on slug for performance
CREATE INDEX IF NOT EXISTS idx_locations_slug ON locations(slug);

-- Add comments
COMMENT ON COLUMN locations.url_path IS 'Base path for image assets (e.g., assets/locations or cloud storage URL)';
COMMENT ON COLUMN locations.slug IS 'URL-friendly identifier in snake_case for dynamic image resolution';
