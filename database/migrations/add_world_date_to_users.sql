-- Migration: users.world_date — the player's in-world present (C30)
-- Date: 2026-10-18
-- The date is the source of truth for in-world time: a new journey begins
-- where the player's last day left the world. The mind-schema half of C30
-- (episode_date, memory dates) lives in alembic 0015; this file only covers
-- the public schema so ensureSchema can run it before the engine migrates.
-- Idempotent: safe to run on every deploy.

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
