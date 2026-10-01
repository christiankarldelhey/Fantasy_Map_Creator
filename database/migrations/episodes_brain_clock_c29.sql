-- ============================================================================
-- C29 · The mind keeps its own clock: episodes.episode_idx
-- ----------------------------------------------------------------------------
-- Bug #3 (Celebrian's chapter-1 review): memory ages were anchored on the
-- host's when.episode — a trip's day_number that resets every journey.
-- Day 2 of a new trip collided with day-2 memories of the old one:
-- 'Yesterday — the ranger asked...' could evoke a week-old memory as if
-- it were last night, and the refractory window misfired the same way.
--
-- episode_idx is a per-brain monotonic counter assigned at open.
-- Backfill ranks each brain's existing episodes by creation order — the
-- order they were lived — so legacy memories keep a truthful age.
-- ============================================================================
ALTER TABLE mind.episodes ADD COLUMN IF NOT EXISTS episode_idx integer;

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY game_id, character_id
           ORDER BY created_at, id
         ) AS idx
  FROM mind.episodes
)
UPDATE mind.episodes e
SET episode_idx = r.idx
FROM ranked r
WHERE e.id = r.id
  AND e.episode_idx IS NULL;
