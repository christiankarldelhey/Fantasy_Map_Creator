-- ============================================================================
-- C35 · The Lens is an Episode brief with a Focus (CONTEXT.md · Lens, Focus)
-- ----------------------------------------------------------------------------
-- episodes.brief  what the Mind put at the centre of the Episode (Focus),
--                 the lines that connect to it — split into what the
--                 Character carries in and what the day does to it — and
--                 every candidate that stayed silent, with its reason.
--                 Built once at open; replayed on re-open like lens_block.
-- ============================================================================
ALTER TABLE mind.episodes ADD COLUMN IF NOT EXISTS brief jsonb;
