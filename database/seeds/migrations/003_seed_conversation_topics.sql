-- Migration: Seed conversation topics data
-- Date: 2026-06-29
-- Description: Load conversation topics master data from CSV seed file

-- Create temporary table for CSV import
DROP TABLE IF EXISTS temp_conversation_topics;

CREATE TABLE temp_conversation_topics (
    entity_type TEXT,
    topic TEXT,
    prose_hint TEXT
);

-- Import data from CSV file
COPY temp_conversation_topics(entity_type, topic, prose_hint)
FROM '/Users/christiankarldelhey/Documents/Middle Earth Map/database/seeds/data/csv/conversation_topics.csv'
DELIMITER ','
CSV HEADER
QUOTE '"';

-- Insert into main table with conflict resolution
INSERT INTO conversation_topics (entity_type, topic, prose_hint)
SELECT entity_type, topic, prose_hint
FROM temp_conversation_topics
ON CONFLICT (entity_type, topic) DO UPDATE SET
    prose_hint = EXCLUDED.prose_hint;

-- Clean up temporary table
DROP TABLE temp_conversation_topics;

-- Verification
SELECT 'conversation_topics' AS table_name, COUNT(*) AS rows_loaded FROM conversation_topics;
