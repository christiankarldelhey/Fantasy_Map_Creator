"""Semantics pack + preset leans/personality

Revision ID: 0025
Revises: 0024
Create Date: 2026-11-08

ADR 0017 (emotional engine: one vector substrate):

  1. mind.semantics — the game's declared meaning for a tag pattern:
     key -> sparse relation-dim delta + contact weight + acute body
     hit. The built-in DEFAULT_SEMANTICS pack ships in code; rows here
     override or extend it per game, like Detectors.
  2. mind.preset_leans — a preset's authored disposition toward a
     subject (the full vector, e.g. orcs feared AND hated); seeds a
     Relation row at provisioning.
  3. mind.mind_presets — gains `temperament` and `personality` JSONB:
     the authored resting point and couplings cloned into the mind.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = '0025'
down_revision = '0024'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'semantics',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('game_id', sa.String(120), nullable=False),
        sa.Column('key', sa.String(160), nullable=False),
        sa.Column('delta', JSONB, nullable=False, server_default='{}'),
        sa.Column('weight', sa.Float, nullable=True),
        sa.Column('body', JSONB, nullable=True),
        sa.Column('enabled', sa.Boolean, nullable=False,
                  server_default='true'),
        sa.UniqueConstraint('game_id', 'key', name='uq_semantic'),
        schema='mind',
    )
    op.create_table(
        'preset_leans',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('preset_id', sa.Integer,
                  sa.ForeignKey('mind.mind_presets.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('subject', sa.String(160), nullable=False),
        sa.Column('affection', sa.Float, nullable=False, server_default='0'),
        sa.Column('trust', sa.Float, nullable=False, server_default='0'),
        sa.Column('fear', sa.Float, nullable=False, server_default='0'),
        sa.Column('familiarity', sa.Float, nullable=False, server_default='0'),
        sa.UniqueConstraint('preset_id', 'subject', name='uq_preset_lean'),
        schema='mind',
    )
    for col in ('temperament', 'personality'):
        op.add_column(
            'mind_presets',
            sa.Column(col, JSONB, nullable=True),
            schema='mind',
        )


def downgrade():
    for col in ('temperament', 'personality'):
        op.drop_column('mind_presets', col, schema='mind')
    op.drop_table('preset_leans', schema='mind')
    op.drop_table('semantics', schema='mind')
