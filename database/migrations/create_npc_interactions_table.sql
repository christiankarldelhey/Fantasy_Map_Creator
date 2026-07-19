-- Migration: Create npc_interactions table
-- Description: Master table for NPC dialogue enrichment, providing entity-specific,
--   shadow-band-aware, character-specific dialogue content for narrative prompts.
--   Replaces conversation_topics as the primary dialogue source (conversation_topics
--   remains as a final fallback).

CREATE TABLE IF NOT EXISTS npc_interactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id       UUID REFERENCES entities(id) ON DELETE SET NULL,
    entity_type     TEXT NOT NULL,
    interaction_form TEXT NOT NULL,
    shadow_band     TEXT NOT NULL CHECK (shadow_band IN ('low', 'mid', 'high')),
    character_id    TEXT,
    cultural_family TEXT,
    region_id       TEXT,
    npc_attitude    TEXT,
    concrete_content TEXT,
    tension         TEXT,
    traveller_stance TEXT,
    topic           TEXT
);

-- Indexes for the fallback query pattern
CREATE INDEX IF NOT EXISTS idx_npc_interactions_entity_form_band
    ON npc_interactions (entity_id, interaction_form, shadow_band);

CREATE INDEX IF NOT EXISTS idx_npc_interactions_type_form_band
    ON npc_interactions (entity_type, interaction_form, shadow_band);

CREATE INDEX IF NOT EXISTS idx_npc_interactions_character
    ON npc_interactions (character_id);

CREATE INDEX IF NOT EXISTS idx_npc_interactions_cultural
    ON npc_interactions (cultural_family);
