-- Migration: Add description_es column to locations for Spanish translations
-- Date: 2026-09-04
-- Description: Adds a Spanish description column so location descriptions can be
-- shown in Spanish in the on-click sidebar when the user selected that language.
-- The narrative prompt always uses the English description regardless of UI language.

ALTER TABLE locations ADD COLUMN IF NOT EXISTS description_es TEXT;
