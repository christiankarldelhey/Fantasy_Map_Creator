"""attention converges: theme_weights dies (#165)

Revision ID: 0032
Revises: 0031

The theme_weights channel is dead (ADR 0017): what a tag means lives in
the semantics pack, and what this mind watches lives in its Relations —
attention_weights already carried that load through effective_theme_
weights. This drops the preset/mind theme_weights storage and renames
the one salience knob it fed, w_theme -> w_attention, inside preset
wiring rows and every materialised mind.
"""
import sqlalchemy as sa
from alembic import op

revision = '0032'
down_revision = '0031'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_table('preset_theme_weights', schema='mind')
    op.drop_column('minds', 'theme_weights', schema='mind')

    bind = op.get_bind()
    # preset_wiring rows carry (preset_id, key, value).
    bind.execute(
        sa.text(
            "UPDATE mind.preset_wiring SET key = 'w_attention' "
            "WHERE key = 'w_theme'"
        )
    )
    bind.execute(
        sa.text(
            "DELETE FROM mind.preset_wiring "
            "WHERE key = 'belief_boost_min_strength'"
        )
    )
    # Materialised minds: rename the knob inside the wiring JSONB and
    # drop the dead boost floor.
    bind.execute(
        sa.text(
            "UPDATE mind.minds SET wiring = "
            "(wiring - 'w_theme' - 'belief_boost_min_strength') || "
            "jsonb_build_object('w_attention', wiring->'w_theme') "
            "WHERE wiring ? 'w_theme'"
        )
    )
    bind.execute(
        sa.text(
            "UPDATE mind.minds SET wiring = "
            "wiring - 'belief_boost_min_strength' "
            "WHERE wiring ? 'belief_boost_min_strength' "
            "AND NOT wiring ? 'w_theme'"
        )
    )


def downgrade():
    op.add_column(
        'minds',
        sa.Column('theme_weights', sa.dialects.postgresql.JSONB,
                  nullable=False, server_default='{}'),
        schema='mind',
    )
    op.create_table(
        'preset_theme_weights',
        sa.Column('id', sa.Integer, autoincrement=True, primary_key=True),
        sa.Column('preset_id', sa.Integer,
                  sa.ForeignKey('mind.mind_presets.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('key', sa.String(120), nullable=False),
        sa.Column('weight', sa.Float, nullable=False),
        sa.UniqueConstraint('preset_id', 'key', name='uq_preset_weight'),
        schema='mind',
    )
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "UPDATE mind.preset_wiring SET key = 'w_theme' "
            "WHERE key = 'w_attention'"
        )
    )
    bind.execute(
        sa.text(
            "UPDATE mind.minds SET wiring = "
            "(wiring - 'w_attention') || "
            "jsonb_build_object('w_theme', wiring->'w_attention') "
            "WHERE wiring ? 'w_attention'"
        )
    )
