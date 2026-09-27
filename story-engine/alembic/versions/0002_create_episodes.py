"""create mind.episodes

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-28

Episodes are the Mind Engine's unit of work: one open/narrate/close cycle.
UNIQUE(game_id, character_id, episode_ref) gives the host idempotent opens —
re-posting the same ref returns the same episode instead of duplicating.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'episodes',
        sa.Column('id', sa.String(40), primary_key=True),
        sa.Column('game_id', sa.String(120), nullable=False),
        sa.Column('character_id', sa.String(120), nullable=False),
        sa.Column('episode_ref', sa.String(120), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='open'),
        sa.Column('events', postgresql.JSONB, nullable=False, server_default='[]'),
        sa.Column('narrator_payload', postgresql.JSONB, nullable=True),
        sa.Column('config_snapshot', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('perceived_day', postgresql.JSONB, nullable=False, server_default='[]'),
        sa.Column('outcome', postgresql.JSONB, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('narrated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint(
            'game_id', 'character_id', 'episode_ref', name='uq_episode_ref'
        ),
        schema='mind',
    )


def downgrade():
    op.drop_table('episodes', schema='mind')
