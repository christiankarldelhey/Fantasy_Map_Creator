-- Migration: Seed character_state from entities (humans, elves, dwarves, hobbits)
-- Date: 2026-06-25
-- Description: Creates character records from entities for the character selector

-- Insert characters from entities (excluding groups and tier='group')
INSERT INTO character_state (name, type, gender, active, description, entity_id, current_lng, current_lat, slug)
SELECT 
    e.name,
    e.type,
    CASE 
        WHEN e.type = 'elves' THEN 'female'
        WHEN e.type = 'dwarves' THEN 'male'
        WHEN e.type = 'hobbits' THEN 'male'
        ELSE 'male'
    END as gender,
    false,
    e.description_summary,
    e.id,
    1.228323, -- Bree coordinates as default
    51.560255,
    e.slug
FROM entities e
WHERE e.type IN ('humans', 'elves', 'dwarves', 'hobbits')
  AND (e.tier IS NULL OR e.tier != 'group')
  AND NOT EXISTS (
    SELECT 1 FROM character_state c WHERE c.entity_id = e.id
  );

-- Verification
SELECT COUNT(*) as total_characters FROM character_state;
SELECT type, COUNT(*) as count FROM character_state GROUP BY type;
