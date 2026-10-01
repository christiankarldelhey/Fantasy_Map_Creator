-- ============================================================================
-- C30 · The world has a clock: users.world_date + mind dates
-- ----------------------------------------------------------------------------
-- The date is the source of truth for in-world time. Trips used to carry
-- their own private calendar (start_date default 1950-06-21); now the
-- player owns a 'now' — a new journey begins where their last day left
-- the world, and the mind ages memories by calendar distance, so a month
-- of rest between journeys reads 'A long while ago', not 'Yesterday'.
--
--   users.world_date           — the player's in-world present
--   mind.episodes.episode_date — the day this episode was lived
--   mind.memories.created_date / last_evoked_date — narrative aging
--                                  (episode_idx stays the mechanics clock)
-- ============================================================================
-- 'world_date', not 'current_date' — CURRENT_DATE is reserved SQL.
ALTER TABLE users ADD COLUMN IF NOT EXISTS world_date date NOT NULL DEFAULT '1950-06-21';

-- Existing players stand where their characters last walked.
UPDATE users u
SET world_date = sub.max_date
FROM (
  SELECT cs.owner_user_id AS user_id, MAX(td.date) AS max_date
  FROM trip_days td
  JOIN trips t ON t.id = td.trip_id
  JOIN character_state cs ON cs.id = t.character_id
  WHERE cs.owner_user_id IS NOT NULL
  GROUP BY cs.owner_user_id
) sub
WHERE u.id = sub.user_id
  AND sub.max_date > u.world_date;

ALTER TABLE mind.episodes ADD COLUMN IF NOT EXISTS episode_date date;

-- Episode dates backfill from the events' own when.date.
UPDATE mind.episodes e
SET episode_date = sub.d
FROM (
  SELECT ep.id, MAX((ev->'when'->>'date')::date) AS d
  FROM mind.episodes ep, jsonb_array_elements(ep.events) ev
  WHERE (ev->'when'->>'date') ~ '^\d{4}-\d{2}-\d{2}'
  GROUP BY ep.id
) sub
WHERE e.id = sub.id
  AND e.episode_date IS NULL;

ALTER TABLE mind.memories ADD COLUMN IF NOT EXISTS created_date date;
ALTER TABLE mind.memories ADD COLUMN IF NOT EXISTS last_evoked_date date;

-- A memory's lived date is its creating episode's date (first episode_ids
-- element — later entries are re-encodings).
UPDATE mind.memories m
SET created_date = e.episode_date
FROM mind.episodes e
WHERE e.id = m.episode_ids->>0
  AND m.created_date IS NULL;
