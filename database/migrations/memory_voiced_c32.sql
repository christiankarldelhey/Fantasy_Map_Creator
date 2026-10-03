-- ============================================================================
-- C32 · Voiced vs evoked: the lens' bleed rate, measured
-- ----------------------------------------------------------------------------
-- C17's declared debt: the mind stirs memories into the lens and the
-- narrator may or may not voice them — nothing observed the difference.
-- Now each narrate measures which evoked memories the generated prose
-- echoed (same token-echo rule as the lens_reference eval) and stores it:
--
--   episodes.lens_eval      {evoked: [...], voiced: [...]} — evoked is the
--                           fixed snapshot from open; voiced is the last
--                           generation's observation (re-measured per
--                           narrate, matching 'narrative is not persisted').
--   memories.voiced         episodes whose prose echoed this memory.
--   memories.last_voiced_episode  guards the counter: one bump per episode,
--                           so re-narrating can't inflate it.
--
-- evocations vs voiced is the retrieval knob's real feedback: a memory the
-- prose never voices is evocation noise, not signal.
-- ============================================================================
ALTER TABLE mind.episodes ADD COLUMN IF NOT EXISTS lens_eval jsonb;
ALTER TABLE mind.memories ADD COLUMN IF NOT EXISTS voiced integer NOT NULL DEFAULT 0;
ALTER TABLE mind.memories ADD COLUMN IF NOT EXISTS last_voiced_episode integer;
