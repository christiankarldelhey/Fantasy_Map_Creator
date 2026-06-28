-- Migration: Add population_ratio to regions
-- Date: 2026-06-28
-- Description: Ratio 0–1 indicating how densely populated / frequented by
--              thinking beings a region is. Used by the encounter engine to
--              scale the probability of face-to-face encounters with intelligent
--              entities (elves, humans, orcs, dwarfs, hobbits, etc.).
--              1.0 = The Shire (most inhabited), 0.0 = Forodwaith (uninhabited).

ALTER TABLE regions
  ADD COLUMN IF NOT EXISTS population_ratio NUMERIC(3,2) DEFAULT 0.5
    CHECK (population_ratio BETWEEN 0 AND 1);

-- ============================================================================
-- Initial values for known regions (ordered most → least inhabited)
-- ============================================================================

-- The Shire — the most settled, cosy corner of Middle-earth
UPDATE regions SET population_ratio = 1.0  WHERE name = 'The Shire';

-- Bree-land — crossroads region, heavily trafficked
UPDATE regions SET population_ratio = 0.90 WHERE name = 'Bree-land';
UPDATE regions SET population_ratio = 0.90 WHERE name = 'Bree';

-- Rohan — wide grasslands but well-patrolled horse-lords
UPDATE regions SET population_ratio = 0.65 WHERE name = 'Rohan';
UPDATE regions SET population_ratio = 0.65 WHERE name = 'Westfold';

-- Gondor heartland — populous and well-ordered
UPDATE regions SET population_ratio = 0.80 WHERE name = 'Gondor';
UPDATE regions SET population_ratio = 0.80 WHERE name = 'Anórien';
UPDATE regions SET population_ratio = 0.80 WHERE name = 'Anorien';
UPDATE regions SET population_ratio = 0.75 WHERE name = 'Lebennin';
UPDATE regions SET population_ratio = 0.70 WHERE name = 'Lossarnach';
UPDATE regions SET population_ratio = 0.70 WHERE name = 'Pelargir';

-- Eriador / Arnor remnants — sparsely settled
UPDATE regions SET population_ratio = 0.40 WHERE name = 'Eriador';
UPDATE regions SET population_ratio = 0.35 WHERE name = 'Minhiriath';
UPDATE regions SET population_ratio = 0.30 WHERE name = 'Cardolan';
UPDATE regions SET population_ratio = 0.30 WHERE name = 'Rhudaur';

-- Weathertop / Lone-lands — desolate
UPDATE regions SET population_ratio = 0.15 WHERE name = 'Lone-lands';
UPDATE regions SET population_ratio = 0.15 WHERE name = 'Weather Hills';

-- Wilderland / Rhovanion — varied but mostly wilderness
UPDATE regions SET population_ratio = 0.45 WHERE name = 'Rhovanion';
UPDATE regions SET population_ratio = 0.40 WHERE name = 'Mirkwood';
UPDATE regions SET population_ratio = 0.25 WHERE name = 'Northern Mirkwood';
UPDATE regions SET population_ratio = 0.35 WHERE name = 'Southern Mirkwood';
UPDATE regions SET population_ratio = 0.35 WHERE name = 'The Long Lake Region';
UPDATE regions SET population_ratio = 0.50 WHERE name = 'Dale';
UPDATE regions SET population_ratio = 0.50 WHERE name = 'Erebor';

-- Lothlórien — elven realm, present but secluded
UPDATE regions SET population_ratio = 0.55 WHERE name = 'Lothlórien';
UPDATE regions SET population_ratio = 0.55 WHERE name = 'Lorien';

-- Rivendell area — elven, relatively safe
UPDATE regions SET population_ratio = 0.55 WHERE name = 'Rivendell';
UPDATE regions SET population_ratio = 0.55 WHERE name = 'Imladris';

-- Fangorn — ancient forest, effectively unpopulated
UPDATE regions SET population_ratio = 0.10 WHERE name = 'Fangorn';

-- Enedwaith — wild and largely empty
UPDATE regions SET population_ratio = 0.20 WHERE name = 'Enedwaith';

-- Dunland — semi-wild hill folk
UPDATE regions SET population_ratio = 0.30 WHERE name = 'Dunland';

-- Mordor — occupied by orcs but desolate in feel
UPDATE regions SET population_ratio = 0.20 WHERE name = 'Mordor';
UPDATE regions SET population_ratio = 0.10 WHERE name = 'Gorgoroth';
UPDATE regions SET population_ratio = 0.15 WHERE name = 'Nurn';

-- Far Harad / Rhún — distant, largely unknown
UPDATE regions SET population_ratio = 0.20 WHERE name = 'Near Harad';
UPDATE regions SET population_ratio = 0.10 WHERE name = 'Far Harad';
UPDATE regions SET population_ratio = 0.15 WHERE name = 'Rhún';

-- The North — near-empty wilderness
UPDATE regions SET population_ratio = 0.05 WHERE name = 'Forodwaith';
UPDATE regions SET population_ratio = 0.05 WHERE name = 'Angmar';
UPDATE regions SET population_ratio = 0.10 WHERE name = 'Ettenmoors';
UPDATE regions SET population_ratio = 0.10 WHERE name = 'The Trollshaws';

-- Misty Mountains — dangerous but traversed
UPDATE regions SET population_ratio = 0.15 WHERE name = 'Misty Mountains';
UPDATE regions SET population_ratio = 0.10 WHERE name = 'Mount Gundabad';

-- Old Forest / Barrow-downs — magical wilderness
UPDATE regions SET population_ratio = 0.05 WHERE name = 'Old Forest';
UPDATE regions SET population_ratio = 0.05 WHERE name = 'Barrow-downs';

-- Dead Marshes / Dagorlad — utterly desolate
UPDATE regions SET population_ratio = 0.05 WHERE name = 'Dead Marshes';
UPDATE regions SET population_ratio = 0.10 WHERE name = 'Dagorlad';

COMMENT ON COLUMN regions.population_ratio IS
  'Density of intelligent-being presence, 0 (uninhabited) to 1 (The Shire). '
  'Used by the encounter engine to scale face-to-face encounter probability.';
