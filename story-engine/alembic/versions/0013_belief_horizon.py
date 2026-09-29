"""add mind.beliefs.horizon

Revision ID: 0013
Revises: 0012
Create Date: 2026-10-17

C14: temporal beliefs. 'enduring' = truths about the world's nature, the
self, or others — they only decay at reflection time. 'transient' =
beliefs bound to current circumstances ("this ford is dangerous these
days") — they fade each closed episode they are not refreshed and go
quiet below belief_weaken_below. Existing rows backfill 'enduring',
preserving B4 semantics for everything already believed.
"""
import sqlalchemy as sa
from alembic import op

revision = '0013'
down_revision = '0012'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'beliefs',
        sa.Column('horizon', sa.String(20), nullable=False,
                  server_default='enduring'),
        schema='mind',
    )


def downgrade():
    op.drop_column('beliefs', 'horizon', schema='mind')
