"""Vector substrate schema — relations, memory imprint, mind state

Revision ID: 0024
Revises: 0023
Create Date: 2026-11-07

ADR 0017 (emotional engine: one vector substrate):

  1. mind.relations — the emotional sediment a Subject leaves: one row
     per (game_id, character_id, subject tag) with affection/trust
     (bipolar), fear/familiarity (unipolar), the derived `feeling`
     word, `origin` (seed|heard|lived) and `last_fed_episode`.
  2. mind.memories — gains the continuum columns: `imprint` (sparse
     feeling vector), `subjects` (Subject tags), `feeling` (lexicon
     word), `depth` (fresh|consolidated|conviction), `mutable`.
  3. mind.minds — gains `temperament`, `personality`, `body` JSONB:
     the resting point, the couplings, and the projected Condition.

Schema only — beliefs and seed content fold into conviction-tier
memories/relations once the engine reads them (migrating earlier
would let retrieval double-read them as ordinary memories).
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = '0024'
down_revision = '0023'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'relations',
        sa.Column('id', sa.String(40), primary_key=True),
        sa.Column('game_id', sa.String(120), nullable=False),
        sa.Column('character_id', sa.String(120), nullable=False),
        sa.Column('subject', sa.String(160), nullable=False),
        sa.Column('affection', sa.Float, nullable=False, server_default='0'),
        sa.Column('trust', sa.Float, nullable=False, server_default='0'),
        sa.Column('fear', sa.Float, nullable=False, server_default='0'),
        sa.Column('familiarity', sa.Float, nullable=False, server_default='0'),
        sa.Column('feeling', sa.String(80), nullable=True),
        sa.Column('origin', sa.String(20), nullable=False,
                  server_default='lived'),
        sa.Column('last_fed_episode', sa.Integer, nullable=True),
        sa.UniqueConstraint(
            'game_id', 'character_id', 'subject', name='uq_relation_subject'
        ),
        schema='mind',
    )
    op.create_index(
        'ix_relations_character', 'relations', ['character_id'],
        schema='mind',
    )

    for col in (
        sa.Column('imprint', JSONB, nullable=True),
        sa.Column('subjects', JSONB, nullable=True),
        sa.Column('feeling', sa.String(60), nullable=True),
        sa.Column('depth', sa.String(20), nullable=True),
        sa.Column('mutable', sa.Boolean, nullable=True),
    ):
        op.add_column('memories', col, schema='mind')

    for col in ('temperament', 'personality', 'body'):
        op.add_column(
            'minds',
            sa.Column(col, JSONB, nullable=False, server_default='{}'),
            schema='mind',
        )


def downgrade():
    for col in ('temperament', 'personality', 'body'):
        op.drop_column('minds', col, schema='mind')
    for col in ('imprint', 'subjects', 'feeling', 'depth', 'mutable'):
        op.drop_column('memories', col, schema='mind')
    op.drop_index(
        'ix_relations_character', 'relations', schema='mind'
    )
    op.drop_table('relations', schema='mind')
