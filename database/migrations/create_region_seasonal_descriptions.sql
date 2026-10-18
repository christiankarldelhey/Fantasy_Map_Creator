-- Migration: Create region_seasonal_descriptions table
-- Date: 2026-10-16
-- Description: Seasonal/weather variants of a region's narrator-facing
--              summary (the "lands crossed" line). The base summary keeps
--              living in regions.description_summary; this table only holds
--              variants. Missing table or missing variant -> readers fall
--              back to the base summary.

CREATE TABLE IF NOT EXISTS region_seasonal_descriptions (
    id SERIAL PRIMARY KEY,
    region_name VARCHAR(255) NOT NULL,
    variant VARCHAR(20) NOT NULL,
    phrases TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT unique_region_variant UNIQUE (region_name, variant),
    CONSTRAINT valid_summary_variant CHECK (
        variant IN ('summer', 'winter', 'rain', 'snow', 'cold', 'heat')
    )
);

CREATE INDEX IF NOT EXISTS idx_region_seasonal_descriptions_region_name
    ON region_seasonal_descriptions(region_name);

COMMENT ON TABLE region_seasonal_descriptions IS
    'Season/weather variants of regions.description_summary, keyed by region name.';

COMMENT ON COLUMN region_seasonal_descriptions.region_name IS
    'Must match regions.name; no FK so the table can be rebuilt independently.';

COMMENT ON COLUMN region_seasonal_descriptions.variant IS
    'Condition the phrases describe: a season (summer/winter) or a weather state (rain/snow/cold/heat).';

COMMENT ON COLUMN region_seasonal_descriptions.phrases IS
    'Array of short narrative phrases; one is picked at random when building the prompt.';
