-- Migration: Create the interactions table
-- Date: 2026-11-17
-- Description: An Interaction is a concrete thing the traveller can do inside
--   a resolved Situation. Situations live in places_narration /
--   entities_narration (authored prose + gates); Interactions own everything
--   the traveller does and everything it causes — including the single,
--   inevitable ones (a Situation with one Interaction still has its outcome
--   here, not in the narration record).
--
--   Every Interaction points to exactly one parent Situation via one of two
--   explicit FKs — no polymorphic source pointer. The parent narration row
--   carries the source/scope resolution (concrete anchor or generic scope),
--   so the interaction row never duplicates source ids.
--
--   Columns:
--     act        — closed vocabulary owned by the Mind Engine (approach,
--                  avoid, talk, trade, accept, help, defy, rest). The host
--                  does not invent acts; it ships them to the Mind as-is.
--     label      — {en, es} — shown when a higher self/player picks instead
--                  of the automatic chooser.
--     need_tags  — tags the Mind weighs for preference (need:*, risk:*, …)
--     skill      — {name, min?, difficulty?} NULL = automatic success:
--                  min gates feasibility (host), difficulty gates the roll
--                  (host). success probability is sent to the Mind as data.
--     outcomes   — {success: {text?, effects:[{type,…}]}, failure?: {…}}.
--                  Effects are a typed list of host Condition changes
--                  (energy, shadow, food/meal, water, heal, item, coins,
--                  lodging/rest) — never Mood, never Mind-owned state.

CREATE TABLE IF NOT EXISTS interactions (
    id                      TEXT PRIMARY KEY,
    places_narration_id     TEXT REFERENCES places_narration(id)   ON DELETE CASCADE,
    entities_narration_id   TEXT REFERENCES entities_narration(id) ON DELETE CASCADE,

    act                     TEXT NOT NULL,
    label                   JSONB,                  -- {en, es}
    need_tags               TEXT[] NOT NULL DEFAULT '{}',
    skill                   JSONB,                  -- {name, min?, difficulty?}
    outcomes                JSONB NOT NULL,         -- {success:{text?,effects[]}, failure?}
    payload                 JSONB NOT NULL DEFAULT '{}',
    created_at              TIMESTAMP DEFAULT NOW()
);

-- Exactly one parent Situation — never zero, never two.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'interactions_one_parent'
    ) THEN
        ALTER TABLE interactions
            ADD CONSTRAINT interactions_one_parent
            CHECK (num_nonnulls(places_narration_id, entities_narration_id) = 1);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_interactions_place
    ON interactions(places_narration_id)   WHERE places_narration_id   IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interactions_entity
    ON interactions(entities_narration_id) WHERE entities_narration_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interactions_act ON interactions(act);

COMMENT ON TABLE interactions IS
    'What the traveller can do inside a Situation. One row per option — a lone row means an inevitable action (destino manifiesto). Outcomes mutate host Condition only.';
COMMENT ON COLUMN interactions.act IS
    'Mind-owned closed vocabulary (approach/avoid/talk/trade/accept/help/defy/rest). Shared by preference scoring and Event representation.';
COMMENT ON COLUMN interactions.need_tags IS
    'Tags the Mind weighs when preferring this option (need:*/risk:*/mind:* for now — taxonomy cleanup in issue #87).';
COMMENT ON COLUMN interactions.skill IS
    '{name, min?, difficulty?}: min gates feasibility, difficulty gates the post-choice roll. NULL means automatic success.';
COMMENT ON COLUMN interactions.outcomes IS
    '{success, failure?} each {text?, effects: typed list}. Effects touch host Condition only — body, items, coins, lodging, shadow. Never Mood.';
