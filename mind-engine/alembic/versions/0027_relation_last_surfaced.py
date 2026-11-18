"""relations.last_surfaced_episode — when the disposition last spoke

Revision ID: 0027
Revises: 0026

`last_fed_episode` tracks when the world fed a Relation; the Lens ranks
dispositions by experience weight, and needs the mirror on the prompt
side — a Relation the narrator already voiced lately rests for a few
episodes so the same routine fondness does not narrate every chapter.
"""
import sqlalchemy as sa
from alembic import op

revision = '0027'
down_revision = '0026'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'relations',
        sa.Column('last_surfaced_episode', sa.Integer, nullable=True),
        schema='mind',
    )


def downgrade():
    op.drop_column('relations', 'last_surfaced_episode', schema='mind')
