-- Migration: Inventory system (items, character_inventory, starting_kits) +
--            character_state coins/days_without_food.
-- Date: 2026-07-29
-- Description:
--   - items: catalog of garments, provisions, ammunition, weapons and tools.
--     Effects are plain JSONB so mechanics can be tuned without a migration.
--   - character_inventory: what a clone currently carries.
--   - starting_kits: the equipage a template character's clones start with.
--   - character_state.coins / days_without_food: journey resources that feed
--     the lodging (paid rest) and hunger mechanics.
-- Idempotent: safe to run multiple times.

-- ---------------------------------------------------------------------------
-- 1. items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS items (
    id              SERIAL PRIMARY KEY,
    slug            TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    category        TEXT NOT NULL CHECK (category IN ('garment', 'provision', 'ammunition', 'weapon', 'tool')),
    prose_singular  TEXT NOT NULL,   -- "a coarse wool cloak"
    prose_plural    TEXT,            -- "a handful of ash arrows"; falls back to prose_singular
    effects         JSONB NOT NULL DEFAULT '{}'::jsonb,
    base_price      INT,             -- nullable; used by the future shops feature
    rarity          TEXT NOT NULL DEFAULT 'common'
);

-- ---------------------------------------------------------------------------
-- 2. character_inventory
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS character_inventory (
    id            SERIAL PRIMARY KEY,
    character_id  INT NOT NULL REFERENCES character_state(id) ON DELETE CASCADE,
    item_id       INT NOT NULL REFERENCES items(id),
    qty           INT NOT NULL DEFAULT 1,
    condition     SMALLINT NOT NULL DEFAULT 3,  -- 3 good, 0 ruined
    equipped      BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (character_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_character_inventory_character ON character_inventory(character_id);

-- ---------------------------------------------------------------------------
-- 3. starting_kits (per template character)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS starting_kits (
    id           SERIAL PRIMARY KEY,
    template_id  INT NOT NULL REFERENCES character_state(id),
    item_id      INT NOT NULL REFERENCES items(id),
    qty          INT NOT NULL DEFAULT 1,
    UNIQUE (template_id, item_id)
);

-- ---------------------------------------------------------------------------
-- 4. character_state: coins + hunger streak
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'character_state' AND column_name = 'coins') THEN
        ALTER TABLE character_state ADD COLUMN coins INT NOT NULL DEFAULT 100;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'character_state' AND column_name = 'days_without_food') THEN
        ALTER TABLE character_state ADD COLUMN days_without_food INT NOT NULL DEFAULT 0;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Seed catalog (idempotent upsert by slug)
-- ---------------------------------------------------------------------------
INSERT INTO items (slug, name, category, prose_singular, prose_plural, effects, base_price, rarity) VALUES
  ('wool_cloak',          'Wool Cloak',            'garment',   'a coarse wool cloak',               NULL,                                  '{"cold_shift": 3}'::jsonb,               8,  'common'),
  ('lined_travel_cloak',  'Lined Travel Cloak',    'garment',   'a lined travel cloak',               NULL,                                  '{"cold_shift": 6}'::jsonb,               20, 'common'),
  ('lorien_elven_cloak',  'Lórien Elven Cloak',    'garment',   'an elven cloak of Lothlórien',       NULL,                                  '{"cold_shift": 8, "shadow_relief": 2}'::jsonb, null, 'rare'),
  ('sturdy_boots',        'Sturdy Boots',          'garment',   'a pair of sturdy boots',             NULL,                                  '{"cold_shift": 2}'::jsonb,               6,  'common'),
  ('trail_rations',       'Trail Rations',         'provision', 'a ration of road-bread and dried fruit', 'rations of road-bread and dried fruit', '{"rations": 1}'::jsonb,             1,  'common'),
  ('cheese_wheel',        'Cheese Wheel',          'provision', 'a wheel of hard cheese',             'wheels of hard cheese',              '{"rations": 1}'::jsonb,                  2,  'common'),
  ('dried_meat',          'Dried Meat',            'provision', 'a strip of dried meat',              'strips of dried meat',                '{"rations": 1}'::jsonb,                  2,  'common'),
  ('lembas',              'Lembas Bread',          'provision', 'a wafer of lembas bread',            'wafers of lembas bread',              '{"rations": 1, "shadow_relief": 3}'::jsonb, null, 'rare'),
  ('common_arrows',       'Common Arrows',         'ammunition','a common arrow',                    'a quiver of common arrows',           '{"ammunition": "arrow"}'::jsonb,         1,  'common'),
  ('ash_arrows',          'Ash Arrows',            'ammunition','an arrow of ash-wood',               'a bundle of ash-wood arrows',          '{"ammunition": "arrow"}'::jsonb,         2,  'common'),
  ('hunting_knife',       'Hunting Knife',         'weapon',    'a hunting knife',                    NULL,                                  '{"melee_tier": 1}'::jsonb,               5,  'common'),
  ('short_sword',         'Short Sword',           'weapon',    'a short sword',                      NULL,                                  '{"melee_tier": 2}'::jsonb,               25, 'common'),
  ('long_sword',          'Long Sword',            'weapon',    'a long sword',                       NULL,                                  '{"melee_tier": 3}'::jsonb,               60, 'uncommon'),
  ('short_bow',           'Short Bow',             'weapon',    'a short bow',                        NULL,                                  '{"ranged_tier": 1}'::jsonb,              20, 'common'),
  ('long_bow',            'Long Bow',              'weapon',    'a long bow',                         NULL,                                  '{"ranged_tier": 2}'::jsonb,              45, 'uncommon'),
  ('travel_blanket',      'Travel Blanket',        'tool',      'a travel blanket',                   NULL,                                  '{"rest_bonus": 1}'::jsonb,               4,  'common'),
  ('flint_and_tinder',    'Flint and Tinder',      'tool',      'flint and tinder',                   NULL,                                  '{}'::jsonb,                              1,  'common')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  prose_singular = EXCLUDED.prose_singular,
  prose_plural = EXCLUDED.prose_plural,
  effects = EXCLUDED.effects,
  base_price = EXCLUDED.base_price,
  rarity = EXCLUDED.rarity;

-- ---------------------------------------------------------------------------
-- 6. Starting kit — same base equipage for every template character.
--    Applies to every template row (owner_user_id IS NULL); new templates
--    added later will need their own INSERT here.
-- ---------------------------------------------------------------------------
INSERT INTO starting_kits (template_id, item_id, qty)
SELECT t.id, i.id, k.qty
FROM character_state t
CROSS JOIN (VALUES
  ('wool_cloak', 1),
  ('trail_rations', 7),
  ('common_arrows', 12),
  ('short_bow', 1),
  ('hunting_knife', 1),
  ('travel_blanket', 1),
  ('flint_and_tinder', 1)
) AS k(slug, qty)
JOIN items i ON i.slug = k.slug
WHERE t.owner_user_id IS NULL
ON CONFLICT (template_id, item_id) DO UPDATE SET qty = EXCLUDED.qty;

COMMENT ON TABLE items IS 'Catalog of carryable items (garments, provisions, ammunition, weapons, tools).';
COMMENT ON COLUMN items.effects IS 'Mechanical effects: cold_shift, rest_bonus, rations, shadow_relief, ammunition, melee_tier, ranged_tier.';
COMMENT ON TABLE character_inventory IS 'What a character clone currently carries.';
COMMENT ON COLUMN character_inventory.equipped IS 'Worn/wielded (garments, weapons). Provisions, ammunition and tools apply regardless.';
COMMENT ON TABLE starting_kits IS 'Default equipage granted to a clone of a template character.';
COMMENT ON COLUMN character_state.coins IS 'Spendable currency; pays for lodging (paid rest) and, later, goods.';
COMMENT ON COLUMN character_state.days_without_food IS 'Consecutive days without a ration consumed; drives the hunger penalty.';

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
SELECT COUNT(*) AS items_seeded FROM items;
SELECT COUNT(*) AS starting_kit_rows FROM starting_kits;
