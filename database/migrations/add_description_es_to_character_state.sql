-- Migration: Add description_es column to character_state for Spanish translations
-- Date: 2026-09-04
-- Description: Adds a Spanish description column so character descriptions can be
-- shown in Spanish when the user selects that language. Only template characters
-- (owner_user_id IS NULL) have translated values; clones inherit via clone-all.

ALTER TABLE character_state ADD COLUMN IF NOT EXISTS description_es TEXT;

-- Aranath (id=1)
UPDATE character_state
SET description_es = 'Alto y silencioso, uno de esos que cuenta los días por las estrellas y no por el calendario. Ha pasado años recorriendo las fronteras del viejo Arnor, y esta vez camina solo. Busca un camino antiguo del que pocos hablan aún.'
WHERE id = 1 AND owner_user_id IS NULL;

-- Celebrian (id=2)
UPDATE character_state
SET description_es = 'Ve el final en las cosas, la podredumbre en la hoja verde, la ruina en el muro recién levantado, y hace ya mucho que dejó de apartar la mirada. Vaga sin destino, atraída a los lugares donde el mundo se desgasta, para detenerse al borde de lo que se apaga y escuchar lo que tiene que decir.'
WHERE id = 2 AND owner_user_id IS NULL;
