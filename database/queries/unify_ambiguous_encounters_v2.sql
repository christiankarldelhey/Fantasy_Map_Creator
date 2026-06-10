-- Unify ambiguous encounters based on user decisions
-- This version works with the single encounters table (probability_by_region JSONB)

BEGIN;

-- 1. General Traps -> General Trap
WITH target AS (
  SELECT probability_by_region FROM encounters WHERE slug = 'General_Trap'
),
source AS (
  SELECT probability_by_region FROM encounters WHERE slug = 'General_Traps'
)
UPDATE encounters
SET probability_by_region = target.probability_by_region || source.probability_by_region
FROM target, source
WHERE slug = 'General_Trap';

DELETE FROM encounters WHERE slug = 'General_Traps';

-- 2. Other Animal -> Other Animals
WITH target AS (
  SELECT probability_by_region FROM encounters WHERE slug = 'Other_Animals'
),
source AS (
  SELECT probability_by_region FROM encounters WHERE slug = 'Other_Animal'
)
UPDATE encounters
SET probability_by_region = target.probability_by_region || source.probability_by_region
FROM target, source
WHERE slug = 'Other_Animals';

DELETE FROM encounters WHERE slug = 'Other_Animal';

-- 3. Wild Boars -> Wild Boar
WITH target AS (
  SELECT probability_by_region FROM encounters WHERE slug = 'Wild_Boar'
),
source AS (
  SELECT probability_by_region FROM encounters WHERE slug = 'Wild_Boars'
)
UPDATE encounters
SET probability_by_region = target.probability_by_region || source.probability_by_region
FROM target, source
WHERE slug = 'Wild_Boar';

DELETE FROM encounters WHERE slug = 'Wild_Boars';

-- 4. Settlement/Camp -> Settlement Camp
WITH target AS (
  SELECT probability_by_region FROM encounters WHERE slug = 'Settlement_Camp'
),
source AS (
  SELECT probability_by_region FROM encounters WHERE slug = 'Settlement/Camp'
)
UPDATE encounters
SET probability_by_region = target.probability_by_region || source.probability_by_region
FROM target, source
WHERE slug = 'Settlement_Camp';

DELETE FROM encounters WHERE slug = 'Settlement/Camp';

-- 5. Mine/Quarry -> Mine Quarry
WITH target AS (
  SELECT probability_by_region FROM encounters WHERE slug = 'Mine_Quarry'
),
source AS (
  SELECT probability_by_region FROM encounters WHERE slug = 'Mine/Quarry'
)
UPDATE encounters
SET probability_by_region = target.probability_by_region || source.probability_by_region
FROM target, source
WHERE slug = 'Mine_Quarry';

DELETE FROM encounters WHERE slug = 'Mine/Quarry';

-- 6. Bat N -> Bats N
WITH target AS (
  SELECT probability_by_region FROM encounters WHERE slug = 'Bats_N'
),
source AS (
  SELECT probability_by_region FROM encounters WHERE slug = 'Bat_N'
)
UPDATE encounters
SET probability_by_region = target.probability_by_region || source.probability_by_region
FROM target, source
WHERE slug = 'Bats_N';

DELETE FROM encounters WHERE slug = 'Bat_N';

-- 7. Black Bear -> Black Bears
WITH target AS (
  SELECT probability_by_region FROM encounters WHERE slug = 'Black_Bears'
),
source AS (
  SELECT probability_by_region FROM encounters WHERE slug = 'Black_Bear'
)
UPDATE encounters
SET probability_by_region = target.probability_by_region || source.probability_by_region
FROM target, source
WHERE slug = 'Black_Bears';

DELETE FROM encounters WHERE slug = 'Black_Bear';

-- 8. Cave/Cavern -> Cave Cavern
WITH target AS (
  SELECT probability_by_region FROM encounters WHERE slug = 'Cave_Cavern'
),
source AS (
  SELECT probability_by_region FROM encounters WHERE slug = 'Cave/Cavern'
)
UPDATE encounters
SET probability_by_region = target.probability_by_region || source.probability_by_region
FROM target, source
WHERE slug = 'Cave_Cavern';

DELETE FROM encounters WHERE slug = 'Cave/Cavern';

-- 9. Golden Eagles -> Golden Eagle
WITH target AS (
  SELECT probability_by_region FROM encounters WHERE slug = 'Golden_Eagle'
),
source AS (
  SELECT probability_by_region FROM encounters WHERE slug = 'Golden_Eagles'
)
UPDATE encounters
SET probability_by_region = target.probability_by_region || source.probability_by_region
FROM target, source
WHERE slug = 'Golden_Eagle';

DELETE FROM encounters WHERE slug = 'Golden_Eagles';

-- 10. Brown Bears -> Brown Bear
WITH target AS (
  SELECT probability_by_region FROM encounters WHERE slug = 'Brown_Bear'
),
source AS (
  SELECT probability_by_region FROM encounters WHERE slug = 'Brown_Bears'
)
UPDATE encounters
SET probability_by_region = target.probability_by_region || source.probability_by_region
FROM target, source
WHERE slug = 'Brown_Bear';

DELETE FROM encounters WHERE slug = 'Brown_Bears';

COMMIT;

-- Verify results
SELECT 'Total encounters after unification:' as info, COUNT(*) FROM encounters;
