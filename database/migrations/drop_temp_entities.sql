-- Migration: drop the temp_entities staging table
-- Leftover from the one-shot entity import migrations
-- (add_*_and_import_entities.sql); nothing reads it since.
DROP TABLE IF EXISTS temp_entities;
