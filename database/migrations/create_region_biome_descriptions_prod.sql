-- Execute this manually in Railway production database
-- via Railway console or psql connection

CREATE TABLE IF NOT EXISTS region_biome_descriptions (
    id SERIAL PRIMARY KEY,
    region_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    phrases TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT unique_region_category UNIQUE (region_name, category),
    CONSTRAINT valid_category CHECK (
        category IN (
            'forest', 'hills', 'marsh', 'plain', 'desert',
            'mountains_low', 'mountains_med', 'mountains_high',
            'road', 'trail'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_region_biome_descriptions_region_name
    ON region_biome_descriptions(region_name);

CREATE INDEX IF NOT EXISTS idx_region_biome_descriptions_category
    ON region_biome_descriptions(category);

COMMENT ON TABLE region_biome_descriptions IS
    'Narrative phrases for terrain categories, keyed by region name.';

COMMENT ON COLUMN region_biome_descriptions.region_name IS
    'Must match regions.name; no FK so the table can be rebuilt independently.';

COMMENT ON COLUMN region_biome_descriptions.category IS
    'Terrain/biome/road category: forest, hills, marsh, plain, desert, mountains_low, mountains_med, mountains_high, road, trail.';

COMMENT ON COLUMN region_biome_descriptions.phrases IS
    'Array of short narrative phrases; one is picked at random when building the prompt.';
