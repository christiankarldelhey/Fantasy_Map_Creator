-- Migration: Seed npc_interactions data
-- Description: Load NPC dialogue enrichment data from CSV seed file.
--   Follows the pattern of 003_seed_conversation_topics.sql.
--   The CSV is parsed and loaded by load-seeds.js in production (Railway),
--   but this SQL migration is provided for local/manual execution.

-- Create temporary table for CSV import
DROP TABLE IF EXISTS temp_npc_interactions;

CREATE TABLE temp_npc_interactions (
    id               TEXT,
    entity_id        TEXT,
    entity_type      TEXT,
    interaction_form TEXT,
    shadow_band      TEXT,
    character_id     TEXT,
    cultural_family  TEXT,
    region_id        TEXT,
    npc_attitude     TEXT,
    concrete_content TEXT,
    tension          TEXT,
    traveller_stance TEXT,
    topic            TEXT
);

-- Import data from CSV file
COPY temp_npc_interactions(id, entity_id, entity_type, interaction_form, shadow_band,
    character_id, cultural_family, region_id, npc_attitude, concrete_content,
    tension, traveller_stance, topic)
FROM '/Users/christiankarldelhey/Documents/Middle Earth Map/database/seeds/data/csv/dialogue_master.csv'
DELIMITER ','
CSV HEADER
QUOTE '"';

-- Insert into main table with conflict resolution
INSERT INTO npc_interactions (id, entity_id, entity_type, interaction_form, shadow_band,
    character_id, cultural_family, region_id, npc_attitude, concrete_content,
    tension, traveller_stance, topic)
SELECT
    NULLIF(t.id, '')::uuid,
    NULLIF(t.entity_id, '')::uuid,
    t.entity_type,
    t.interaction_form,
    t.shadow_band,
    NULLIF(t.character_id, ''),
    NULLIF(t.cultural_family, ''),
    NULLIF(t.region_id, ''),
    t.npc_attitude,
    t.concrete_content,
    t.tension,
    t.traveller_stance,
    t.topic
FROM temp_npc_interactions t
ON CONFLICT (id) DO UPDATE SET
    entity_id        = EXCLUDED.entity_id,
    entity_type      = EXCLUDED.entity_type,
    interaction_form = EXCLUDED.interaction_form,
    shadow_band      = EXCLUDED.shadow_band,
    character_id     = EXCLUDED.character_id,
    cultural_family  = EXCLUDED.cultural_family,
    region_id        = EXCLUDED.region_id,
    npc_attitude     = EXCLUDED.npc_attitude,
    concrete_content = EXCLUDED.concrete_content,
    tension          = EXCLUDED.tension,
    traveller_stance = EXCLUDED.traveller_stance,
    topic            = EXCLUDED.topic;

-- Clean up temporary table
DROP TABLE temp_npc_interactions;

-- Verification
SELECT 'npc_interactions' AS table_name, COUNT(*) AS rows_loaded FROM npc_interactions;
