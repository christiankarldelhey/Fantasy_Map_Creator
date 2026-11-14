-- ============================================================================
-- ADR-0014 (#106): normalize narration record shape
-- ----------------------------------------------------------------------------
-- One table, one coherent shape. Two moves, both idempotent:
--
--   kinds:  region|kingdom      → depiction  (they already bind via depiction_id)
--           overnight|offer     → interaction, disambiguated by `action`
--
--   payload keys → real columns (promoted keys are removed from payload):
--     description jsonb {en,es} — flat canonical prose
--     variants    jsonb         — always an array of {key, ...} entries
--     mechanics   jsonb         — rest_quality/shadow_effect and future numbers
--     refs        jsonb         — authored feature bindings
--   payload keeps only kind-unique spec: ficha base/sections/beats/options,
--   region rotation/facts, provenance (origin, legacy_id, region_name…).
-- ============================================================================

ALTER TABLE places_narration
  ADD COLUMN IF NOT EXISTS description JSONB,
  ADD COLUMN IF NOT EXISTS variants JSONB,
  ADD COLUMN IF NOT EXISTS mechanics JSONB,
  ADD COLUMN IF NOT EXISTS refs JSONB,
  ADD COLUMN IF NOT EXISTS action TEXT;

-- The old CHECK does not know 'interaction' — release it before the merges.
ALTER TABLE places_narration DROP CONSTRAINT IF EXISTS places_narration_kind_check;

-- 1. Promote shared payload keys to columns
UPDATE places_narration SET description = payload->'description'
 WHERE description IS NULL AND payload ? 'description';
UPDATE places_narration SET variants = payload->'variants'
 WHERE variants IS NULL AND payload ? 'variants';
UPDATE places_narration SET mechanics = payload->'mechanics'
 WHERE mechanics IS NULL AND payload ? 'mechanics';
UPDATE places_narration SET refs = payload->'refs'
 WHERE refs IS NULL AND payload ? 'refs';

-- 2. Normalize variants to a single array shape:
--    generated map {key: [phrases]} → [{key, phrases}]; ficha arrays untouched.
UPDATE places_narration p SET variants = (
  SELECT jsonb_agg(jsonb_build_object('key', k.key, 'phrases', k.value))
    FROM jsonb_each(p.variants) k)
 WHERE jsonb_typeof(p.variants) = 'object';

-- 3. Kind consolidation
UPDATE places_narration SET kind = 'depiction'
 WHERE kind IN ('region', 'kingdom');
UPDATE places_narration SET
    action = CASE kind WHEN 'overnight' THEN 'rest' WHEN 'offer' THEN 'offer' END,
    kind = 'interaction'
 WHERE kind IN ('overnight', 'offer');

-- 4. Drop promoted keys from payload
UPDATE places_narration
   SET payload = payload - 'description' - 'variants' - 'mechanics' - 'refs'
 WHERE payload ?| '{description,variants,mechanics,refs}'::text[];

-- 5. Tighten the kind vocabulary + index the interaction action
ALTER TABLE places_narration ADD CONSTRAINT places_narration_kind_check
  CHECK (kind IN ('place', 'ambient', 'arrival', 'lore', 'depiction', 'interaction'));

CREATE INDEX IF NOT EXISTS idx_pn_action
  ON places_narration (action) WHERE action IS NOT NULL;
