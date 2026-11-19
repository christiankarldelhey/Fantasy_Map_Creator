"""conviction-tier memories — beliefs fold into memories (#168)

Revision ID: 0034
Revises: 0033

A Belief and its memory-side shadow were two rows for one truth. The fold
makes it one: memories with kind='conviction' carry a `conviction` JSONB
facet — {kind, horizon, status, strength, evidence, source, formed,
updated} — while statement/subject/stance/tags/origin ride the memory
continuum's own columns (desc/subjects/imprint.affection/tags/origin).

  1. adds memories.conviction;
  2. stamps the facet on existing shadow rows (matched by desc) and
     inserts a conviction memory for each belief that had none — no
     belief is lost;
  3. drops mind.beliefs.

Downgrade rebuilds the beliefs table from conviction rows and leaves the
memory rows in place (the pre-fold shadow pair restored, near enough —
rows inserted by step 2 stay as conviction memories either way).
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = '0034'
down_revision = '0033'
branch_labels = None
depends_on = None

_FACET = """jsonb_build_object(
    'kind', b.kind, 'horizon', b.horizon, 'status', b.status,
    'strength', b.strength,
    'evidence', COALESCE(b.evidence, '[]'::jsonb),
    'source', b.source,
    'formed', b.formed_episode, 'updated', b.updated_episode)"""

_SHADOW_MATCH = """m.game_id = b.game_id
    AND m.character_id = b.character_id
    AND m.kind = 'conviction' AND m.desc = b.statement"""


def upgrade():
    op.add_column(
        'memories',
        sa.Column('conviction', postgresql.JSONB, nullable=True),
        schema='mind',
    )
    # Shadows get the facet — one row, one truth.
    op.execute(sa.text(f"""
        UPDATE mind.memories m
        SET conviction = {_FACET}
        FROM mind.beliefs b
        WHERE {_SHADOW_MATCH}
    """))
    # Beliefs that never had an impression become their own row.
    op.execute(sa.text(f"""
        INSERT INTO mind.memories (
            id, game_id, character_id, episode_ids, kind, tags,
            "desc", valence, importance, strength, evocations, voiced,
            consolidated, origin, created_episode, depth, mutable,
            imprint, subjects, conviction
        )
        SELECT
            'mem_' || md5(b.id || b.statement),
            b.game_id, b.character_id, '[]'::jsonb, 'conviction',
            COALESCE(b.tags, '[]'::jsonb),
            b.statement,
            COALESCE(b.stance, 0.0),
            GREATEST(ABS(COALESCE(b.stance, 0.0)), 0.4),
            1.0, 0, 0, true,
            b.origin, b.formed_episode, 'conviction', true,
            CASE WHEN b.stance IS NOT NULL
                 THEN jsonb_build_object('affection', b.stance) END,
            b.subject,
            {_FACET}
        FROM mind.beliefs b
        WHERE NOT EXISTS (
            SELECT 1 FROM mind.memories m WHERE {_SHADOW_MATCH})
    """))
    op.drop_table('beliefs', schema='mind')


def downgrade():
    op.create_table(
        'beliefs',
        sa.Column('id', sa.String(40), primary_key=True),
        sa.Column('game_id', sa.String(120), nullable=False),
        sa.Column('character_id', sa.String(120), nullable=False),
        sa.Column('kind', sa.String(30), nullable=False),
        sa.Column('statement', sa.Text, nullable=False),
        sa.Column('strength', sa.Float, nullable=False, server_default='3'),
        sa.Column('tags', postgresql.JSONB, nullable=True),
        sa.Column('evidence', postgresql.JSONB, nullable=False,
                  server_default='[]'),
        sa.Column('origin', sa.String(30), nullable=False,
                  server_default='experience'),
        sa.Column('status', sa.String(20), nullable=False,
                  server_default='active'),
        sa.Column('horizon', sa.String(20), nullable=True),
        sa.Column('subject', postgresql.JSONB, nullable=True),
        sa.Column('stance', sa.Float, nullable=True),
        sa.Column('source', sa.String(20), nullable=True),
        sa.Column('boosts', postgresql.JSONB, nullable=True),
        sa.Column('formed_episode', sa.Integer, nullable=True),
        sa.Column('updated_episode', sa.Integer, nullable=True),
        schema='mind',
    )
    op.execute(sa.text("""
        INSERT INTO mind.beliefs (
            id, game_id, character_id, kind, statement, strength, tags,
            evidence, origin, status, horizon, subject, stance, source,
            formed_episode, updated_episode
        )
        SELECT
            'bl_' || md5(m.id),
            m.game_id, m.character_id,
            COALESCE(m.conviction->>'kind', 'world'),
            m."desc",
            COALESCE((m.conviction->>'strength')::float, 3.0),
            m.tags,
            COALESCE(m.conviction->'evidence', '[]'::jsonb),
            m.origin,
            COALESCE(m.conviction->>'status', 'active'),
            m.conviction->>'horizon',
            m.subjects,
            (m.imprint->>'affection')::float,
            m.conviction->>'source',
            (m.conviction->>'formed')::int,
            (m.conviction->>'updated')::int
        FROM mind.memories m
        WHERE m.kind = 'conviction' AND m.conviction IS NOT NULL
    """))
    op.drop_column('memories', 'conviction', schema='mind')
