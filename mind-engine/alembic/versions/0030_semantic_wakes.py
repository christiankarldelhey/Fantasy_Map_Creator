"""semantics.wakes — the kind declares it breaks sleep

Revision ID: 0030
Revises: 0029

'sleep_wake_forms'/'sleep_wake_outcomes' were wiring lists of which
contact kinds wake the sleeper — kind data, not a mind dial. It becomes
a flag on the semantic row: 'form:attacks' wakes because violence is
intrusive, and a game can mark its own intrusive kinds the same way.
"""
import sqlalchemy as sa
from alembic import op

revision = '0030'
down_revision = '0029'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'semantics',
        sa.Column('wakes', sa.Boolean, nullable=True),
        schema='mind',
    )


def downgrade():
    op.drop_column('semantics', 'wakes', schema='mind')
