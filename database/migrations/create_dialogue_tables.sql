-- Migration: Create dialogue tables
-- Date: 2026-06-26
-- Description: Holds conversation topics per entity type and character voice stances.

CREATE TABLE IF NOT EXISTS conversation_topics (
    entity_type TEXT NOT NULL,
    topic       TEXT NOT NULL,
    prose_hint  TEXT NOT NULL,
    PRIMARY KEY (entity_type, topic)
);

CREATE INDEX IF NOT EXISTS idx_conversation_topics_entity_type
    ON conversation_topics (entity_type);

CREATE TABLE IF NOT EXISTS character_voice (
    character_id INTEGER NOT NULL,
    stance       TEXT NOT NULL,
    weight       INT  NOT NULL CHECK (weight >= 0),
    prose_hint   TEXT NOT NULL,
    PRIMARY KEY (character_id, stance),
    FOREIGN KEY (character_id) REFERENCES character_state(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_character_voice_character_id
    ON character_voice (character_id);

-- If an older version used a TEXT slug FK, migrate it to INTEGER id.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'character_voice'
      AND column_name = 'character_id'
      AND data_type = 'text'
  ) THEN
    -- Drop the old slug FK before remapping values.
    ALTER TABLE character_voice
      DROP CONSTRAINT IF EXISTS character_voice_character_id_fkey;

    UPDATE character_voice cv
    SET character_id = c.id::text
    FROM character_state c
    WHERE cv.character_id = c.slug;

    ALTER TABLE character_voice
      ALTER COLUMN character_id TYPE INTEGER USING character_id::integer;

    ALTER TABLE character_voice
      ADD CONSTRAINT character_voice_character_id_fkey
      FOREIGN KEY (character_id) REFERENCES character_state(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Verification
SELECT 'conversation_topics' AS table_name, COUNT(*) AS rows FROM conversation_topics
UNION ALL
SELECT 'character_voice', COUNT(*) FROM character_voice;
