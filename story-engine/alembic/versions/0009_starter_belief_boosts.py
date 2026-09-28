"""add mind.mold_starter_beliefs.boosts

Revision ID: 0009
Revises: 0008
Create Date: 2026-10-01

B6: seed beliefs can declare {tag: magnitude} boosts, cloned into
beliefs.boosts — a mold can ship archetypes whose convictions bend
perception from day one.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0009'
down_revision = '0008'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('mold_starter_beliefs', sa.Column(
        'boosts', postgresql.JSONB, nullable=True
    ), schema='mind')


def downgrade():
    op.drop_column('mold_starter_beliefs', 'boosts', schema='mind')
