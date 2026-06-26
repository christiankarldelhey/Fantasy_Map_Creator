-- Migration: Reemplazar conversation_topics y character_voice desde CSVs
-- Date: 2026-06-26
-- Description: Recargar las tablas conversation_topics y character_voice desde los CSVs (2).csv

-- 1. Crear usuario si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_user WHERE usename = 'christiankarldelhey') THEN
    CREATE USER christiankarldelhey WITH PASSWORD '';
  END IF;
END $$;

-- 2. Dar permisos al usuario
GRANT CONNECT ON DATABASE middle_earth TO christiankarldelhey;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO christiankarldelhey;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO christiankarldelhey;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO christiankarldelhey;

-- 3. Reemplazar conversation_topics
TRUNCATE conversation_topics;
\copy conversation_topics(entity_type, topic, prose_hint) FROM '/Users/christiankarldelhey/Documents/Middle Earth Map/data_public/conversation_topics (2).csv' WITH (FORMAT csv, HEADER true, QUOTE '"', ESCAPE '"', NULL);

-- 4. Reemplazar character_voice
TRUNCATE character_voice;
\copy character_voice(character_id, stance, weight, prose_hint) FROM '/Users/christiankarldelhey/Documents/Middle Earth Map/data_public/character_voice (2).csv' WITH (FORMAT csv, HEADER true, QUOTE '"', ESCAPE '"', NULL);

-- 5. Verificación
SELECT 'conversation_topics' AS table_name, COUNT(*) AS rows FROM conversation_topics
UNION ALL
SELECT 'character_voice', COUNT(*) FROM character_voice;
