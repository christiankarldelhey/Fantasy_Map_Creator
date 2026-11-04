"""Mind names — Brain/Mold vocabulary becomes Mind/Preset (#57).

Renames the tables and columns that still carry the old vocabulary to
the settled one (CONTEXT.md): the lived interior is the *Mind*, the
ready-made way of thinking it clones from is its *Mind preset*.

    brains                -> minds
    brain_molds           -> mind_presets
    mold_theme_weights    -> preset_theme_weights
    mold_wiring           -> preset_wiring
    mold_starter_beliefs  -> preset_starter_beliefs
    mold_musings          -> preset_musings
    *.mold_id             -> *.preset_id
    minds.mold_slug       -> minds.preset_slug

Named constraints follow the same vocabulary. Content moves untouched —
this is naming only.
"""

from alembic import op

revision = '0022'
down_revision = '0021'
branch_labels = None
depends_on = None

_TABLES = [
    ('brains', 'minds'),
    ('brain_molds', 'mind_presets'),
    ('mold_theme_weights', 'preset_theme_weights'),
    ('mold_wiring', 'preset_wiring'),
    ('mold_starter_beliefs', 'preset_starter_beliefs'),
    ('mold_musings', 'preset_musings'),
]

# child tables carrying the mold_id column
_CHILDREN = [
    'preset_theme_weights', 'preset_wiring',
    'preset_starter_beliefs', 'preset_musings',
]

_CONSTRAINTS = [
    ('uq_brain_mold', 'uq_mind_preset', 'mind_presets'),
    ('uq_mold_weight', 'uq_preset_weight', 'preset_theme_weights'),
    ('uq_mold_wiring', 'uq_preset_wiring', 'preset_wiring'),
    ('uq_brain_character', 'uq_mind_character', 'minds'),
]

# auto-generated FK names left stale by the renames
_FKS = [
    ('mold_theme_weights_mold_id_fkey', 'preset_theme_weights_preset_id_fkey', 'preset_theme_weights'),
    ('mold_wiring_mold_id_fkey', 'preset_wiring_preset_id_fkey', 'preset_wiring'),
    ('mold_starter_beliefs_mold_id_fkey', 'preset_starter_beliefs_preset_id_fkey', 'preset_starter_beliefs'),
    ('mold_musings_mold_id_fkey', 'preset_musings_preset_id_fkey', 'preset_musings'),
]


def upgrade():
    for old, new in _TABLES:
        op.rename_table(old, new, schema='mind')
    for table in _CHILDREN:
        op.alter_column(table, 'mold_id', new_column_name='preset_id',
                        schema='mind')
    op.alter_column('minds', 'mold_slug', new_column_name='preset_slug',
                    schema='mind')
    for old, new, table in _CONSTRAINTS:
        op.execute(
            f'DO $$ BEGIN '
            f'IF EXISTS (SELECT 1 FROM pg_constraint '
            f"WHERE conname = '{old}') THEN "
            f'ALTER TABLE mind.{table} RENAME CONSTRAINT {old} TO {new}; '
            f'END IF; END $$'
        )
    for old, new, table in _FKS:
        op.execute(
            f'DO $$ BEGIN '
            f'IF EXISTS (SELECT 1 FROM pg_constraint '
            f"WHERE conname = '{old}') THEN "
            f'ALTER TABLE mind.{table} RENAME CONSTRAINT {old} TO {new}; '
            f'END IF; END $$'
        )


def downgrade():
    for old, new in _FKS:
        op.execute(
            f'DO $$ BEGIN '
            f'IF EXISTS (SELECT 1 FROM pg_constraint '
            f"WHERE conname = '{new}') THEN "
            f'ALTER TABLE mind.{table} RENAME CONSTRAINT {new} TO {old}; '
            f'END IF; END $$'
        )
    for old, new, table in _CONSTRAINTS:
        op.execute(
            f'DO $$ BEGIN '
            f'IF EXISTS (SELECT 1 FROM pg_constraint '
            f"WHERE conname = '{new}') THEN "
            f'ALTER TABLE mind.{table} RENAME CONSTRAINT {new} TO {old}; '
            f'END IF; END $$'
        )
    op.alter_column('minds', 'preset_slug', new_column_name='mold_slug',
                    schema='mind')
    for table in _CHILDREN:
        op.alter_column(table, 'preset_id', new_column_name='mold_id',
                        schema='mind')
    for old, new in _TABLES:
        op.rename_table(new, old, schema='mind')
