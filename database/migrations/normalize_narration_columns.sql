-- ============================================================================
-- ADR-0014 follow-up: finish normalizing places_narration
-- ----------------------------------------------------------------------------
-- Three moves, all idempotent:
--
--   1. region_ids → real column. The authored multi-region list lived only in
--      payload while the scope ladder used the scalar region_id (its first
--      element). Promoted to INTEGER[] — same shape as entities.region_ids.
--      region_id stays: it is the resolver's scope column (first element).
--
--   2. payload drops column-duplicate and dead keys. After #106 the ficha
--      spec still carried scalar copies of real columns (id, kind, action,
--      place_ref, tags, region_id, region_ids), a denormalized region name
--      ('region' — derivable via region_id → regions.name), authoring
--      metadata that never reaches a reader ('region_confidence'), and dead
--      scratch ('_group', '_in_sit'). 'name'/'type' are stripped only when
--      scalar — an {en,es} object is the authored bilingual form and carries
--      more than the TEXT column.
--
--   3. Integrity constraints catch up with the vocabulary: action is now a
--      CHECK'ed closed set coherent with kind, and place_ref becomes a real
--      self-FK (offer → parent record).
-- ============================================================================

-- 1. region_ids column -------------------------------------------------------
ALTER TABLE places_narration ADD COLUMN IF NOT EXISTS region_ids INTEGER[];

UPDATE places_narration p
   SET region_ids = (
     SELECT array_agg(x::int)
       FROM jsonb_array_elements_text(p.payload->'region_ids') x
   )
 WHERE p.region_ids IS NULL
   AND jsonb_typeof(p.payload->'region_ids') = 'array';

-- Scalar-only records still get a coherent list: {region_id}.
UPDATE places_narration
   SET region_ids = ARRAY[region_id]
 WHERE region_ids IS NULL AND region_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pn_region_ids
  ON places_narration USING GIN(region_ids);

COMMENT ON COLUMN places_narration.region_ids IS
  'Authored multi-region list; region_id (scope column) is its first element';

-- 2. payload hygiene ---------------------------------------------------------
-- Column-duplicate scalars, denormalized region name, dead authoring keys.
UPDATE places_narration
   SET payload = payload
     - 'id' - 'kind' - 'action' - 'place_ref' - 'tags'
     - 'region_id' - 'region_ids' - 'region' - 'region_confidence'
     - '_group' - '_in_sit';

-- name/type: drop scalar copies of the column; keep {en,es} authored objects.
UPDATE places_narration
   SET payload = payload - 'name'
 WHERE jsonb_typeof(payload->'name') IS DISTINCT FROM 'object';
UPDATE places_narration
   SET payload = payload - 'type'
 WHERE jsonb_typeof(payload->'type') IS DISTINCT FROM 'object';

-- 3. constraints -------------------------------------------------------------
-- action is a closed set coherent with kind: only interactions carry one.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'places_narration_action_check') THEN
    ALTER TABLE places_narration
      ADD CONSTRAINT places_narration_action_check
      CHECK ((kind = 'interaction' AND action IN ('rest', 'offer'))
          OR (kind <> 'interaction' AND action IS NULL));
  END IF;
END $$;

-- offer → parent record. SET NULL: pruning a parent unlinks its offers
-- instead of cascading into them.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'places_narration_place_ref_fkey') THEN
    ALTER TABLE places_narration
      ADD CONSTRAINT places_narration_place_ref_fkey
      FOREIGN KEY (place_ref) REFERENCES places_narration(id)
      ON DELETE SET NULL;
  END IF;
END $$;
