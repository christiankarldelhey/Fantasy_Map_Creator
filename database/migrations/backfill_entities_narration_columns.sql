-- Backfill entities_narration columns for tables that predate them.
--
-- The Living-map rail (moverCrossings.js loadActiveLegs) selects
-- n.interactive and fails with "column n.interactive does not exist" on
-- databases whose entities_narration table was created before the column
-- landed. schema.sql's CREATE TABLE IF NOT EXISTS never patches an
-- existing table, so the drift survives every schema apply. Same drift
-- hit prod's slug/PK constraints (commit 101b231) — this is the same
-- class of fix: idempotent, a no-op where the column already exists.

ALTER TABLE entities_narration
    ADD COLUMN IF NOT EXISTS entity_id       UUID REFERENCES entities(id),
    ADD COLUMN IF NOT EXISTS entity_ids      UUID[],
    ADD COLUMN IF NOT EXISTS entity_type     TEXT,
    ADD COLUMN IF NOT EXISTS mover_leg_id    UUID REFERENCES mover_legs(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS region_id       INTEGER REFERENCES regions(id),
    ADD COLUMN IF NOT EXISTS location_id     INTEGER REFERENCES locations(id),
    ADD COLUMN IF NOT EXISTS cultural_family TEXT,
    ADD COLUMN IF NOT EXISTS form            TEXT,
    ADD COLUMN IF NOT EXISTS priority        SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tags            TEXT[] NOT NULL DEFAULT '{}',

    ADD COLUMN IF NOT EXISTS aspect          JSONB,
    ADD COLUMN IF NOT EXISTS presence        JSONB,
    ADD COLUMN IF NOT EXISTS lore            JSONB,
    ADD COLUMN IF NOT EXISTS facts           JSONB,
    ADD COLUMN IF NOT EXISTS channel         JSONB,
    ADD COLUMN IF NOT EXISTS variants        JSONB,
    ADD COLUMN IF NOT EXISTS interactive     JSONB,
    ADD COLUMN IF NOT EXISTS disposition     JSONB,

    ADD COLUMN IF NOT EXISTS payload         JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Columns #187 folded into payload.authoring (notes/secret/sections/rotation/
-- traveller_use), moved to encounter_forms (weight/intensity/danger band/
-- triggers_roll) or deleted outright (family, region_ids): re-add them only
-- on schemas that never ran the cleanup.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_flags') THEN
        IF EXISTS (SELECT 1 FROM schema_flags WHERE key = 'narration_cleanup_187') THEN
            RETURN;
        END IF;
    END IF;

    ALTER TABLE entities_narration
        ADD COLUMN IF NOT EXISTS family          TEXT,
        ADD COLUMN IF NOT EXISTS region_ids      INTEGER[],
        ADD COLUMN IF NOT EXISTS secret          JSONB,
        ADD COLUMN IF NOT EXISTS sections        JSONB,
        ADD COLUMN IF NOT EXISTS notes           JSONB,
        ADD COLUMN IF NOT EXISTS traveller_use   JSONB,
        ADD COLUMN IF NOT EXISTS rotation        JSONB,
        ADD COLUMN IF NOT EXISTS weight          INTEGER,
        ADD COLUMN IF NOT EXISTS intensity       INTEGER,
        ADD COLUMN IF NOT EXISTS min_danger      INTEGER,
        ADD COLUMN IF NOT EXISTS max_danger      INTEGER,
        ADD COLUMN IF NOT EXISTS triggers_roll   BOOLEAN;
END $$;

-- places_narration drifted differently: the interactive slot landed there
-- under its earlier name, `situations` (ADR-0015). 757 rows carry live
-- situation data in that column — add `interactive` and move the data
-- across (both tables; entities_narration has 618 the same way). The old
-- column stays: dropping it is a later, deliberate call.
ALTER TABLE places_narration
    ADD COLUMN IF NOT EXISTS interactive JSONB;

-- The copy is conditional: a healthy table has no `situations` column at
-- all, and referencing it would fail at parse time.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'places_narration'
                 AND column_name = 'situations') THEN
        UPDATE places_narration SET interactive = situations
         WHERE interactive IS NULL AND situations IS NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'entities_narration'
                 AND column_name = 'situations') THEN
        UPDATE entities_narration SET interactive = situations
         WHERE interactive IS NULL AND situations IS NOT NULL;
    END IF;
END $$;
