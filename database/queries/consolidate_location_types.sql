-- ============================================================================
-- Consolidate Location Types
-- Purpose: Consolidate similar location types into broader categories
-- ============================================================================

BEGIN;

-- large town → city
UPDATE locations SET location_type = 'city' WHERE location_type = 'large town';

-- tower and coastal town → town
UPDATE locations SET location_type = 'town' WHERE location_type = 'tower and coastal town';

-- small town → village
UPDATE locations SET location_type = 'village' WHERE location_type = 'small town';

-- ruined villa → ruins
UPDATE locations SET location_type = 'ruins' WHERE location_type = 'ruined villa';

-- ruined city → ruins
UPDATE locations SET location_type = 'ruins' WHERE location_type = 'ruined city';

-- ruined elven city → ruins
UPDATE locations SET location_type = 'ruins' WHERE location_type = 'ruined elven city';

-- ruined elven-halls → ruins
UPDATE locations SET location_type = 'ruins' WHERE location_type = 'ruined elven-halls';

-- ruined tower → ruins
UPDATE locations SET location_type = 'ruins' WHERE location_type = 'ruined tower';

-- ruined citadel → ruins
UPDATE locations SET location_type = 'ruins' WHERE location_type = 'ruined citadel';

-- outpost tower → watchtower
UPDATE locations SET location_type = 'watchtower' WHERE location_type = 'outpost tower';

-- orcish city and fortress → fortified town
UPDATE locations SET location_type = 'fortified town' WHERE location_type = 'orcish city and fortress';

-- orc city → city
UPDATE locations SET location_type = 'city' WHERE location_type = 'orc city';

-- hobbit town → town
UPDATE locations SET location_type = 'town' WHERE location_type = 'hobbit town';

-- fortress/town → fortified town
UPDATE locations SET location_type = 'fortified town' WHERE location_type = 'fortress/town';

-- fortified trading settlement → fortified town
UPDATE locations SET location_type = 'fortified town' WHERE location_type = 'fortified trading settlement';

-- fortified market town → fortified town
UPDATE locations SET location_type = 'fortified town' WHERE location_type = 'fortified market town';

-- fortress and neighboring village → fortress
UPDATE locations SET location_type = 'fortress' WHERE location_type = 'fortress and neighboring village';

-- fortified mansion → keep
UPDATE locations SET location_type = 'keep' WHERE location_type = 'fortified mansion';

-- elvish village → village
UPDATE locations SET location_type = 'village' WHERE location_type = 'elvish village';

-- elvish home → manor
UPDATE locations SET location_type = 'manor' WHERE location_type = 'elvish home';

-- elven halls → manor
UPDATE locations SET location_type = 'manor' WHERE location_type = 'elven halls';

-- elvish haven → town
UPDATE locations SET location_type = 'town' WHERE location_type = 'elvish haven';

-- elven palace → keep
UPDATE locations SET location_type = 'keep' WHERE location_type = 'elven palace';

-- elven haven → town
UPDATE locations SET location_type = 'town' WHERE location_type = 'elven haven';

-- elven city → city
UPDATE locations SET location_type = 'city' WHERE location_type = 'elven city';

-- desert fortress → fortress
UPDATE locations SET location_type = 'fortress' WHERE location_type = 'desert fortress';

-- clan settlement → village
UPDATE locations SET location_type = 'village' WHERE location_type = 'clan settlement';

-- city in decline → city
UPDATE locations SET location_type = 'city' WHERE location_type = 'city in decline';

-- burial mound → burial
UPDATE locations SET location_type = 'burial' WHERE location_type = 'burial mound';

-- wizard's home → point of interest
UPDATE locations SET location_type = 'point of interest' WHERE location_type = 'wizard''s home';

-- border town and fortress → fortified town
UPDATE locations SET location_type = 'fortified town' WHERE location_type = 'border town and fortress';

-- watch-tower → watchtower
UPDATE locations SET location_type = 'watchtower' WHERE location_type = 'watch-tower';

-- watch towers → watchtower
UPDATE locations SET location_type = 'watchtower' WHERE location_type = 'watch towers';

-- underground tomb complex → dungeon
UPDATE locations SET location_type = 'dungeon' WHERE location_type = 'underground tomb complex';

-- twin cities → city
UPDATE locations SET location_type = 'city' WHERE location_type = 'twin cities';

-- tribal village → village
UPDATE locations SET location_type = 'village' WHERE location_type = 'tribal village';

-- town and hill fort → fortified town
UPDATE locations SET location_type = 'fortified town' WHERE location_type = 'town and hill fort';

-- walled city → fortified town
UPDATE locations SET location_type = 'fortified town' WHERE location_type = 'walled city';

-- tribal settlement → village
UPDATE locations SET location_type = 'village' WHERE location_type = 'tribal settlement';

-- frontier outpost → village
UPDATE locations SET location_type = 'village' WHERE location_type = 'frontier outpost';

-- citadel/fortified city → fortified town
UPDATE locations SET location_type = 'fortified town' WHERE location_type = 'citadel/fortified city';

-- mountain fortress → fortress
UPDATE locations SET location_type = 'fortress' WHERE location_type = 'mountain fortress';

-- mining community → village
UPDATE locations SET location_type = 'village' WHERE location_type = 'mining community';

-- natural stronghold → fortress
UPDATE locations SET location_type = 'fortress' WHERE location_type = 'natural stronghold';

-- caverns → cavern
UPDATE locations SET location_type = 'cavern' WHERE location_type = 'caverns';

-- port city → city
UPDATE locations SET location_type = 'city' WHERE location_type = 'port city';

-- port town → town
UPDATE locations SET location_type = 'town' WHERE location_type = 'port town';

-- deserted fortress → ruins
UPDATE locations SET location_type = 'ruins' WHERE location_type = 'deserted fortress';

-- dwarf-mansion → dwarven mine
UPDATE locations SET location_type = 'dwarven mine' WHERE location_type = 'dwarf-mansion';

-- fortified settlement → fortified town
UPDATE locations SET location_type = 'fortified town' WHERE location_type = 'fortified settlement';

-- dwarven outpost → village
UPDATE locations SET location_type = 'village' WHERE location_type = 'dwarven outpost';

-- citadel/fortified city → fortified city
UPDATE locations SET location_type = 'fortified city' WHERE location_type = 'citadel/fortified city';

-- ruined town → ruins
UPDATE locations SET location_type = 'ruins' WHERE location_type = 'ruined town';

-- stockaded town → town
UPDATE locations SET location_type = 'town' WHERE location_type = 'stockaded town';

COMMIT;

-- Verify the changes
SELECT location_type, COUNT(*) as count 
FROM locations 
GROUP BY location_type 
ORDER BY count DESC;
