"""create mind.composite_rules

Revision ID: 0011
Revises: 0010
Create Date: 2026-10-01

B9: declarative multi-day rules — when ANY condition group matches an
event (of event_type, if set) for streak_days consecutive episodes, the
keyed Need opens. The old hardcoded exposure detector becomes the
DEFAULT_RULES entry; games override per row.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0011'
down_revision = '0010'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'composite_rules',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('game_id', sa.String(120), nullable=False),
        sa.Column('key', sa.String(120), nullable=False),
        sa.Column('need_type', sa.String(30), nullable=False,
                  server_default='physiological'),
        sa.Column('event_type', sa.String(60), nullable=True),
        sa.Column('streak_days', sa.Integer, nullable=True),
        sa.Column('urgency_base', sa.Float, nullable=True),
        sa.Column('urgency_per_day', sa.Float, nullable=True),
        sa.Column('conditions', postgresql.JSONB, nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.UniqueConstraint('game_id', 'key', name='uq_composite_rule'),
        schema='mind',
    )


def downgrade():
    op.drop_table('composite_rules', schema='mind')
