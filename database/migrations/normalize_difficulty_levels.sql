-- Migration: Normalize difficulty levels from text to numeric (1-8)
-- Date: 2026-06-20
-- Description: Converts text difficulty levels to numeric values (1=least probable, 8=most probable)

-- Mapping:
-- 1 = Absurd (casi imposible)
-- 2 = Sheer Folly (locura total)
-- 3 = Extremely Hard (extremadamente difícil)
-- 4 = Very Hard (muy difícil)
-- 5 = Hard (difícil)
-- 6 = Medium (medio)
-- 7 = Light (ligero)
-- 8 = Easy (fácil)

UPDATE entities
SET probability_by_region = (
    SELECT jsonb_agg(
        jsonb_build_object(
            'region', item->>'region',
            'probability', 
            CASE item->>'probability'
                WHEN 'Absurd' THEN 1
                WHEN 'Sheer Folly' THEN 2
                WHEN 'Extremely Hard' THEN 3
                WHEN 'Very Hard' THEN 4
                WHEN 'Hard' THEN 5
                WHEN 'Medium' THEN 6
                WHEN 'Light' THEN 7
                WHEN 'Easy' THEN 8
                ELSE 6 -- Default to Medium if unknown
            END
        )
    )
    FROM jsonb_array_elements(probability_by_region) AS item
)
WHERE probability_by_region != '[]';

-- Verify the update
SELECT 
    COUNT(*) as total_entities,
    COUNT(CASE WHEN probability_by_region = '[]' THEN 1 END) as empty_probabilities,
    COUNT(CASE WHEN probability_by_region != '[]' THEN 1 END) as with_probabilities
FROM entities;

-- Show sample of updated data
SELECT name, probability_by_region 
FROM entities 
WHERE probability_by_region != '[]' 
LIMIT 5;
