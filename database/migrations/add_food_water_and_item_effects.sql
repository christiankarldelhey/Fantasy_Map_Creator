-- Migration: Food choice, water (thirst) and declarative item effects.
-- Date: 2026-08-08
-- Description:
--   - items.weight_kg        : unit weight of the object (encumbrance groundwork).
--   - items.effect_when_used : what happens when the item is used/eaten, e.g.
--                              {"category":"energy","value":8}.
--   - items category gains 'container' (the waterskin).
--   - character_inventory.fill : litres currently held (only meaningful on
--                                containers; 0 for everything else).
--   - character_state.days_without_water : thirst streak, mirror of
--                                          days_without_food.
--   - entities.is_consumable / entities.meat_rations : which creatures can be
--     eaten and how many rations they yield (hunting is not implemented yet).
--   - Seeds the waterskin, adds it to every starting kit, back-fills existing
--     characters with a full flask, and fills in effect_when_used for the
--     provisions already in the catalog.
-- Idempotent: safe to run multiple times.

-- ---------------------------------------------------------------------------
-- 1. items: weight + effect_when_used + 'container' category
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    con_name TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'items' AND column_name = 'weight_kg') THEN
        ALTER TABLE items ADD COLUMN weight_kg NUMERIC(5,2) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'items' AND column_name = 'effect_when_used') THEN
        ALTER TABLE items ADD COLUMN effect_when_used JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;

    -- Widen the category CHECK to admit 'container'. The constraint was created
    -- inline, so its name is generated; find it by its definition.
    SELECT conname INTO con_name
    FROM pg_constraint
    WHERE conrelid = 'items'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%garment%'
      AND pg_get_constraintdef(oid) NOT ILIKE '%container%'
    LIMIT 1;

    IF con_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE items DROP CONSTRAINT %I', con_name);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'items'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%container%'
    ) THEN
        ALTER TABLE items ADD CONSTRAINT items_category_check
          CHECK (category IN ('garment', 'provision', 'ammunition', 'weapon', 'tool', 'container'));
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. character_inventory.fill (litres held by a container)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'character_inventory' AND column_name = 'fill') THEN
        ALTER TABLE character_inventory ADD COLUMN fill NUMERIC(4,2) NOT NULL DEFAULT 0;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. character_state.days_without_water (thirst streak)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'character_state' AND column_name = 'days_without_water') THEN
        ALTER TABLE character_state ADD COLUMN days_without_water INT NOT NULL DEFAULT 0;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. entities: is_consumable + meat_rations
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'entities' AND column_name = 'is_consumable') THEN
        ALTER TABLE entities ADD COLUMN is_consumable BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'entities' AND column_name = 'meat_rations') THEN
        ALTER TABLE entities ADD COLUMN meat_rations SMALLINT NOT NULL DEFAULT 0;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Seed the waterskin and give it to every template's starting kit
-- ---------------------------------------------------------------------------
INSERT INTO items (slug, name, category, prose_singular, prose_plural, effects, effect_when_used, weight_kg, base_price, rarity) VALUES
  ('waterskin', 'Waterskin', 'container', 'a large leather waterskin', 'large leather waterskins',
   '{"water_capacity": 3}'::jsonb, '{}'::jsonb, 0.4, 3, 'common')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  prose_singular = EXCLUDED.prose_singular,
  prose_plural = EXCLUDED.prose_plural,
  effects = EXCLUDED.effects,
  weight_kg = EXCLUDED.weight_kg,
  base_price = EXCLUDED.base_price,
  rarity = EXCLUDED.rarity;

INSERT INTO starting_kits (template_id, item_id, qty)
SELECT t.id, i.id, 1
FROM character_state t
CROSS JOIN items i
WHERE t.owner_user_id IS NULL AND i.slug = 'waterskin'
ON CONFLICT (template_id, item_id) DO UPDATE SET qty = EXCLUDED.qty;

-- Existing clones: grant a full waterskin so nobody starts dehydrated.
-- fill is read from the item's own capacity so this keeps working when the
-- waterskin is re-tuned.
INSERT INTO character_inventory (character_id, item_id, qty, condition, equipped, fill)
SELECT c.id, i.id, 1, 3, false, (i.effects->>'water_capacity')::numeric
FROM character_state c
CROSS JOIN items i
WHERE i.slug = 'waterskin'
ON CONFLICT (character_id, item_id) DO NOTHING;

-- Empty flasks start full. Only fill = 0 is topped up: anything in between is
-- a flask mid-journey, and a deploy must not hand out free water.
UPDATE character_inventory ci
SET fill = (i.effects->>'water_capacity')::numeric
FROM items i
WHERE i.id = ci.item_id AND i.slug = 'waterskin' AND ci.fill = 0;

-- Clamp flasks holding more than the current capacity (re-tuning downwards).
UPDATE character_inventory ci
SET fill = (i.effects->>'water_capacity')::numeric
FROM items i
WHERE i.id = ci.item_id
  AND i.slug = 'waterskin'
  AND ci.fill > (i.effects->>'water_capacity')::numeric;

-- ---------------------------------------------------------------------------
-- 6. Declarative use-effects for the provisions already in the catalog
-- ---------------------------------------------------------------------------
UPDATE items SET effect_when_used = '{"category": "energy", "value": 8}'::jsonb
WHERE slug IN ('trail_rations', 'cheese_wheel', 'dried_meat');

UPDATE items SET effect_when_used = '{"category": "energy", "value": 12, "shadow": -3}'::jsonb
WHERE slug = 'lembas';

-- Unit weights (kg) for the existing catalog.
UPDATE items SET weight_kg = v.weight FROM (VALUES
  ('wool_cloak', 1.50),
  ('lined_travel_cloak', 2.00),
  ('lorien_elven_cloak', 0.80),
  ('sturdy_boots', 1.20),
  ('trail_rations', 0.50),
  ('cheese_wheel', 0.80),
  ('dried_meat', 0.40),
  ('lembas', 0.10),
  ('common_arrows', 0.05),
  ('ash_arrows', 0.05),
  ('hunting_knife', 0.30),
  ('short_sword', 1.20),
  ('long_sword', 1.80),
  ('short_bow', 0.70),
  ('long_bow', 1.10),
  ('travel_blanket', 1.50),
  ('flint_and_tinder', 0.10)
) AS v(slug, weight)
WHERE items.slug = v.slug AND items.weight_kg = 0;

-- ---------------------------------------------------------------------------
-- 7. Edible creatures. Rations are a rough yield by body size; slugs were
--    taken from the entities table itself, not from any CSV.
-- ---------------------------------------------------------------------------
UPDATE entities SET is_consumable = true, meat_rations = v.rations FROM (VALUES
  -- big game
  ('great_elk', 5), ('aurych', 5), ('ninfiara_wild_aurochs', 5), ('kine_of_araw', 5),
  ('elk', 4), ('mordor_cattle', 4), ('sheep', 4), ('boars', 4), ('fen_boars', 4),
  -- deer, goats and the like
  ('deer', 3), ('dappled_deer', 3), ('goral', 3), ('goats', 3), ('wild_goats', 3),
  ('mountain_goat', 3), ('pronghorns', 3), ('grazing_animals', 3), ('sturgeon', 3),
  -- small game and fish
  ('wels', 2), ('fish_large_fish', 2), ('great_green_pheasants', 2), ('pied_swans', 2),
  ('black_swans', 2), ('wild_animals', 2),
  ('hares', 1), ('snowhare', 1), ('rabbit', 1), ('squirrels', 1), ('small_animals', 1),
  ('pike', 1), ('fish_eels', 1), ('lamprey', 1), ('vessino_clams', 1),
  ('mammals_otters_minks_rodents', 1),
  ('birds', 1), ('woodland_birds_of_rhosgobel', 1), ('grass_grouses', 1),
  ('waterfowl', 1), ('crakes_and_coots', 1), ('thrushes', 1), ('bitterns', 1),
  ('land_tortoises', 1), ('reptiles_turtles', 1), ('blue_terrapins', 1)
) AS v(slug, rations)
WHERE entities.slug = v.slug;

COMMENT ON COLUMN items.weight_kg IS 'Unit weight in kg; groundwork for encumbrance (no penalty applied yet).';
COMMENT ON COLUMN items.effect_when_used IS 'What using/eating the item does: {"category":"energy","value":8[,"shadow":-3]}.';
COMMENT ON COLUMN character_inventory.fill IS 'Litres currently held; only meaningful for containers (waterskin).';
COMMENT ON COLUMN character_state.days_without_water IS 'Consecutive days without drinking enough; drives the thirst penalty.';
COMMENT ON COLUMN entities.is_consumable IS 'Creature can be eaten (deer, fish, hares). Hunting is not implemented yet.';
COMMENT ON COLUMN entities.meat_rations IS 'Rations yielded when butchered; 0 when not consumable.';

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
SELECT COUNT(*) AS consumable_entities FROM entities WHERE is_consumable;
SELECT COUNT(*) AS characters_with_flask FROM character_inventory ci
  JOIN items i ON i.id = ci.item_id WHERE i.slug = 'waterskin';
