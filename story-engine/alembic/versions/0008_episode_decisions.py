"""add mind.episodes.decisions

Revision ID: 0008
Revises: 0007
Create Date: 2026-10-01

Recorded decision-point picks (B5): {decision_id: option_id}. The mind
records the host's choice; the proposed commands attached to the chosen
option are returned to the host for validation/application.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0008'
down_revision = '0007'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('episodes', sa.Column(
        'decisions', postgresql.JSONB, nullable=True
    ), schema='mind')


def downgrade():
    op.drop_column('episodes', 'decisions', schema='mind')
