-- Rebalance encounter probabilities to reduce dominance of common animals
-- and increase variety of interesting encounters.
--
-- Strategy:
-- 1. Lower common animal types from levels 7-6 to 5-4
-- 2. Raise rare/interesting types from levels 1-2 to 3-4

BEGIN;

-- Lower common animal types (herbivores, flying_animals, insects, water_animals, other_animals)
-- Level 7 -> 5, Level 6 -> 4
UPDATE entities
SET probability_by_region = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'probability' = '7' THEN jsonb_build_object('region', elem->>'region', 'probability', '5')
      WHEN elem->>'probability' = '6' THEN jsonb_build_object('region', elem->>'region', 'probability', '4')
      ELSE elem
    END
  )
  FROM jsonb_array_elements(probability_by_region) elem
)
WHERE type IN ('herbivores', 'flying_animals', 'insects', 'water_animals', 'other_animals');

-- Raise rare/interesting types (demons, drakes, giants, maiar, undead, trolls, living_trees, pukel_constructs)
-- Level 1 -> 3, Level 2 -> 4
UPDATE entities
SET probability_by_region = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'probability' = '1' THEN jsonb_build_object('region', elem->>'region', 'probability', '3')
      WHEN elem->>'probability' = '2' THEN jsonb_build_object('region', elem->>'region', 'probability', '4')
      ELSE elem
    END
  )
  FROM jsonb_array_elements(probability_by_region) elem
)
WHERE type IN ('demons', 'drakes', 'giants', 'maiar', 'undead', 'trolls', 'living_trees', 'pukel_constructs');

-- Verify the changes
SELECT 
  type,
  jsonb_array_elements(probability_by_region)->>'probability' as level,
  COUNT(*) as count
FROM entities
WHERE type IN ('herbivores', 'flying_animals', 'insects', 'water_animals', 'other_animals', 
               'demons', 'drakes', 'giants', 'maiar', 'undead', 'trolls', 'living_trees', 'pukel_constructs')
GROUP BY type, level
ORDER BY type, level DESC;

COMMIT;
