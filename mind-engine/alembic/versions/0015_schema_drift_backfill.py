"""backfill mind schema drift — C29/C30/C32/C33/C34/C35 columns and tables

Revision ID: 0015
Revises: 0014
Create Date: 2026-10-18

The C-series SQL migrations (database/migrations/*_c*.sql) evolved the mind
schema faster than Alembic tracked it: episodes gained episode_idx, dates,
lens_eval, narrative/translation/brief; memories gained voiced and dates;
and mind.characters + mind.forgotten_memories were never versioned at all.
This ports the lot so a database built purely by `alembic upgrade head`
(e.g. production) matches what the code expects.

Raw SQL with IF NOT EXISTS: dev databases already carry these objects from
the manual C-migrations, so plain op.add_column / create_table would fail.
"""
from alembic import op

revision = '0015'
down_revision = '0014'
branch_labels = None
depends_on = None


def upgrade():
    # --- episodes columns (c29, c30, c32, c33, c35) ------------------------
    op.execute('ALTER TABLE mind.episodes ADD COLUMN IF NOT EXISTS episode_idx integer')
    op.execute('ALTER TABLE mind.episodes ADD COLUMN IF NOT EXISTS episode_date date')
    op.execute('ALTER TABLE mind.episodes ADD COLUMN IF NOT EXISTS lens_eval jsonb')
    op.execute('ALTER TABLE mind.episodes ADD COLUMN IF NOT EXISTS narrative text')
    op.execute('ALTER TABLE mind.episodes ADD COLUMN IF NOT EXISTS narrative_language varchar(20)')
    op.execute('ALTER TABLE mind.episodes ADD COLUMN IF NOT EXISTS narrative_translation jsonb')
    op.execute('ALTER TABLE mind.episodes ADD COLUMN IF NOT EXISTS brief jsonb')

    # --- memories columns (c30, c32) ---------------------------------------
    op.execute('ALTER TABLE mind.memories ADD COLUMN IF NOT EXISTS voiced integer NOT NULL DEFAULT 0')
    op.execute('ALTER TABLE mind.memories ADD COLUMN IF NOT EXISTS last_voiced_episode integer')
    op.execute('ALTER TABLE mind.memories ADD COLUMN IF NOT EXISTS created_date date')
    op.execute('ALTER TABLE mind.memories ADD COLUMN IF NOT EXISTS last_evoked_date date')

    # --- mind.forgotten_memories (c33) -------------------------------------
    op.execute("""
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
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_forgotten_character
        ON mind.forgotten_memories (character_id)
    """)

    # --- mind.characters (c34, table only — the Middle Earth data backfill
    # stays a host concern; Characters self-provision at episode open) ------
    op.execute("""
        CREATE TABLE IF NOT EXISTS mind.characters (
            id                   varchar(40) PRIMARY KEY,
            game_id              varchar(120) NOT NULL,
            character_id         varchar(120) NOT NULL,
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
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_characters_original
        ON mind.characters (original_id)
    """)


def downgrade():
    op.execute('DROP TABLE IF EXISTS mind.characters')
    op.execute('DROP TABLE IF EXISTS mind.forgotten_memories')
    op.execute('ALTER TABLE mind.memories DROP COLUMN IF EXISTS last_evoked_date')
    op.execute('ALTER TABLE mind.memories DROP COLUMN IF EXISTS created_date')
    op.execute('ALTER TABLE mind.memories DROP COLUMN IF EXISTS last_voiced_episode')
    op.execute('ALTER TABLE mind.memories DROP COLUMN IF EXISTS voiced')
    op.execute('ALTER TABLE mind.episodes DROP COLUMN IF EXISTS brief')
    op.execute('ALTER TABLE mind.episodes DROP COLUMN IF EXISTS narrative_translation')
    op.execute('ALTER TABLE mind.episodes DROP COLUMN IF EXISTS narrative_language')
    op.execute('ALTER TABLE mind.episodes DROP COLUMN IF EXISTS narrative')
    op.execute('ALTER TABLE mind.episodes DROP COLUMN IF EXISTS lens_eval')
    op.execute('ALTER TABLE mind.episodes DROP COLUMN IF EXISTS episode_date')
    op.execute('ALTER TABLE mind.episodes DROP COLUMN IF EXISTS episode_idx')
