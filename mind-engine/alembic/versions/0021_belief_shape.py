"""belief shape — confidence becomes strength (0–5); pull/habit dropped

Revision ID: 0021
Revises: 0020
Create Date: 2026-11-06

#58: a Belief is a single shape — statement, strength, kind, and the
optional facets subject/stance/source. `confidence` (0–1) was the same
idea on a technical scale; `strength` is the domain word on the human
one (0–5, a new belief starts ~2). Pull and Habit were stored, copied
and serialized — and read by nothing. They leave the table the way
Latent already left the glossary: no mechanism, no concept.

  1. mind.beliefs + mind.mold_starter_beliefs — rename confidence to
     strength and rescale it ×5 (a 0.6 conviction reads as 3); drop the
     pull and habit columns.
  2. Wiring keys follow the word: belief_confidence_decay becomes
     belief_strength_decay, belief_boost_min_confidence becomes
     belief_boost_min_strength — in mind.mold_wiring rows and inside the
     snapshot in brains.wiring. Values on the old 0–1 scale
     (weaken_below, reinforce/contradict deltas, trauma_min, boost
     floor) rescale ×5; multiplicative decays keep their value.

Downgrade restores the column name, the 0–1 scale, the wiring keys, and
adds the columns back (the pull/habit payloads themselves are gone —
they were never read).
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = '0021'
down_revision = '0020'
branch_labels = None
depends_on = None

SCHEMA = 'mind'

# Wiring keys that carry a 0–1 strength value → rescale ×5.
RESCALE_KEYS = (
    'belief_weaken_below',
    'belief_reinforce_delta',
    'belief_contradict_delta',
    'belief_trauma_min',
    'belief_boost_min_confidence',  # renamed below; rescale on old name
)
RENAME_KEYS = {
    'belief_confidence_decay': 'belief_strength_decay',
    'belief_boost_min_confidence': 'belief_boost_min_strength',
}


def _wiring_case(when_then):
    """CASE key WHEN 'a' THEN 'b' ... ELSE key END"""
    arms = ' '.join(
        f"WHEN key = '{old}' THEN '{new}'" for old, new in when_then.items()
    )
    return f"CASE {arms} ELSE key END"


def _value_case(keys, factor):
    """Multiply the numeric value for the keys on the rescaled scale."""
    keys_sql = ', '.join(f"'{k}'" for k in keys)
    return (
        f"CASE WHEN key IN ({keys_sql}) "
        f"THEN to_jsonb((value #>> '{{}}')::float * {factor}) "
        f"ELSE value END"
    )


def _rewrite_brains_wiring(key_map, factor_keys, factor):
    key_case = _wiring_case(key_map)
    value_case = _value_case(factor_keys, factor)
    op.execute(f"""
        UPDATE {SCHEMA}.brains b SET wiring = (
            SELECT jsonb_object_agg({key_case}, {value_case})
            FROM jsonb_each(b.wiring)
        )
    """)


def upgrade():
    for table in ('beliefs', 'mold_starter_beliefs'):
        op.alter_column(
            table, 'confidence', new_column_name='strength', schema=SCHEMA
        )
        op.execute(
            f"UPDATE {SCHEMA}.{table} SET strength = LEAST(5.0, strength * 5)"
        )
        op.drop_column(table, 'pull', schema=SCHEMA)
        op.drop_column(table, 'habit', schema=SCHEMA)

    # Mold wiring rows: rename keys, then rescale the ones on a 0–1 scale.
    for old, new in RENAME_KEYS.items():
        op.execute(
            f"UPDATE {SCHEMA}.mold_wiring SET key = '{new}' WHERE key = '{old}'"
        )
    rescaled = tuple(
        RENAME_KEYS.get(k, k) for k in RESCALE_KEYS
    )
    keys_sql = ', '.join(f"'{k}'" for k in rescaled)
    op.execute(
        f"UPDATE {SCHEMA}.mold_wiring SET value = LEAST(5.0, value * 5) "
        f"WHERE key IN ({keys_sql})"
    )

    _rewrite_brains_wiring(RENAME_KEYS, rescaled, 5)


def downgrade():
    reverse_rename = {new: old for old, new in RENAME_KEYS.items()}
    _rewrite_brains_wiring(
        reverse_rename,
        tuple(RENAME_KEYS.get(k, k) for k in RESCALE_KEYS),
        0.2,
    )
    rescaled = tuple(RENAME_KEYS.get(k, k) for k in RESCALE_KEYS)
    keys_sql = ', '.join(f"'{k}'" for k in rescaled)
    op.execute(
        f"UPDATE {SCHEMA}.mold_wiring SET value = value * 0.2 "
        f"WHERE key IN ({keys_sql})"
    )
    for old, new in RENAME_KEYS.items():
        op.execute(
            f"UPDATE {SCHEMA}.mold_wiring SET key = '{old}' WHERE key = '{new}'"
        )

    for table in ('beliefs', 'mold_starter_beliefs'):
        op.add_column(
            table, sa.Column('pull', JSONB(), nullable=True), schema=SCHEMA,
        )
        op.add_column(
            table, sa.Column('habit', JSONB(), nullable=True), schema=SCHEMA,
        )
        op.execute(f"UPDATE {SCHEMA}.{table} SET strength = strength * 0.2")
        op.alter_column(
            table, 'strength', new_column_name='confidence', schema=SCHEMA
        )
