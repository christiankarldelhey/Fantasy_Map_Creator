-- ============================================================================
-- Migration: create_entities_narration_table
-- ----------------------------------------------------------------------------
-- The voice layer for beings — sibling of places_narration (same record
-- anatomy: scope columns + universal prose slots + variants/interactive).
-- Absorbs the narrative side of the encounter stack:
--
--   kind='entity'   the being's ficha (aspect/presence/lore) — scope:
--                   entity + region ("orcs of the Misty Mountains" is a
--                   different subject than "orcs of Mordor")
--   kind='form'     the contact-shape draw (weight/intensity/danger band/
--                   triggers_roll + `aspect` as the generic prose hint)
--                   — replaces encounter_forms
--   kind='contact'  the substance of a contact (variants/disposition/
--                   interactive) for a scope + `form` key
--                   — replaces npc_interactions
--
-- Facts stay out: presence lives on entities (probability_by_region …)
-- and mover_legs (the scheduled side). This table carries voice only.
-- See docs/design/entities-narration.md.
-- ============================================================================

CREATE TABLE IF NOT EXISTS entities_narration (
    id              TEXT PRIMARY KEY,              -- 'ent:*' | 'form:*' | 'cnt:*'

    kind            TEXT NOT NULL
                    CHECK (kind IN ('entity', 'form', 'contact')),

    -- Scope ladder — NULL = wider (resolver picks most specific match)
    entity_id       UUID REFERENCES entities(id),
    entity_ids      UUID[],                        -- a band of named beings
    entity_type     TEXT,                          -- 'orcs' | 'eagles' | 'npc'…
    family          TEXT,
    mover_leg_id    UUID REFERENCES mover_legs(id),-- narrowest: this leg's story
    region_id       INTEGER REFERENCES regions(id),-- scope region (first of region_ids)
    region_ids      INTEGER[],
    location_id     INTEGER REFERENCES locations(id),
    cultural_family TEXT,
    form            TEXT,                          -- contact-shape key: 'glimpsed_far'…
    priority        SMALLINT NOT NULL DEFAULT 0,   -- tie-breaker between records
    tags            TEXT[] NOT NULL DEFAULT '{}',  -- gating/tags vocabulary

    -- Universal prose slots — any record may carry any of them
    aspect          JSONB,   -- {en, es}: the face seen from outside / afar
    presence        JSONB,   -- {en, es}: what being with/near it is like
    lore            JSONB,   -- {en, es}: what is known of it (belief-gated)
    secret          JSONB,   -- {when: {en,es}, text: {en,es}}
    sections        JSONB,   -- [{key, en, es}]
    facts           JSONB,   -- structured reference data
    notes           JSONB,   -- {en, es} author/narrator notes
    channel         JSONB,   -- {en, es}: dominant sense/theme of the voice
    traveller_use   JSONB,   -- {en, es}: what the traveller can do with it

    -- Conditional prose: [{id?, text: {en,es}, tags: [], not_tags: [], when:}]
    -- Known/unknown faces live here: 'a bearded man' (no gate) vs
    -- 'Gandalf the Grey' (tags: ['belief:gandalf']). mover_beats too.
    variants        JSONB,

    -- Ordered prose list consumed one entry per day
    rotation        JSONB,

    -- Interactivity: situations → options → outcomes (same shape as places)
    interactive     JSONB,

    -- How the being is disposed in this contact — prose {en, es}.
    -- (was npc_attitude; named 'disposition', shared with places later)
    disposition     JSONB,

    -- Contact-shape draw mechanics — kind='form' only
    weight          INTEGER,
    intensity       INTEGER,
    min_danger      INTEGER,
    max_danger      INTEGER,
    triggers_roll   BOOLEAN,

    payload         JSONB NOT NULL DEFAULT '{}'::jsonb  -- provenance only
);

-- Coherence: 'form' rows must name the shape they define. 'contact' may
-- leave form NULL as the wildcard fallback that serves any shape.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'entities_narration_form_key_check') THEN
    ALTER TABLE entities_narration
      ADD CONSTRAINT entities_narration_form_key_check
      CHECK (kind <> 'form' OR form IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_en_kind        ON entities_narration(kind);
CREATE INDEX IF NOT EXISTS idx_en_entity      ON entities_narration(entity_id)      WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_en_entity_ids  ON entities_narration USING GIN(entity_ids);
CREATE INDEX IF NOT EXISTS idx_en_entity_type ON entities_narration(entity_type)    WHERE entity_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_en_family      ON entities_narration(family)         WHERE family IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_en_mover_leg   ON entities_narration(mover_leg_id)   WHERE mover_leg_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_en_region      ON entities_narration(region_id)      WHERE region_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_en_region_ids  ON entities_narration USING GIN(region_ids);
CREATE INDEX IF NOT EXISTS idx_en_location    ON entities_narration(location_id)    WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_en_form        ON entities_narration(form)           WHERE form IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_en_scope       ON entities_narration(kind, entity_type, region_id, form);
CREATE INDEX IF NOT EXISTS idx_en_tags        ON entities_narration USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_en_payload     ON entities_narration USING GIN(payload);

COMMENT ON TABLE  entities_narration IS 'The voice of beings — sibling of places_narration. entity ficha | contact-shape draw | contact substance';
COMMENT ON COLUMN entities_narration.kind IS 'entity (ficha) | form (contact-shape draw) | contact (substance per scope+form)';
COMMENT ON COLUMN entities_narration.mover_leg_id IS 'Narrowest scope: this record exists while that leg is live; mover_beats arrive as variants';
COMMENT ON COLUMN entities_narration.form IS 'Contact-shape key (glimpsed_far, stalks, parley…); on contact rows NULL = wildcard';
COMMENT ON COLUMN entities_narration.disposition IS 'How the being is disposed in the contact {en, es} (was npc_attitude)';
COMMENT ON COLUMN entities_narration.aspect IS 'On form rows: the generic prose hint of that contact shape';
COMMENT ON COLUMN entities_narration.payload IS 'Provenance only (origin, legacy_id)';
