-- ============================================================================
-- C33 · The Mind keeps its history: Forgotten traces + the last narration
-- ----------------------------------------------------------------------------
-- The Studio's timeline rebuilds a Mind as it was on any past Episode. Two
-- things were thrown away and are now kept:
--
--   mind.forgotten_memories  a memory below forget_threshold used to be
--                            DELETEd without a trace. It still dies from
--                            mind.memories (so nothing can evoke it), but
--                            its trace lands here with forgotten_episode.
--   episodes.narrative       the last generated narration (+ language), so
--                            the timeline can show the prose beside the
--                            Lens that shaped it. Overwritten per narrate.
-- ============================================================================
CREATE TABLE IF NOT EXISTS mind.forgotten_memories (
    id                varchar(40) PRIMARY KEY,
    game_id           varchar(120) NOT NULL,
    character_id      varchar(120) NOT NULL,
    episode_ids       jsonb NOT NULL DEFAULT '[]'::jsonb,
    kind              varchar(20) NOT NULL,
    tags              jsonb NOT NULL DEFAULT '[]'::jsonb,
    entity_id         varchar(120),
    "desc"            text NOT NULL,
    valence           double precision NOT NULL DEFAULT 0,
    importance        double precision NOT NULL DEFAULT 0,
    evocations        integer NOT NULL DEFAULT 0,
    voiced            integer NOT NULL DEFAULT 0,
    consolidated      boolean NOT NULL DEFAULT false,
    created_episode   integer,
    created_date      date,
    forgotten_episode integer,
    last_strength     double precision NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_forgotten_character
    ON mind.forgotten_memories (character_id);

ALTER TABLE mind.episodes ADD COLUMN IF NOT EXISTS narrative text;
ALTER TABLE mind.episodes ADD COLUMN IF NOT EXISTS narrative_language varchar(20);
