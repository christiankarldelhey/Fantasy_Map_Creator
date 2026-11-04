"""create mind.brain_molds (+ child tables), mind.brains, mind.beliefs

Revision ID: 0004
Revises: 0003
Create Date: 2026-09-28

Clone-and-own: molds are archetypes whose config lives in child tables
(editable field by field); brains are materialised copies that diverge by
content only. Seeds the 'default' mold for middle_earth with the guide
wiring values from spec §7/§8.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None

DEFAULT_WIRING = {
    'decay': 0.85, 'forget_threshold': 0.2, 'fixed_threshold': 0.8,
    'w_severity': 0.35, 'w_novelty': 0.25, 'w_emotional': 0.15,
    'w_theme': 0.15, 'w_perception': 0.10,
    'alpha': 0.4, 'beta': 0.4, 'gamma': 0.2,
    'lambda_recency': 0.3, 'retrieval_top_k': 5, 'evocations_to_fix': 3,
}


def upgrade():
    op.create_table(
        'brain_molds',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('game_id', sa.String(120), nullable=False),
        sa.Column('slug', sa.String(60), nullable=False),
        sa.Column('name', sa.String(160), nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('game_id', 'slug', name='uq_brain_mold'),
        schema='mind',
    )
    op.create_table(
        'mold_theme_weights',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('mold_id', sa.Integer,
                  sa.ForeignKey('mind.brain_molds.id', ondelete='CASCADE'), nullable=False),
        sa.Column('key', sa.String(120), nullable=False),
        sa.Column('weight', sa.Float, nullable=False),
        sa.UniqueConstraint('mold_id', 'key', name='uq_mold_weight'),
        schema='mind',
    )
    op.create_table(
        'mold_wiring',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('mold_id', sa.Integer,
                  sa.ForeignKey('mind.brain_molds.id', ondelete='CASCADE'), nullable=False),
        sa.Column('key', sa.String(60), nullable=False),
        sa.Column('value', sa.Float, nullable=False),
        sa.UniqueConstraint('mold_id', 'key', name='uq_mold_wiring'),
        schema='mind',
    )
    op.create_table(
        'mold_starter_beliefs',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('mold_id', sa.Integer,
                  sa.ForeignKey('mind.brain_molds.id', ondelete='CASCADE'), nullable=False),
        sa.Column('kind', sa.String(30), nullable=False),
        sa.Column('statement', sa.Text, nullable=False),
        sa.Column('confidence', sa.Float, nullable=False, server_default='0.5'),
        schema='mind',
    )
    op.create_table(
        'brains',
        sa.Column('id', sa.String(40), primary_key=True),
        sa.Column('game_id', sa.String(120), nullable=False),
        sa.Column('character_id', sa.String(120), nullable=False),
        sa.Column('mold_id', sa.Integer, nullable=True),
        sa.Column('mold_slug', sa.String(60), nullable=False),
        sa.Column('theme_weights', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('wiring', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('mood', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('counters', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('game_id', 'character_id', name='uq_brain_character'),
        schema='mind',
    )
    op.create_table(
        'beliefs',
        sa.Column('id', sa.String(40), primary_key=True),
        sa.Column('game_id', sa.String(120), nullable=False),
        sa.Column('character_id', sa.String(120), nullable=False),
        sa.Column('kind', sa.String(30), nullable=False),
        sa.Column('statement', sa.Text, nullable=False),
        sa.Column('confidence', sa.Float, nullable=False, server_default='0.5'),
        sa.Column('evidence', postgresql.JSONB, nullable=False, server_default='[]'),
        sa.Column('origin', sa.String(30), nullable=False, server_default='experience'),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('boosts', postgresql.JSONB, nullable=True),
        sa.Column('formed_episode', sa.Integer, nullable=True),
        sa.Column('updated_episode', sa.Integer, nullable=True),
        schema='mind',
    )

    # Seed the 'default' mold for middle_earth with the guide wiring.
    molds = sa.table(
        'brain_molds',
        sa.column('id', sa.Integer), sa.column('game_id', sa.String),
        sa.column('slug', sa.String), sa.column('name', sa.String),
        sa.column('description', sa.Text), schema='mind',
    )
    wiring = sa.table(
        'mold_wiring',
        sa.column('mold_id', sa.Integer), sa.column('key', sa.String),
        sa.column('value', sa.Float), schema='mind',
    )
    op.execute(
        molds.insert().values(
            game_id='middle_earth', slug='default', name='Default mind',
            description='Neutral archetype cloned for every new character.',
        )
    )
    mold_id = op.get_bind().execute(
        sa.text("SELECT id FROM mind.brain_molds WHERE game_id='middle_earth' AND slug='default'")
    ).scalar()
    op.bulk_insert(
        wiring,
        [{'mold_id': mold_id, 'key': k, 'value': v} for k, v in DEFAULT_WIRING.items()],
    )


def downgrade():
    for table in ('beliefs', 'brains', 'mold_starter_beliefs', 'mold_wiring',
                  'mold_theme_weights', 'brain_molds'):
        op.drop_table(table, schema='mind')
