"""drop mind.nl_bands, nl_thresholds, nl_phrase_lists, facets, brain_nl_overrides

Revision ID: 0019
Revises: 0018
Create Date: 2026-10-31

#54: the world voice left the engine — the host verbalizes the world
(day.world_notes, event.data.reading) and the mind consumes prose
verbatim. These tables only ever fed the in-engine natural-language
resolver; the mind's own voice lives as constants in mind/voice.py.

Composite rules stay: pack versioning (pack_versions) still covers them.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0019'
down_revision = '0018'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_table('brain_nl_overrides', schema='mind')
    op.drop_table('facets', schema='mind')
    op.drop_table('nl_phrase_lists', schema='mind')
    op.drop_table('nl_thresholds', schema='mind')
    op.drop_table('nl_bands', schema='mind')


def downgrade():
    op.create_table(
        'nl_bands',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('game_id', sa.String(120), nullable=False),
        sa.Column('table_name', sa.String(60), nullable=False),
        sa.Column('ordinal', sa.Integer, nullable=False),
        sa.Column('below', sa.Float, nullable=True),
        sa.Column('phrase', sa.Text, nullable=True),
        sa.Column('meta', postgresql.JSONB, nullable=True),
        sa.UniqueConstraint('game_id', 'table_name', 'ordinal', name='uq_nl_band'),
        schema='mind',
    )
    op.create_table(
        'nl_thresholds',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('game_id', sa.String(120), nullable=False),
        sa.Column('key', sa.String(120), nullable=False),
        sa.Column('value', sa.Float, nullable=False),
        sa.UniqueConstraint('game_id', 'key', name='uq_nl_threshold'),
        schema='mind',
    )
    op.create_table(
        'nl_phrase_lists',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('game_id', sa.String(120), nullable=False),
        sa.Column('key', sa.String(120), nullable=False),
        sa.Column('ordinal', sa.Integer, nullable=False),
        sa.Column('phrase', sa.Text, nullable=False),
        sa.UniqueConstraint('game_id', 'key', 'ordinal', name='uq_nl_phrase'),
        schema='mind',
    )
    op.create_table(
        'facets',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('game_id', sa.String(120), nullable=False),
        sa.Column('event_type', sa.String(60), nullable=False),
        sa.Column('field_path', sa.String(120), nullable=False),
        sa.Column('unit', sa.String(30), nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.UniqueConstraint('game_id', 'event_type', 'field_path', name='uq_facet'),
        schema='mind',
    )
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
