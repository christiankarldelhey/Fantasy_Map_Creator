-- ============================================================================
-- Two meals a day
-- ----------------------------------------------------------------------------
-- The traveller eats twice a day: a midday halt on the road and supper at
-- camp. Each meal records what was eaten and drunk so the narrator can render
-- it, and so a chapter can be re-narrated later with the same food.
--
-- Shape: [{ slot, itemId, slug, food, drink, waterLitres, energyBonus }]
-- ============================================================================

ALTER TABLE trip_days
  ADD COLUMN IF NOT EXISTS meals JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN trip_days.meals IS
  'The day''s meals: midday halt and evening meal at camp, with what was eaten and drunk.';
