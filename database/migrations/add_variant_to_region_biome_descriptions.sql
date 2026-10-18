-- Migration: Seasonal/weather variants for region_biome_descriptions
-- Date: 2026-10-16
-- Description: Adds a `variant` dimension so a region/category can carry
--              weather- and season-conditioned phrases alongside the base
--              ones. Additive only: existing rows become variant='base' and
--              readers that predate the column keep working.
-- Idempotent: safe to run on every deploy.

ALTER TABLE region_biome_descriptions
    ADD COLUMN IF NOT EXISTS variant VARCHAR(20) NOT NULL DEFAULT 'base';

-- Replace the (region_name, category) unique key with the 3-column key.
-- ADD CONSTRAINT has no IF NOT EXISTS, so the adds are guarded.
ALTER TABLE region_biome_descriptions
    DROP CONSTRAINT IF EXISTS unique_region_category;

ALTER TABLE region_biome_descriptions
    DROP CONSTRAINT IF EXISTS region_biome_descriptions_region_name_category_key;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_region_category_variant'
          AND conrelid = 'region_biome_descriptions'::regclass
    ) THEN
        ALTER TABLE region_biome_descriptions
            ADD CONSTRAINT unique_region_category_variant
            UNIQUE (region_name, category, variant);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'valid_variant'
          AND conrelid = 'region_biome_descriptions'::regclass
    ) THEN
        ALTER TABLE region_biome_descriptions
            ADD CONSTRAINT valid_variant CHECK (
                variant IN ('base', 'summer', 'winter', 'rain', 'snow', 'cold', 'heat')
            );
    END IF;
END $$;

COMMENT ON COLUMN region_biome_descriptions.variant IS
    'Condition the phrases describe: base (always), a season (summer/winter), or a weather state (rain/snow/cold/heat). One row per (region, category, variant); readers fall back to base.';
