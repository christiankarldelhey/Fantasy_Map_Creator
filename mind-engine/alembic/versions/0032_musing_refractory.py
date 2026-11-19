"""musings.last_spoke_episode — a spoken line goes quiet for a while

Revision ID: 0032
Revises: 0031

The authored inner voice used to answer every contact, so a hot tag
made the same line speak day after day. The refractory window
('musing_refractory_episodes', default 2) silences a Musing that spoke
recently — the thought needs time to gather again before it can be
the mind's reply.
"""
import sqlalchemy as sa
from alembic import op

revision = '0032'
down_revision = '0031'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'musings',
        sa.Column('last_spoke_episode', sa.Integer, nullable=True),
        schema='mind',
    )


def downgrade():
    op.drop_column('musings', 'last_spoke_episode', schema='mind')
