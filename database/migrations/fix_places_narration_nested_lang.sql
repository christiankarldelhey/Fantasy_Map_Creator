-- fix_places_narration_nested_lang.sql
-- Unwrap pathological {en:{en:{en:…}}} nesting in places_narration.type/name.
--
-- Cause: early writes stored type/name as {en: <previous object>} instead of
-- the scalar, and preserveSpatial keeps `type` for anchored rows — so the
-- corruption froze in the DB while the JSON sources healed long ago.
-- All corrupted rows sit under a finite en-chain ending in a real {en,es}
-- leaf; walk it and keep the innermost object.
--
-- Idempotent: after one pass no row has type->'en' of type 'object'.

DO $$
BEGIN
  -- type
  WITH RECURSIVE un AS (
    SELECT id, type AS v, 0 AS d FROM places_narration
     WHERE type IS NOT NULL AND jsonb_typeof(type->'en') = 'object'
    UNION ALL
    SELECT id, v->'en', d + 1 FROM un
     WHERE jsonb_typeof(v->'en') = 'object' AND d < 100
  )
  UPDATE places_narration p SET type = leaf.v
    FROM (SELECT DISTINCT ON (id) id, v FROM un ORDER BY id, d DESC) leaf
   WHERE p.id = leaf.id;

  -- name
  WITH RECURSIVE un AS (
    SELECT id, name AS v, 0 AS d FROM places_narration
     WHERE name IS NOT NULL AND jsonb_typeof(name->'en') = 'object'
    UNION ALL
    SELECT id, v->'en', d + 1 FROM un
     WHERE jsonb_typeof(v->'en') = 'object' AND d < 100
  )
  UPDATE places_narration p SET name = leaf.v
    FROM (SELECT DISTINCT ON (id) id, v FROM un ORDER BY id, d DESC) leaf
   WHERE p.id = leaf.id;
END $$;
