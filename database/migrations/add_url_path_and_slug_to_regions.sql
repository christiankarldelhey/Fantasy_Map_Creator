-- Migration: Add url_path and slug to regions table
-- Purpose: Enable dynamic image resolution with fallback logic

-- Add url_path column
ALTER TABLE regions 
ADD COLUMN IF NOT EXISTS url_path TEXT DEFAULT 'assets/regions';

-- Add slug column
ALTER TABLE regions 
ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- Populate url_path for existing records
UPDATE regions 
SET url_path = 'assets/regions' 
WHERE url_path IS NULL;

-- Populate slug for existing records (snake_case of name with ID suffix to avoid duplicates)
UPDATE regions 
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '_', 'g')) || '_' || id::text
WHERE slug IS NULL;

-- Create index on slug for performance
CREATE INDEX IF NOT EXISTS idx_regions_slug ON regions(slug);

-- Add comments
COMMENT ON COLUMN regions.url_path IS 'Base path for image assets (e.g., assets/regions or cloud storage URL)';
COMMENT ON COLUMN regions.slug IS 'URL-friendly identifier in snake_case for dynamic image resolution';
