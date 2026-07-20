-- Migration: Create encounter_forms table for encounter interaction_form resolution
-- Date: 2026-06-26
-- Description: Drives per-encounter variety in the narration pipeline.
--              Keyed by entity_type (matches entities.type), not by entity id.

CREATE TABLE IF NOT EXISTS encounter_forms (
    id          UUID PRIMARY KEY,
    entity_type TEXT    NOT NULL,
    interaction_form        TEXT    NOT NULL,
    intensity   INT     NOT NULL CHECK (intensity BETWEEN 0 AND 4),
    weight      INT     NOT NULL CHECK (weight > 0),
    min_danger  INT     NOT NULL DEFAULT 0,
    max_danger  INT     NOT NULL DEFAULT 5,
    triggers_roll BOOLEAN NOT NULL DEFAULT false,
    prose_hint  TEXT    NOT NULL,
    UNIQUE (entity_type, interaction_form)
);

CREATE INDEX IF NOT EXISTS idx_encounter_forms_entity_type ON encounter_forms (entity_type);

COMMENT ON TABLE encounter_forms IS
  'Encounter beat table. entity_type is a logical FK to entities.type. '
  'The engine picks a weighted-random interaction_form per encounter before building the LLM prompt.';

COMMENT ON COLUMN encounter_forms.entity_type  IS 'Matches entities.type (e.g. carnivores, undead)';
COMMENT ON COLUMN encounter_forms.interaction_form         IS 'Encounter beat identifier (e.g. glimpsed_far, stalks, attacks)';
COMMENT ON COLUMN encounter_forms.intensity    IS '0 (inert/distant) .. 4 (combat)';
COMMENT ON COLUMN encounter_forms.weight       IS 'Relative likelihood within this entity_type';
COMMENT ON COLUMN encounter_forms.min_danger   IS 'Form only applies if entity.danger >= this value';
COMMENT ON COLUMN encounter_forms.max_danger   IS 'Form only applies if entity.danger <= this value';
COMMENT ON COLUMN encounter_forms.triggers_roll IS 'TRUE = fire a resistance roll when danger >= 3';
COMMENT ON COLUMN encounter_forms.prose_hint   IS 'English instruction injected into the LLM prompt';
