"""semantics.salience_min + semantics.severity — the kind's declared floors

Revision ID: 0028
Revises: 0027

'salience_min.<tag>' and 'severity.<tag>' lived in DEFAULT_WIRING as
per-mind knobs, but a floor is meaning — a storm IS severe in this
world, thinking company IS never background — so they move onto the
semantic row next to delta/weight/body. The mind-side attention channel
stays where ADR-0017 put it: Relations.
"""
import sqlalchemy as sa
from alembic import op

revision = '0028'
down_revision = '0027'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'semantics',
        sa.Column('salience_min', sa.Float, nullable=True),
        schema='mind',
    )
    op.add_column(
        'semantics',
        sa.Column('severity', sa.Float, nullable=True),
        schema='mind',
    )


def downgrade():
    op.drop_column('semantics', 'severity', schema='mind')
    op.drop_column('semantics', 'salience_min', schema='mind')
