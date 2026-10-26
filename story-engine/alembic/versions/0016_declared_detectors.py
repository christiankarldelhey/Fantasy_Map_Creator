"""declared detectors — mind.detectors (ADR 0005)

Revision ID: 0016
Revises: 0015
Create Date: 2026-10-24

The mind stops reading snapshot fields by name. Every threshold that used
to live in checks.py/needs.py — need triggers, perception-check state
modifiers, the altered-state shadow floor — is now a Detector row or a
detectors.DEFAULT_DETECTORS entry, evaluated by a generic engine. A second
host declares its own vitals (oxygen, sanity, ...) as rows; the engine
never learned a field name.

This migration:
  1. creates mind.detectors (kind: need | check_mod | altered);
  2. seeds the built-in pack as editable rows for game 'middle_earth';
  3. moves the migrated wiring keys out of brains.wiring / mold_wiring —
     values equal to the old default are dropped (they were materialized
     copies), non-default values are translated to 'detector.<key>.<param>'
     so real per-brain tuning survives;
  4. seeds 'mind.focus_excluded' phrase rows for middle_earth (the frame
     types the old _NEVER_FOCUS hardcoded).
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0016'
down_revision = '0015'
branch_labels = None
depends_on = None

GAME_ID = 'middle_earth'

DETECTORS = [
    # (kind, key, field, op, value, scale, group_key, ordinal, mod,
    #  urgency_base, urgency_per, urgency_from, urgency_map)
    ('need', 'hunger', 'days_without_food', '>=', '1.0', None, None, 0,
     None, 0.3, 0.2, None, None),
    ('need', 'thirst', 'days_without_water', '>=', '1.0', None, None, 0,
     None, 0.5, 0.25, None, None),
    ('need', 'exhaustion', 'energy', '<=', '0.4', 100.0, None, 0,
     None, 0.5, 1.0, 'distance', None),
    ('need', 'unrest', 'shadow', '>=', '0.25', 100.0, None, 0,
     None, 0.3, 0.5, None, None),
    ('need', 'wound', 'wounded', 'in', '["wounded", "badly_wounded"]', None,
     None, 0, None, None, None, None,
     '{"wounded": 0.35, "badly_wounded": 0.65}'),
    ('check_mod', 'energy_spent', 'energy', '<', '0.35', 100.0, 'energy', 0,
     -2.0, None, None, None, None),
    ('check_mod', 'energy_worn', 'energy', '<', '0.6', 100.0, 'energy', 1,
     -1.0, None, None, None, None),
    ('check_mod', 'shadow_burdened', 'shadow', '>=', '0.5', 100.0, 'shadow',
     0, -2.0, None, None, None, None),
    ('check_mod', 'shadow_shadowed', 'shadow', '>=', '0.25', 100.0, 'shadow',
     1, -1.0, None, None, None, None),
    ('check_mod', 'wounded', 'conditions', 'contains', '"wounded"', None,
     'wounded', 0, -1.0, None, None, None, None),
    ('altered', 'shadow_altered', 'shadow', '>=', '0.25', 100.0, None, 0,
     None, None, None, None, None),
]

# (old wiring key, detector.<key>.<param>, old default)
LEGACY_KEYS = [
    ('need_hunger_days', 'detector.hunger.value', 1.0),
    ('need_thirst_days', 'detector.thirst.value', 1.0),
    ('need_exhaustion_below', 'detector.exhaustion.value', 0.4),
    ('need_unrest_shadow_min', 'detector.unrest.value', 0.25),
    ('need_wound_urgency', 'detector.wound.urgency_map.wounded', 0.35),
    ('need_badly_wound_urgency', 'detector.wound.urgency_map.badly_wounded',
     0.65),
    ('energy_worn_below', 'detector.energy_worn.value', 0.6),
    ('energy_spent_below', 'detector.energy_spent.value', 0.35),
    ('mod_energy_worn', 'detector.energy_worn.mod', -1.0),
    ('mod_energy_spent', 'detector.energy_spent.mod', -2.0),
    ('shadow_shadowed_min', 'detector.shadow_shadowed.value', 0.25),
    ('shadow_burdened_min', 'detector.shadow_burdened.value', 0.5),
    ('mod_shadow_shadowed', 'detector.shadow_shadowed.mod', -1.0),
    ('mod_shadow_burdened', 'detector.shadow_burdened.mod', -2.0),
    ('mod_wounded', 'detector.wounded.mod', -1.0),
    ('misread_shadow_min', 'detector.shadow_altered.value', 0.25),
]


def upgrade():
    op.create_table(
        'detectors',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('game_id', sa.String(120), nullable=False),
        sa.Column('kind', sa.String(20), nullable=False),
        sa.Column('key', sa.String(120), nullable=False),
        sa.Column('field', sa.String(120), nullable=False),
        sa.Column('op', sa.String(10), nullable=False),
        sa.Column('value', postgresql.JSONB, nullable=True),
        sa.Column('scale', sa.Float, nullable=True),
        sa.Column('group_key', sa.String(120), nullable=True),
        sa.Column('ordinal', sa.Integer, nullable=False, server_default='0'),
        sa.Column('mod', sa.Float, nullable=True),
        sa.Column('urgency_base', sa.Float, nullable=True),
        sa.Column('urgency_per', sa.Float, nullable=True),
        sa.Column('urgency_from', sa.String(20), nullable=True),
        sa.Column('urgency_map', postgresql.JSONB, nullable=True),
        sa.Column('need_type', sa.String(30), nullable=False,
                  server_default='physiological'),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('enabled', sa.Boolean, nullable=False, server_default='true'),
        sa.UniqueConstraint('game_id', 'kind', 'key', name='uq_detector'),
        schema='mind',
    )

    for (kind, key, field, op_, value, scale, group_key, ordinal, mod,
         u_base, u_per, u_from, u_map) in DETECTORS:
        op.execute(
            "INSERT INTO mind.detectors (game_id, kind, key, field, op, "
            "value, scale, group_key, ordinal, mod, urgency_base, "
            "urgency_per, urgency_from, urgency_map) VALUES ("
            f"'{GAME_ID}', '{kind}', '{key}', '{field}', '{op_}', "
            f"'{value}'::jsonb, "
            f"{'NULL' if scale is None else scale}, "
            f"{'NULL' if group_key is None else repr(group_key)}, "
            f"{ordinal}, "
            f"{'NULL' if mod is None else mod}, "
            f"{'NULL' if u_base is None else u_base}, "
            f"{'NULL' if u_per is None else u_per}, "
            f"{'NULL' if u_from is None else repr(u_from)}, "
            f"{'NULL' if u_map is None else repr(u_map) + '::jsonb'}"
            ") ON CONFLICT ON CONSTRAINT uq_detector DO NOTHING"
        )

    # Migrated wiring keys leave the materialized brains/molds: defaults
    # drop, real customizations translate to the detector.* namespace.
    for old_key, new_key, default in LEGACY_KEYS:
        op.execute(
            "UPDATE mind.brains SET wiring = "
            f"wiring || jsonb_build_object('{new_key}', wiring->'{old_key}')"
            f" - '{old_key}' "
            f"WHERE wiring ? '{old_key}' "
            f"AND (wiring->>'{old_key}')::float != {default}"
        )
        op.execute(
            f"UPDATE mind.brains SET wiring = wiring - '{old_key}' "
            f"WHERE wiring ? '{old_key}'"
        )
        op.execute(
            "INSERT INTO mind.mold_wiring (mold_id, key, value) "
            f"SELECT mold_id, '{new_key}', value FROM mind.mold_wiring "
            f"WHERE key = '{old_key}' AND value != {default} "
            "ON CONFLICT ON CONSTRAINT uq_mold_wiring "
            "DO UPDATE SET value = EXCLUDED.value"
        )
        op.execute(f"DELETE FROM mind.mold_wiring WHERE key = '{old_key}'")

    # The frame types _NEVER_FOCUS hardcoded become pack content.
    for i, phrase in enumerate(('travel', 'terrain', 'climate')):
        op.execute(
            "INSERT INTO mind.nl_phrase_lists (game_id, key, ordinal, phrase) "
            f"VALUES ('{GAME_ID}', 'mind.focus_excluded', {i}, '{phrase}') "
            "ON CONFLICT ON CONSTRAINT uq_nl_phrase DO NOTHING"
        )


def downgrade():
    op.execute(
        "DELETE FROM mind.nl_phrase_lists "
        "WHERE game_id = 'middle_earth' AND key = 'mind.focus_excluded'"
    )
    for old_key, new_key, _ in LEGACY_KEYS:
        op.execute(
            "UPDATE mind.brains SET wiring = "
            f"wiring || jsonb_build_object('{old_key}', wiring->'{new_key}')"
            f" - '{new_key}' WHERE wiring ? '{new_key}'"
        )
        op.execute(
            "INSERT INTO mind.mold_wiring (mold_id, key, value) "
            f"SELECT mold_id, '{old_key}', value FROM mind.mold_wiring "
            f"WHERE key = '{new_key}' "
            "ON CONFLICT ON CONSTRAINT uq_mold_wiring "
            "DO UPDATE SET value = EXCLUDED.value"
        )
        op.execute(f"DELETE FROM mind.mold_wiring WHERE key = '{new_key}'")
    op.drop_table('detectors', schema='mind')
