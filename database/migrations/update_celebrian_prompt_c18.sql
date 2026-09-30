-- ============================================================================
-- C18 · Celebrian's narrator lens, compressed
-- ----------------------------------------------------------------------------
-- Her 1124-char system_prompt was doing two jobs: telling the narrator HOW
-- to filter scenes (keeps its place) and declaring WHO she is (moves out).
-- The traits now live as seed beliefs in the 'celebrian' mind mold
-- (story-engine alembic 0014) — they surface in the lens when the day
-- touches them instead of weighing on every prompt.
--
-- Run: node run_migration.js update_celebrian_prompt_c18.sql
-- ============================================================================

-- The template (the "Celebrian mother" every clone is made from).
UPDATE character_state
SET system_prompt = 'NARRATOR''S LENS: Filter each scene through death and the slow defeat of mortal things — a grazing herd is next winter''s thinning; a made road, the grass that will take it back. She watches without looking away: weariness, never self-pity; gravity, never promise — never write that she feels hope or purpose. She speaks little; prefer what she notices over what she declares.'
WHERE id = 2 AND owner_user_id IS NULL;

-- Every clone speaks with its template's voice: sync the authored lens
-- and first-day instructions for all clones (repairs stale copies, e.g.
-- clones that kept the old 1124-char prompt).
UPDATE character_state c
SET system_prompt = t.system_prompt,
    introduction_instructions = t.introduction_instructions
FROM character_state t
WHERE c.template_id = t.id;
