"""create mind.needs

Revision ID: 0007
Revises: 0006
Create Date: 2026-09-28

Open intentions of the mind (B2): detector-driven physiological needs and
narrative threads. One row per (game, character, key) — upserted at open,
resolved by state change or by the host's outcome at close.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'needs',
        sa.Column('id', sa.String(40), primary_key=True),
        sa.Column('game_id', sa.String(120), nullable=False),
        sa.Column('character_id', sa.String(120), nullable=False),
        sa.Column('key', sa.String(120), nullable=False),
        sa.Column('type', sa.String(30), nullable=False),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('urgency', sa.Float, nullable=False, server_default='0'),
        sa.Column('status', sa.String(20), nullable=False, server_default='open'),
        sa.Column('source', postgresql.JSONB, nullable=True),
        sa.Column('linked_entity', sa.String(120), nullable=True),
        sa.Column('linked_region', sa.String(120), nullable=True),
        sa.Column('opened_episode', sa.Integer, nullable=True),
        sa.Column('due_episode', sa.Integer, nullable=True),
        sa.Column('updated_episode', sa.Integer, nullable=True),
        sa.Column('resolution', postgresql.JSONB, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.func.now()),
        sa.UniqueConstraint('game_id', 'character_id', 'key',
                            name='uq_need_key'),
        schema='mind',
    )
    op.create_index('ix_needs_character', 'needs',
                    ['character_id', 'status'], schema='mind')
    # Snapshot of the needs that were active at open — replays like
    # perceived_day/lens_block on re-open.
    op.add_column('episodes', sa.Column(
        'needs_active', postgresql.JSONB, nullable=False, server_default='[]'
    ), schema='mind')


def downgrade():
    op.drop_column('episodes', 'needs_active', schema='mind')
    op.drop_index('ix_needs_character', table_name='needs', schema='mind')
    op.drop_table('needs', schema='mind')
