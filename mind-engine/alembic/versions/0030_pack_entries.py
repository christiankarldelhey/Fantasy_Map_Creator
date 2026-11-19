"""pack_entries — the mind's own voice as declared data

Revision ID: 0030
Revises: 0029

PHRASES, MOOD_BANDS, FEELING_LEXICON and the disposition render were
engine constants with no game-level override ('no per-game pack', the
voice.py docstring said). A game's mind may need another register or
another language — one (game_id, key) -> JSONB value table carries all
of it, defaults in code as the built-in pack.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = '0030'
down_revision = '0029'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'pack_entries',
        sa.Column('id', sa.Integer, autoincrement=True, primary_key=True),
        sa.Column('game_id', sa.String(120), nullable=False),
        sa.Column('key', sa.String(160), nullable=False),
        sa.Column('value', JSONB, nullable=False),
        sa.Column('enabled', sa.Boolean, nullable=False, server_default='true'),
        sa.UniqueConstraint('game_id', 'key', name='uq_pack_entry'),
        schema='mind',
    )


def downgrade():
    op.drop_table('pack_entries', schema='mind')
