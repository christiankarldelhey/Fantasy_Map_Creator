-- ---------------------------------------------------------------------------
-- Backfill: grant starting kits to existing clones that have no inventory,
-- and reset days_without_food for all clones.
-- ---------------------------------------------------------------------------

-- Reset days_without_food for all clone characters.
UPDATE character_state
SET days_without_food = 0
WHERE owner_user_id IS NOT NULL;

-- Grant starting kit items to clones that have no inventory rows.
-- Uses the clone's template_id to look up the template's starting_kits.
INSERT INTO character_inventory (character_id, item_id, qty, equipped)
SELECT c.id, sk.item_id, sk.qty, false
FROM character_state c
JOIN starting_kits sk ON sk.template_id = c.template_id
WHERE c.owner_user_id IS NOT NULL
  AND c.template_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM character_inventory ci WHERE ci.character_id = c.id
  )
ON CONFLICT (character_id, item_id) DO UPDATE SET qty = EXCLUDED.qty;

-- Verification
SELECT
  c.id,
  c.name,
  c.coins,
  c.days_without_food,
  (SELECT count(*) FROM character_inventory ci WHERE ci.character_id = c.id) AS inv_count
FROM character_state c
WHERE c.owner_user_id IS NOT NULL
ORDER BY c.id;
