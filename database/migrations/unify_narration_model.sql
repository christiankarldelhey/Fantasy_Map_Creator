-- ============================================================================
-- Migration: unify_narration_model
-- ----------------------------------------------------------------------------
-- ADR-0015: one canonical record shape for places_narration.
--
--   kinds      place | ambient   (depiction/arrival/lore/interaction fold in)
--   prose      aspect (was description), presence (was payload.base),
--              lore / secret / sections / facts / notes / channel /
--              traveller_use promoted to universal columns
--   gating     variants/conditions keep a `when` text until the authored
--              seeds re-emit tag vocab (see tags.json)
--   interactivity is a capability, not a kind: offer options and rest
--              overnights become `interactive` situations; beats too.
--   drops      action, mechanics, description, place_ref
--   adds       narration_tags registry table (populated by the seed loader)
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. New universal columns
-- ---------------------------------------------------------------------------
ALTER TABLE places_narration
    ADD COLUMN IF NOT EXISTS aspect        JSONB,
    ADD COLUMN IF NOT EXISTS presence      JSONB,
    ADD COLUMN IF NOT EXISTS lore          JSONB,
    ADD COLUMN IF NOT EXISTS secret        JSONB,
    ADD COLUMN IF NOT EXISTS sections      JSONB,
    ADD COLUMN IF NOT EXISTS facts         JSONB,
    ADD COLUMN IF NOT EXISTS notes         JSONB,
    ADD COLUMN IF NOT EXISTS channel       JSONB,
    ADD COLUMN IF NOT EXISTS traveller_use JSONB,
    ADD COLUMN IF NOT EXISTS rotation      JSONB,
    ADD COLUMN IF NOT EXISTS interactive   JSONB;

-- ---------------------------------------------------------------------------
-- 2. Move prose into the universal slots
-- ---------------------------------------------------------------------------
UPDATE places_narration SET
    aspect        = COALESCE(aspect, description),
    presence      = COALESCE(presence, payload->'base'),
    lore          = COALESCE(lore, payload->'lore', payload->'base_lore'),
    secret        = COALESCE(secret, payload->'secret'),
    sections      = COALESCE(sections, NULLIF(payload->'sections', 'null'::jsonb)),
    facts         = COALESCE(facts, payload->'facts'),
    rotation      = COALESCE(rotation, payload->'rotation'),
    notes         = COALESCE(notes, payload->'notes', payload->'note'),
    channel       = COALESCE(channel, payload->'channel'),
    traveller_use = COALESCE(traveller_use, payload->'traveller_use');

-- description/{en,es} on rest records is the night itself: presence too —
-- and NOT aspect: the night is not something seen from outside.
UPDATE places_narration
   SET presence = COALESCE(presence, description),
       aspect   = NULL
 WHERE kind = 'interaction' AND action = 'rest';

-- ---------------------------------------------------------------------------
-- 3. payload.options + situation → interactive situations (offer records)
--    Old option: {id, result, effects, requires}
--    New option: {id, outcomes: {success: {text, effects}}}
-- ---------------------------------------------------------------------------
UPDATE places_narration r SET interactive = sub.situations
  FROM (
    SELECT id, jsonb_agg(jsonb_build_object(
        'id', id || '_offer',
        'tags', '[]'::jsonb,
        'when', COALESCE(payload->'when', payload->'trigger', payload->'situation'),
        'situation', payload->'situation',
        'options', (
          SELECT jsonb_agg(jsonb_build_object(
              'id',        o.opt->>'id',
              'tag',       o.opt->>'tag',
              'skill',     o.opt->>'skill',
              'difficulty',o.opt->'difficulty',
              'requires',  o.opt->'requires',
              'outcomes',  jsonb_build_object('success', jsonb_build_object(
                  'text',    o.opt->'result',
                  'effects', o.opt->'effects'))))
            FROM jsonb_array_elements(payload->'options') o(opt)
        )
      )) AS situations
      FROM places_narration
     WHERE kind = 'interaction' AND action = 'offer'
       AND payload ? 'options'
     GROUP BY id
  ) sub
 WHERE r.id = sub.id;

-- ---------------------------------------------------------------------------
-- 4. payload.beats → single-option interactive situations
--    Old beat: {id, trigger, text|instruction, intensity, once, mind}
--    New situation: {id, tags, when, options:[{id, outcomes:{success:{text}}}]}
--    The DSL trigger text lands in `when`; tag translation is the seeds' job.
-- ---------------------------------------------------------------------------
UPDATE places_narration r SET interactive = sub.situations
  FROM (
    SELECT id, jsonb_agg(jsonb_build_object(
        'id',        b.beat->>'id',
        'tags',      '[]'::jsonb,
        'when',      COALESCE(b.beat->'trigger', b.beat->'trigger_en'),
        'intensity', b.beat->>'intensity',
        'once',      b.beat->'once',
        'options',   jsonb_build_array(jsonb_build_object(
            'id',       (b.beat->>'id') || '_opt',
            'outcomes', jsonb_build_object('success', jsonb_build_object(
                'text', COALESCE(b.beat->'text', b.beat->'instruction'))))))
        ORDER BY b.ord) AS situations
      FROM places_narration,
           jsonb_array_elements(payload->'beats') WITH ORDINALITY b(beat, ord)
     WHERE payload ? 'beats'
     GROUP BY id
  ) sub
 WHERE r.id = sub.id;

-- ---------------------------------------------------------------------------
-- 5. rest/ovn records → overnight situations
--    description → outcome text, mechanics → outcome effects.
-- ---------------------------------------------------------------------------
UPDATE places_narration SET
    interactive = jsonb_build_array(jsonb_build_object(
        'id',      id || '_night',
        'tags',    jsonb_build_array('context:overnight'),
        'options', jsonb_build_array(jsonb_build_object(
            'id',       'rest',
            'tag',      'mind:fatigue',
            'outcomes', jsonb_build_object('success', jsonb_build_object(
                'text',    description,
                'effects', mechanics)))))
    )
 WHERE kind = 'interaction' AND action = 'rest';

-- ---------------------------------------------------------------------------
-- 6. Variants: lift the DSL condition into `when` (tag translation happens
--    in the rewritten seeds; a condition the importer cannot parse is still
--    narratable text).
-- ---------------------------------------------------------------------------
UPDATE places_narration SET variants = (
    SELECT CASE WHEN count(*) = 0 THEN NULL
                ELSE jsonb_agg(
                    ((CASE WHEN v.v ? 'condition'
                           THEN (v.v || jsonb_build_object('when', jsonb_build_object(
                                      'en', v.v->>'condition'))) - 'condition'
                           ELSE v.v END)
                     || (CASE WHEN v.v ? 'key' AND NOT (v.v ? 'id')
                              THEN jsonb_build_object('id', v.v->>'key')
                              ELSE '{}'::jsonb END))
                    - 'key'
                    ORDER BY v.ord)
              END
      FROM jsonb_array_elements(variants) WITH ORDINALITY v(v, ord)
)
 WHERE variants IS NOT NULL AND jsonb_typeof(variants) = 'array';

-- ---------------------------------------------------------------------------
-- 7. name / type → {en,es} JSONB
-- ---------------------------------------------------------------------------
ALTER TABLE places_narration
    ALTER COLUMN name TYPE JSONB
        USING CASE WHEN name IS NULL THEN NULL
                   ELSE jsonb_build_object('en', name) END,
    ALTER COLUMN type TYPE JSONB
        USING CASE WHEN type IS NULL THEN NULL
                   ELSE jsonb_build_object('en', type) END;

-- type already lived as {en,es} inside payload for fichas — prefer it.
UPDATE places_narration
   SET type = payload->'type'
 WHERE payload->'type' IS NOT NULL;
UPDATE places_narration
   SET name = payload->'name'
 WHERE payload->'name' IS NOT NULL;

-- payload.title on overnight records is the record's real name.
UPDATE places_narration
   SET name = jsonb_build_object('en', payload->>'title')
 WHERE name IS NULL AND payload->>'title' IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 8. kind collapse: everything but 'place' is ambient voice
--    The action/kind checks still enforce the legacy vocabulary — drop them
--    before remapping kinds, or every UPDATE below violates them on a live
--    database. kind_check is re-added (tightened) in step 11.
-- ---------------------------------------------------------------------------
ALTER TABLE places_narration
    DROP CONSTRAINT IF EXISTS places_narration_action_check,
    DROP CONSTRAINT IF EXISTS places_narration_kind_check;

UPDATE places_narration SET kind = 'ambient' WHERE kind <> 'place';

-- ---------------------------------------------------------------------------
-- 9. Fold offer situations into their anchor record (place_ref → parent).
--    Leftover interaction records whose anchor is unknown stay ambient and
--    keep their own interactive.
-- ---------------------------------------------------------------------------
UPDATE places_narration parent SET interactive =
    COALESCE(parent.interactive, '[]'::jsonb) || sub.situations
  FROM (
    SELECT place_ref AS parent_id, jsonb_agg(s.situation) AS situations
      FROM places_narration,
           jsonb_array_elements(interactive) s(situation)
     WHERE interactive IS NOT NULL
       AND place_ref IS NOT NULL
       AND place_ref IN (SELECT id FROM places_narration)
     GROUP BY place_ref
  ) sub
 WHERE parent.id = sub.parent_id;

DELETE FROM places_narration
 WHERE place_ref IS NOT NULL
   AND place_ref IN (SELECT id FROM places_narration);

-- ---------------------------------------------------------------------------
-- 10. payload sheds every migrated key — provenance only
-- ---------------------------------------------------------------------------
UPDATE places_narration SET payload = payload
    - 'base' - 'lore' - 'base_lore' - 'secret' - 'sections' - 'beats'
    - 'options' - 'situation' - 'trigger' - 'when' - 'notes' - 'note' - 'channel'
    - 'traveller_use' - 'name' - 'type' - 'facts' - 'variants' - 'rotation';

-- ---------------------------------------------------------------------------
-- 11. Drop retired columns, tighten the kind check
-- ---------------------------------------------------------------------------
ALTER TABLE places_narration
    DROP CONSTRAINT IF EXISTS places_narration_action_check,
    DROP CONSTRAINT IF EXISTS places_narration_kind_check,
    DROP CONSTRAINT IF EXISTS places_narration_place_ref_fkey,
    DROP COLUMN IF EXISTS action,
    DROP COLUMN IF EXISTS mechanics,
    DROP COLUMN IF EXISTS description,
    DROP COLUMN IF EXISTS place_ref;

ALTER TABLE places_narration
    ADD CONSTRAINT places_narration_kind_check
        CHECK (kind IN ('place', 'ambient'));

DROP INDEX IF EXISTS idx_pn_action;
DROP INDEX IF EXISTS idx_pn_place_ref;
DROP INDEX IF EXISTS idx_pn_scope;

-- ---------------------------------------------------------------------------
-- 12. Tag registry table (rows arrive via the seed loader from tags.json)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS narration_tags (
    family      TEXT NOT NULL,
    value       TEXT NOT NULL,
    description JSONB,
    PRIMARY KEY (family, value)
);

COMMIT;
