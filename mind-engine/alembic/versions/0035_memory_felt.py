"""memories.felt — the real pull, stored

Revision ID: 0035
Revises: 0034

A memory kept what the world suggested (imprint — the objective sediment
on Relations) and a one-dim summary (valence), but the pull it actually
made through the personality — the felt word, the refracted target, the
gain — died at encode. `felt` stores it verbatim: [{'word', 'target',
'gain'}], so remembering can re-feel what was felt, not what the world
suggested.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = '0035'
down_revision = '0034'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'memories',
        sa.Column('felt', postgresql.JSONB(), nullable=True),
        schema='mind')


def downgrade():
    op.drop_column('memories', 'felt', schema='mind')
