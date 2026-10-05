-- ============================================================================
-- C34 · The Mind owns the Character card (ADR 0001)
-- ----------------------------------------------------------------------------
-- Who a character IS moves from the Host's character_state into
-- mind.characters: name, type, gender, descriptions, portrait, foundational
-- phrase (system_prompt), voice instructions and skills.
--
-- kind='original'  the authored source (character_state rows with no owner)
-- kind='copy'      one playable clone; original_id points at its Original
--
-- The Host keeps the Condition (position, body, coins, alive/dead) and keeps
-- reporting it per Episode. The card self-provisions at open for hosts that
-- have no characters table — this backfill only seeds Middle Earth's
-- existing rows.
-- ============================================================================
CREATE TABLE IF NOT EXISTS mind.characters (
    id                   varchar(40) PRIMARY KEY,
    game_id              varchar(120) NOT NULL,
    character_id         varchar(120) NOT NULL,  -- the Host's external ref
    kind                 varchar(20)  NOT NULL DEFAULT 'copy',
    original_id          varchar(40) REFERENCES mind.characters(id) ON DELETE SET NULL,
    slug                 varchar(120),
    name                 varchar(255),
    type                 varchar(60),
    gender               varchar(20),
    entity_name          varchar(160),
    description          text,
    description_es       text,
    portrait_url         text,
    foundational_phrase  text,
    voice_instructions   text,
    skills               jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_character UNIQUE (game_id, character_id)
);
CREATE INDEX IF NOT EXISTS ix_characters_original
    ON mind.characters (original_id);

-- Originals first: authored rows (no owner) so copies can point at them.
INSERT INTO mind.characters (
    id, game_id, character_id, kind, slug, name, type, gender, entity_name,
    description, description_es, portrait_url,
    foundational_phrase, voice_instructions, skills
)
SELECT
    'chr_' || replace(gen_random_uuid()::text, '-', ''),
    'middle_earth',
    cs.id::text,
    'original',
    cs.slug, cs.name, cs.type, cs.gender, e.name,
    cs.description, cs.description_es, e.url_path,
    cs.system_prompt, cs.introduction_instructions,
    jsonb_build_object(
        'tracking',   cs.skill_tracking,
        'persuasion', cs.skill_persuasion,
        'ranged',     cs.skill_ranged,
        'melee',      cs.skill_melee,
        'lore',       cs.skill_lore,
        'stealth',    cs.skill_stealth,
        'endurance',  cs.skill_endurance
    )
FROM public.character_state cs
LEFT JOIN public.entities e ON e.id = cs.entity_id
WHERE cs.owner_user_id IS NULL
ON CONFLICT (game_id, character_id) DO NOTHING;

-- Copies: one playable instance per owned row, linked to its Original.
INSERT INTO mind.characters (
    id, game_id, character_id, kind, original_id, slug, name, type, gender,
    entity_name, description, description_es, portrait_url,
    foundational_phrase, voice_instructions, skills
)
SELECT
    'chr_' || replace(gen_random_uuid()::text, '-', ''),
    'middle_earth',
    cs.id::text,
    'copy',
    o.id,
    cs.slug, cs.name, cs.type, cs.gender, e.name,
    cs.description, cs.description_es, e.url_path,
    cs.system_prompt, cs.introduction_instructions,
    jsonb_build_object(
        'tracking',   cs.skill_tracking,
        'persuasion', cs.skill_persuasion,
        'ranged',     cs.skill_ranged,
        'melee',      cs.skill_melee,
        'lore',       cs.skill_lore,
        'stealth',    cs.skill_stealth,
        'endurance',  cs.skill_endurance
    )
FROM public.character_state cs
LEFT JOIN public.entities e ON e.id = cs.entity_id
LEFT JOIN mind.characters o
       ON o.game_id = 'middle_earth'
      AND o.character_id = cs.template_id::text
WHERE cs.owner_user_id IS NOT NULL
ON CONFLICT (game_id, character_id) DO NOTHING;
