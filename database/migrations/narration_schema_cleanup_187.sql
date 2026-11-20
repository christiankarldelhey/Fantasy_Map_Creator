-- ---------------------------------------------------------------------------
-- #187 — narration schema cleanup
--
-- The unified narration tables accreted one column per kind; most are null
-- on most rows. This migration (idempotent — db:seed re-runs it every load):
--   * folds authoring-only fields into payload.authoring
--   * drops dead columns (sighted_far, region_id, family, region_ids, ...)
--   * re-kinds dep:* depiction anchors out of kind='ambient'
--   * moves the 147 form templates into their own encounter_forms table
-- ---------------------------------------------------------------------------

-- == places_narration: fold authoring fields, then drop ======================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'places_narration' AND column_name = 'notes') THEN
    UPDATE places_narration
       SET payload = payload || jsonb_build_object('authoring',
         jsonb_strip_nulls(jsonb_build_object(
           'notes', notes,
           'channel', channel,
           'traveller_use', traveller_use,
           'secret', secret,
           'sections', sections)))
     WHERE notes IS NOT NULL OR channel IS NOT NULL OR traveller_use IS NOT NULL
        OR secret IS NOT NULL OR sections IS NOT NULL;
  END IF;
END $$;

ALTER TABLE places_narration
  DROP COLUMN IF EXISTS sighted_far,
  DROP COLUMN IF EXISTS region_id,
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS channel,
  DROP COLUMN IF EXISTS traveller_use,
  DROP COLUMN IF EXISTS secret,
  DROP COLUMN IF EXISTS sections;

-- dep:* rows are depiction anchors (FK targets for the geometry tables), not
-- ambient voices — the kind now says so.
ALTER TABLE places_narration DROP CONSTRAINT IF EXISTS places_narration_kind_check;
UPDATE places_narration SET kind = 'depiction' WHERE id LIKE 'dep:%' AND kind <> 'depiction';
ALTER TABLE places_narration
  ADD CONSTRAINT places_narration_kind_check
  CHECK (kind = ANY (ARRAY['place'::text, 'ambient'::text, 'depiction'::text]));

-- == entities_narration: fold, move forms, drop ==============================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'entities_narration' AND column_name = 'notes') THEN
    UPDATE entities_narration
       SET payload = payload || jsonb_build_object('authoring',
         jsonb_strip_nulls(jsonb_build_object(
           'notes', notes,
           'secret', secret,
           'sections', sections,
           'rotation', rotation,
           'traveller_use', traveller_use)))
     WHERE notes IS NOT NULL OR secret IS NOT NULL OR sections IS NOT NULL
        OR rotation IS NOT NULL OR traveller_use IS NOT NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS encounter_forms (
  id             text PRIMARY KEY,
  entity_type    text NOT NULL,
  form           text NOT NULL,
  aspect         jsonb,
  intensity      integer,
  weight         integer,
  min_danger     integer,
  max_danger     integer,
  triggers_roll  boolean,
  tags           text[] NOT NULL DEFAULT '{}',
  payload        jsonb  NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_ef_entity_type ON encounter_forms (entity_type);

-- Move the forms across. Guarded on the source columns: once dropped, the
-- move already happened and the loader repopulates encounter_forms itself.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'entities_narration' AND column_name = 'weight') THEN
    INSERT INTO encounter_forms
      (id, entity_type, form, aspect, intensity, weight,
       min_danger, max_danger, triggers_roll, tags, payload)
    SELECT id, entity_type, form, aspect, intensity, weight,
           min_danger, max_danger, triggers_roll, tags, payload
      FROM entities_narration WHERE kind = 'form'
    ON CONFLICT (id) DO UPDATE SET
      entity_type = EXCLUDED.entity_type, form = EXCLUDED.form,
      aspect = EXCLUDED.aspect, intensity = EXCLUDED.intensity,
      weight = EXCLUDED.weight, min_danger = EXCLUDED.min_danger,
      max_danger = EXCLUDED.max_danger, triggers_roll = EXCLUDED.triggers_roll,
      tags = EXCLUDED.tags, payload = EXCLUDED.payload;

    DELETE FROM entities_narration WHERE kind = 'form';
  END IF;
END $$;

ALTER TABLE entities_narration
  DROP COLUMN IF EXISTS family,
  DROP COLUMN IF EXISTS region_ids,
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS secret,
  DROP COLUMN IF EXISTS sections,
  DROP COLUMN IF EXISTS rotation,
  DROP COLUMN IF EXISTS traveller_use,
  DROP COLUMN IF EXISTS weight,
  DROP COLUMN IF EXISTS intensity,
  DROP COLUMN IF EXISTS min_danger,
  DROP COLUMN IF EXISTS max_danger,
  DROP COLUMN IF EXISTS triggers_roll;

ALTER TABLE entities_narration DROP CONSTRAINT IF EXISTS entities_narration_form_key_check;
ALTER TABLE entities_narration DROP CONSTRAINT IF EXISTS entities_narration_kind_check;
ALTER TABLE entities_narration
  ADD CONSTRAINT entities_narration_kind_check
  CHECK (kind = ANY (ARRAY['entity'::text, 'contact'::text]));

DROP INDEX IF EXISTS idx_en_family;
DROP INDEX IF EXISTS idx_en_region_ids;

-- Marker for the older migrations in this directory: they re-run on every
-- load and must not resurrect the columns/constraints this file removed.
CREATE TABLE IF NOT EXISTS schema_flags (key TEXT PRIMARY KEY);
INSERT INTO schema_flags (key) VALUES ('narration_cleanup_187') ON CONFLICT DO NOTHING;
