-- Migration: Create interactions table for encounter form resolution
-- Date: 2026-06-26
-- Description: Drives per-encounter variety in the narration pipeline.
--              Keyed by entity_type (matches entities.type), not by entity id.

CREATE TABLE IF NOT EXISTS interactions (
    id          SERIAL PRIMARY KEY,
    entity_type TEXT    NOT NULL,
    form        TEXT    NOT NULL,
    intensity   INT     NOT NULL CHECK (intensity BETWEEN 0 AND 4),
    weight      INT     NOT NULL CHECK (weight > 0),
    min_danger  INT     NOT NULL DEFAULT 0,
    max_danger  INT     NOT NULL DEFAULT 5,
    triggers_roll BOOLEAN NOT NULL DEFAULT false,
    prose_hint  TEXT    NOT NULL,
    UNIQUE (entity_type, form)
);

CREATE INDEX IF NOT EXISTS idx_interactions_entity_type ON interactions (entity_type);

COMMENT ON TABLE interactions IS
  'Encounter beat table. entity_type is a logical FK to entities.type. '
  'The engine picks a weighted-random form per encounter before building the LLM prompt.';

COMMENT ON COLUMN interactions.entity_type  IS 'Matches entities.type (e.g. carnivores, undead)';
COMMENT ON COLUMN interactions.form         IS 'Encounter beat identifier (e.g. glimpsed_far, stalks, attacks)';
COMMENT ON COLUMN interactions.intensity    IS '0 (inert/distant) .. 4 (combat)';
COMMENT ON COLUMN interactions.weight       IS 'Relative likelihood within this entity_type';
COMMENT ON COLUMN interactions.min_danger   IS 'Form only applies if entity.danger >= this value';
COMMENT ON COLUMN interactions.max_danger   IS 'Form only applies if entity.danger <= this value';
COMMENT ON COLUMN interactions.triggers_roll IS 'TRUE = fire a resistance roll when danger >= 3';
COMMENT ON COLUMN interactions.prose_hint   IS 'English instruction injected into the LLM prompt';
