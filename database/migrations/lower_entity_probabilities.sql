-- Lower entity probabilities to reduce common encounters
-- Probability 8 → 7, Probability 7 → 6 (keep 1-6 unchanged)

UPDATE entities
SET probability_by_region = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'region', p->>'region',
      'probability',
      CASE
        WHEN (p->>'probability')::int = 8 THEN 7
        WHEN (p->>'probability')::int = 7 THEN 6
        ELSE (p->>'probability')::int
      END
    )
  )
  FROM jsonb_array_elements(probability_by_region) p
)
WHERE probability_by_region IS NOT NULL
AND EXISTS (
  SELECT 1 FROM jsonb_array_elements(probability_by_region) p
  WHERE (p->>'probability')::int IN (7, 8)
);
