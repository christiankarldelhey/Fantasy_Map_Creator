-- Migration: add bio (description) and entity link to character_state
-- Date: 2026-06-22
-- Description: Adds a narrative description and a link to the entities table
--              (the kind of creature the character is, e.g. Dúnedain).

ALTER TABLE character_state
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id);

-- Seed the existing character (Aranath) with an English bio and the Dúnedain entity.
UPDATE character_state
SET
  description = 'Tall and silent, one of those who count the days by the stars and not by the calendar. He has spent years walking the borders of old Arnor, and this time he walks alone. He seeks an ancient road that few still speak of.',
  entity_id = 'f38ca7a3-f993-4f34-96ad-b28231f6a233'
WHERE id = (SELECT id FROM character_state ORDER BY id ASC LIMIT 1);

-- Verification
SELECT id, name, description, entity_id FROM character_state;
