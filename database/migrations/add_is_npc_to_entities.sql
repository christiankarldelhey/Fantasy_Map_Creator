-- Migration: Add is_npc column to entities table
-- Description: Boolean flag to distinguish NPCs (can talk / interact socially)
--   from creatures and environmental entities.
--   true for: humans, elves, dwarves, hobbits, orcs, maiar, living_trees, undead, drakes
--   false for: all other types (animals, monsters, plants, hazards, etc.)

ALTER TABLE entities
    ADD COLUMN IF NOT EXISTS is_npc BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing rows based on entity type
UPDATE entities
    SET is_npc = true
    WHERE type IN ('humans', 'elves', 'dwarves', 'hobbits', 'orcs', 'maiar', 'living_trees', 'undead', 'drakes')
      AND is_npc = false;

-- Index for efficient NPC filtering
CREATE INDEX IF NOT EXISTS idx_entities_is_npc ON entities(is_npc);
