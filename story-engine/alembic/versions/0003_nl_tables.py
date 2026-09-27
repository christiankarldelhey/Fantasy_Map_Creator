"""create mind.nl_bands, nl_thresholds, nl_phrase_lists, facets

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-28

The natural-language layer becomes data: one editable pack per game_id.
nl_bands below NULL = catch-all; meta jsonb carries 'above_m'/'phrases' for
descending and multi-variant bands. Facets is the bandable-fields registry
for admin autocomplete and the NL tester.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade():
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


def downgrade():
    for table in ('facets', 'nl_phrase_lists', 'nl_thresholds', 'nl_bands'):
        op.drop_table(table, schema='mind')
