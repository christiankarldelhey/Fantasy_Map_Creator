-- Unify ambiguous encounters based on user decisions
-- This script merges duplicate encounters and updates all relationships
-- Handles cases where a region has both encounters by summing probabilities

BEGIN;

-- 1. General Traps -> General Trap
-- First, handle regions that have both encounters by summing probabilities
WITH duplicates AS (
  SELECT re1.region_id, 
         (SELECT id FROM encounters WHERE slug = 'General_Trap') as target_id,
         (SELECT id FROM encounters WHERE slug = 'General_Traps') as source_id,
         re1.probability_pct + re2.probability_pct as combined_prob
  FROM region_encounters re1
  JOIN region_encounters re2 ON re1.region_id = re2.region_id
  WHERE re1.encounter_id = (SELECT id FROM encounters WHERE slug = 'General_Trap')
    AND re2.encounter_id = (SELECT id FROM encounters WHERE slug = 'General_Traps')
)
UPDATE region_encounters
SET probability_pct = duplicates.combined_prob
FROM duplicates
WHERE region_encounters.region_id = duplicates.region_id
  AND region_encounters.encounter_id = duplicates.target_id;

-- Delete the duplicate relationships
DELETE FROM region_encounters 
WHERE encounter_id = (SELECT id FROM encounters WHERE slug = 'General_Traps');

-- Update remaining references
UPDATE region_encounters 
SET encounter_id = (SELECT id FROM encounters WHERE slug = 'General_Trap')
WHERE encounter_id = (SELECT id FROM encounters WHERE slug = 'General_Traps');

DELETE FROM encounters WHERE slug = 'General_Traps';

-- 2. Other Animal -> Other Animals
WITH duplicates AS (
  SELECT re1.region_id, 
         (SELECT id FROM encounters WHERE slug = 'Other_Animals') as target_id,
         (SELECT id FROM encounters WHERE slug = 'Other_Animal') as source_id,
         re1.probability_pct + re2.probability_pct as combined_prob
  FROM region_encounters re1
  JOIN region_encounters re2 ON re1.region_id = re2.region_id
  WHERE re1.encounter_id = (SELECT id FROM encounters WHERE slug = 'Other_Animals')
    AND re2.encounter_id = (SELECT id FROM encounters WHERE slug = 'Other_Animal')
)
UPDATE region_encounters
SET probability_pct = duplicates.combined_prob
FROM duplicates
WHERE region_encounters.region_id = duplicates.region_id
  AND region_encounters.encounter_id = duplicates.target_id;

DELETE FROM region_encounters 
WHERE encounter_id = (SELECT id FROM encounters WHERE slug = 'Other_Animal');

UPDATE region_encounters 
SET encounter_id = (SELECT id FROM encounters WHERE slug = 'Other_Animals')
WHERE encounter_id = (SELECT id FROM encounters WHERE slug = 'Other_Animal');

DELETE FROM encounters WHERE slug = 'Other_Animal';

-- 3. Wild Boars -> Wild Boar
WITH duplicates AS (
  SELECT re1.region_id, 
         (SELECT id FROM encounters WHERE slug = 'Wild_Boar') as target_id,
         (SELECT id FROM encounters WHERE slug = 'Wild_Boars') as source_id,
         re1.probability_pct + re2.probability_pct as combined_prob
  FROM region_encounters re1
  JOIN region_encounters re2 ON re1.region_id = re2.region_id
  WHERE re1.encounter_id = (SELECT id FROM encounters WHERE slug = 'Wild_Boar')
    AND re2.encounter_id = (SELECT id FROM encounters WHERE slug = 'Wild_Boars')
)
UPDATE region_encounters
SET probability_pct = duplicates.combined_prob
FROM duplicates
WHERE region_encounters.region_id = duplicates.region_id
  AND region_encounters.encounter_id = duplicates.target_id;

DELETE FROM region_encounters 
WHERE encounter_id = (SELECT id FROM encounters WHERE slug = 'Wild_Boars');

UPDATE region_encounters 
SET encounter_id = (SELECT id FROM encounters WHERE slug = 'Wild_Boar')
WHERE encounter_id = (SELECT id FROM encounters WHERE slug = 'Wild_Boars');

DELETE FROM encounters WHERE slug = 'Wild_Boars';

-- 4. Settlement/Camp -> Settlement Camp
WITH duplicates AS (
  SELECT re1.region_id, 
         (SELECT id FROM encounters WHERE slug = 'Settlement_Camp') as target_id,
         (SELECT id FROM encounters WHERE slug = 'Settlement/Camp') as source_id,
         re1.probability_pct + re2.probability_pct as combined_prob
  FROM region_encounters re1
  JOIN region_encounters re2 ON re1.region_id = re2.region_id
  WHERE re1.encounter_id = (SELECT id FROM encounters WHERE slug = 'Settlement_Camp')
    AND re2.encounter_id = (SELECT id FROM encounters WHERE slug = 'Settlement/Camp')
)
UPDATE region_encounters
SET probability_pct = duplicates.combined_prob
FROM duplicates
WHERE region_encounters.region_id = duplicates.region_id
  AND region_encounters.encounter_id = duplicates.target_id;

DELETE FROM region_encounters 
WHERE encounter_id = (SELECT id FROM encounters WHERE slug = 'Settlement/Camp');

UPDATE region_encounters 
SET encounter_id = (SELECT id FROM encounters WHERE slug = 'Settlement_Camp')
WHERE encounter_id = (SELECT id FROM encounters WHERE slug = 'Settlement/Camp');

DELETE FROM encounters WHERE slug = 'Settlement/Camp';

-- 5. Mine/Quarry -> Mine Quarry
WITH duplicates AS (
  SELECT re1.region_id, 
         (SELECT id FROM encounters WHERE slug = 'Mine_Quarry') as target_id,
         (SELECT id FROM encounters WHERE slug = 'Mine/Quarry') as source_id,
         re1.probability_pct + re2.probability_pct as combined_prob
  FROM region_encounters re1
  JOIN region_encounters re2 ON re1.region_id = re2.region_id
  WHERE re1.encounter_id = (SELECT id FROM encounters WHERE slug = 'Mine_Quarry')
    AND re2.encounter_id = (SELECT id FROM encounters WHERE slug = 'Mine/Quarry')
)
UPDATE region_encounters
SET probability_pct = duplicates.combined_prob
FROM duplicates
WHERE region_encounters.region_id = duplicates.region_id
  AND region_encounters.encounter_id = duplicates.target_id;

DELETE FROM region_encounters 
WHERE encounter_id = (SELECT id FROM encounters WHERE slug = 'Mine/Quarry');

UPDATE region_encounters 
SET encounter_id = (SELECT id FROM encounters WHERE slug = 'Mine_Quarry')
WHERE encounter_id = (SELECT id FROM encounters WHERE slug = 'Mine/Quarry');

DELETE FROM encounters WHERE slug = 'Mine/Quarry';

-- 6. Bat N -> Bats N
WITH duplicates AS (
  SELECT re1.region_id, 
         (SELECT id FROM encounters WHERE slug = 'Bats_N') as target_id,
         (SELECT id FROM encounters WHERE slug = 'Bat_N') as source_id,
         re1.probability_pct + re2.probability_pct as combined_prob
  FROM region_encounters re1
  JOIN region_encounters re2 ON re1.region_id = re2.region_id
  WHERE re1.encounter_id = (SELECT id FROM encounters WHERE slug = 'Bats_N')
    AND re2.encounter_id = (SELECT id FROM encounters WHERE slug = 'Bat_N')
)
UPDATE region_encounters
SET probability_pct = duplicates.combined_prob
FROM duplicates
WHERE region_encounters.region_id = duplicates.region_id
  AND region_encounters.encounter_id = duplicates.target_id;

DELETE FROM region_encounters 
WHERE encounter_id = (SELECT id FROM encounters WHERE slug = 'Bat_N');

UPDATE region_encounters 
SET encounter_id = (SELECT id FROM encounters WHERE slug = 'Bats_N')
WHERE encounter_id = (SELECT id FROM encounters WHERE slug = 'Bat_N');

DELETE FROM encounters WHERE slug = 'Bat_N';

-- 7. Black Bear -> Black Bears
WITH duplicates AS (
  SELECT re1.region_id, 
         (SELECT id FROM encounters WHERE slug = 'Black_Bears') as target_id,
         (SELECT id FROM encounters WHERE slug = 'Black_Bear') as source_id,
         re1.probability_pct + re2.probability_pct as combined_prob
  FROM region_encounters re1
  JOIN region_encounters re2 ON re1.region_id = re2.region_id
  WHERE re1.encounter_id = (SELECT id FROM encounters WHERE slug = 'Black_Bears')
    AND re2.encounter_id = (SELECT id FROM encounters WHERE slug = 'Black_Bear')
)
UPDATE region_encounters
SET probability_pct = duplicates.combined_prob
FROM duplicates
WHERE region_encounters.region_id = duplicates.region_id
  AND region_encounters.encounter_id = duplicates.target_id;

DELETE FROM region_encounters 
WHERE encounter_id = (SELECT id FROM encounters WHERE slug = 'Black_Bear');

UPDATE region_encounters 
SET encounter_id = (SELECT id FROM encounters WHERE slug = 'Black_Bears')
WHERE encounter_id = (SELECT id FROM encounters WHERE slug = 'Black_Bear');

DELETE FROM encounters WHERE slug = 'Black_Bear';

-- 8. Cave/Cavern -> Cave Cavern
WITH duplicates AS (
  SELECT re1.region_id, 
         (SELECT id FROM encounters WHERE slug = 'Cave_Cavern') as target_id,
         (SELECT id FROM encounters WHERE slug = 'Cave/Cavern') as source_id,
         re1.probability_pct + re2.probability_pct as combined_prob
  FROM region_encounters re1
  JOIN region_encounters re2 ON re1.region_id = re2.region_id
  WHERE re1.encounter_id = (SELECT id FROM encounters WHERE slug = 'Cave_Cavern')
    AND re2.encounter_id = (SELECT id FROM encounters WHERE slug = 'Cave/Cavern')
)
UPDATE region_encounters
SET probability_pct = duplicates.combined_prob
FROM duplicates
WHERE region_encounters.region_id = duplicates.region_id
  AND region_encounters.encounter_id = duplicates.target_id;

DELETE FROM region_encounters 
WHERE encounter_id = (SELECT id FROM encounters WHERE slug = 'Cave/Cavern');

UPDATE region_encounters 
SET encounter_id = (SELECT id FROM encounters WHERE slug = 'Cave_Cavern')
WHERE encounter_id = (SELECT id FROM encounters WHERE slug = 'Cave/Cavern');

DELETE FROM encounters WHERE slug = 'Cave/Cavern';

-- 9. Golden Eagles -> Golden Eagle
WITH duplicates AS (
  SELECT re1.region_id, 
         (SELECT id FROM encounters WHERE slug = 'Golden_Eagle') as target_id,
         (SELECT id FROM encounters WHERE slug = 'Golden_Eagles') as source_id,
         re1.probability_pct + re2.probability_pct as combined_prob
  FROM region_encounters re1
  JOIN region_encounters re2 ON re1.region_id = re2.region_id
  WHERE re1.encounter_id = (SELECT id FROM encounters WHERE slug = 'Golden_Eagle')
    AND re2.encounter_id = (SELECT id FROM encounters WHERE slug = 'Golden_Eagles')
)
UPDATE region_encounters
SET probability_pct = duplicates.combined_prob
FROM duplicates
WHERE region_encounters.region_id = duplicates.region_id
  AND region_encounters.encounter_id = duplicates.target_id;

DELETE FROM region_encounters 
WHERE encounter_id = (SELECT id FROM encounters WHERE slug = 'Golden_Eagles');

UPDATE region_encounters 
SET encounter_id = (SELECT id FROM encounters WHERE slug = 'Golden_Eagle')
WHERE encounter_id = (SELECT id FROM encounters WHERE slug = 'Golden_Eagles');

DELETE FROM encounters WHERE slug = 'Golden_Eagles';

-- 10. Brown Bears -> Brown Bear
WITH duplicates AS (
  SELECT re1.region_id, 
         (SELECT id FROM encounters WHERE slug = 'Brown_Bear') as target_id,
         (SELECT id FROM encounters WHERE slug = 'Brown_Bears') as source_id,
         re1.probability_pct + re2.probability_pct as combined_prob
  FROM region_encounters re1
  JOIN region_encounters re2 ON re1.region_id = re2.region_id
  WHERE re1.encounter_id = (SELECT id FROM encounters WHERE slug = 'Brown_Bear')
    AND re2.encounter_id = (SELECT id FROM encounters WHERE slug = 'Brown_Bears')
)
UPDATE region_encounters
SET probability_pct = duplicates.combined_prob
FROM duplicates
WHERE region_encounters.region_id = duplicates.region_id
  AND region_encounters.encounter_id = duplicates.target_id;

DELETE FROM region_encounters 
WHERE encounter_id = (SELECT id FROM encounters WHERE slug = 'Brown_Bears');

UPDATE region_encounters 
SET encounter_id = (SELECT id FROM encounters WHERE slug = 'Brown_Bear')
WHERE encounter_id = (SELECT id FROM encounters WHERE slug = 'Brown_Bears');

DELETE FROM encounters WHERE slug = 'Brown_Bears';

COMMIT;

-- Verify results
SELECT 'Total encounters after unification:' as info, COUNT(*) FROM encounters;
SELECT 'Total region-encounter relationships after unification:' as info, COUNT(*) FROM region_encounters;
