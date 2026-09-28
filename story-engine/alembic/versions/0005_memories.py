"""create mind.memories

Revision ID: 0005
Revises: 0004
Create Date: 2026-09-28

The hippocampus table: episodic memories with strength/decay bookkeeping.
GIN index on tags feeds retrieval relevance (A8); embedding is reserved
for pgvector (B8).
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'memories',
        sa.Column('id', sa.String(40), primary_key=True),
        sa.Column('game_id', sa.String(120), nullable=False),
        sa.Column('character_id', sa.String(120), nullable=False),
        sa.Column('episode_ids', postgresql.JSONB, nullable=False, server_default='[]'),
        sa.Column('kind', sa.String(20), nullable=False, server_default='episodic'),
        sa.Column('tags', postgresql.JSONB, nullable=False, server_default='[]'),
        sa.Column('entity_id', sa.String(120), nullable=True),
        sa.Column('region', sa.String(120), nullable=True),
        sa.Column('desc', sa.Text, nullable=False),
        sa.Column('valence', sa.Float, nullable=False, server_default='0'),
        sa.Column('importance', sa.Float, nullable=False, server_default='0'),
        sa.Column('strength', sa.Float, nullable=False, server_default='0'),
        sa.Column('evocations', sa.Integer, nullable=False, server_default='0'),
        sa.Column('last_evoked_episode', sa.Integer, nullable=True),
        sa.Column('consolidated', sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column('embedding', postgresql.JSONB, nullable=True),
        sa.Column('origin', sa.String(30), nullable=False, server_default='experience'),
        sa.Column('created_episode', sa.Integer, nullable=True),
        schema='mind',
    )
    op.create_index('ix_memories_character', 'memories', ['character_id'], schema='mind')
    op.create_index('ix_memories_tags', 'memories', ['tags'], schema='mind',
                    postgresql_using='gin')


def downgrade():
    op.drop_index('ix_memories_tags', table_name='memories', schema='mind')
    op.drop_index('ix_memories_character', table_name='memories', schema='mind')
    op.drop_table('memories', schema='mind')
