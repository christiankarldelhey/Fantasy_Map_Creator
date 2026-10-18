-- Migration: character_state.portrait_url — the character's face
-- Date: 2026-10-18
-- The portrait belongs to the character, not the entity (entities.name is
-- the race/lineage — 'Dúnedain', 'Noldor'). The Mind adopts it into its
-- Character card via the episode-open payload; Mind Studio renders it.
-- Idempotent: safe to run on every deploy.

ALTER TABLE character_state
    ADD COLUMN IF NOT EXISTS portrait_url TEXT;

-- Served by the backend at /portraits/<name>.png (backend/public/characters).
UPDATE character_state
SET portrait_url = '/portraits/' || name || '.png'
WHERE portrait_url IS NULL
  AND name IN ('Aranath', 'Celebrian', 'Aneriel');
