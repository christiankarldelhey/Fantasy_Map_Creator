"""episodes lens_block+mood, belief tags

Revision ID: 0006
Revises: 0005
Create Date: 2026-09-28

A8: episodes persist their rendered lens and computed mood so re-open
replays the same packet; beliefs carry tag sets so active beliefs can
pull contextually related memories into the episode.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'episodes',
        sa.Column('lens_block', sa.Text, nullable=True),
        schema='mind',
    )
    op.add_column(
        'episodes',
        sa.Column('mood', postgresql.JSONB, nullable=True),
        schema='mind',
    )
    op.add_column(
        'beliefs',
        sa.Column('tags', postgresql.JSONB, nullable=False, server_default='[]'),
        schema='mind',
    )
    op.add_column(
        'mold_starter_beliefs',
        sa.Column('tags', postgresql.JSONB, nullable=False, server_default='[]'),
        schema='mind',
    )


def downgrade():
    op.drop_column('mold_starter_beliefs', 'tags', schema='mind')
    op.drop_column('beliefs', 'tags', schema='mind')
    op.drop_column('episodes', 'mood', schema='mind')
    op.drop_column('episodes', 'lens_block', schema='mind')
