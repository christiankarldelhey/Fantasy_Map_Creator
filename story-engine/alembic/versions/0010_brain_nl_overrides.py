"""create mind.brain_nl_overrides

Revision ID: 0010
Revises: 0009
Create Date: 2026-10-01

B7: per-brain NL overrides — a brain may replace a band table, a
threshold, or a phrase list for itself (the hobbit who calls the
ranger's drizzle a storm). Resolution: override → game pack → default.
"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '0010'
down_revision = '0009'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'brain_nl_overrides',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('brain_id', sa.String(40),
                  sa.ForeignKey('mind.brains.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('kind', sa.String(20), nullable=False),
        sa.Column('key', sa.String(120), nullable=False),
        sa.Column('ordinal', sa.Integer, nullable=False,
                  server_default='0'),
        sa.Column('below', sa.Float, nullable=True),
        sa.Column('phrase', sa.Text, nullable=True),
        sa.Column('value', sa.Float, nullable=True),
        sa.UniqueConstraint('brain_id', 'kind', 'key', 'ordinal',
                            name='uq_brain_nl_override'),
        schema='mind',
    )
    op.create_index('ix_brain_nl_overrides_brain', 'brain_nl_overrides',
                    ['brain_id'], schema='mind')


def downgrade():
    op.drop_index('ix_brain_nl_overrides_brain',
                  table_name='brain_nl_overrides', schema='mind')
    op.drop_table('brain_nl_overrides', schema='mind')
