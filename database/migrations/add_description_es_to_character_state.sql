-- Migration: Add description_es column to character_state for Spanish translations
-- Date: 2026-09-04
-- Description: Adds a Spanish description column so character descriptions can be
-- shown in Spanish when the user selects that language. Only template characters
-- (owner_user_id IS NULL) have translated values; clones inherit via clone-all.

ALTER TABLE character_state ADD COLUMN IF NOT EXISTS description_es TEXT;

-- Aranath (id=1)
UPDATE character_state
SET description_es = 'Alto y callado, de los que miden los días por las estrellas y no por el almanaque. Lleva años recorriendo los confines del viejo Arnor, y esta vez marcha solo. Busca un camino antiguo del que ya casi nadie habla.'
WHERE id = 1 AND owner_user_id IS NULL;

-- Celebrian (id=2) — update both English and Spanish descriptions
UPDATE character_state
SET description = 'Cold-eyed and unhurried, one of those who see the ruin in a wall the day it is raised. She has watched enough fall to stop looking away, and she walks without destination or company. She seeks the places where the world wears thin.',
    description_es = 'De ojos fríos y sin apuro, de las que ven la ruina en un muro el día que lo levantan. Ha visto caer suficiente como para no apartar la mirada, y camina sin rumbo y sin compañía. Busca los lugares donde el mundo se desgasta.'
WHERE id = 2 AND owner_user_id IS NULL;

-- Backfill existing clones: copy description and description_es from their template
UPDATE character_state c
SET description = t.description,
    description_es = t.description_es
FROM character_state t
WHERE c.template_id = t.id
  AND c.owner_user_id IS NOT NULL
  AND t.owner_user_id IS NULL;
