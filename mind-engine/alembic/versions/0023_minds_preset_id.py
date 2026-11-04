"""Minds preset id — fix-up for 0022 (#57).

0022 renamed the mold_id column on the four preset child tables and
mold_slug on minds, but missed minds.mold_id itself. Rename it and the
primary-key constraint names that kept the old vocabulary after the
table renames.
"""

from alembic import op

revision = '0023'
down_revision = '0022'
branch_labels = None
depends_on = None

_PKEYS = [
    ('brains_pkey', 'minds_pkey', 'minds'),
    ('brain_molds_pkey', 'mind_presets_pkey', 'mind_presets'),
    ('mold_theme_weights_pkey', 'preset_theme_weights_pkey', 'preset_theme_weights'),
    ('mold_wiring_pkey', 'preset_wiring_pkey', 'preset_wiring'),
    ('mold_starter_beliefs_pkey', 'preset_starter_beliefs_pkey', 'preset_starter_beliefs'),
    ('mold_musings_pkey', 'preset_musings_pkey', 'preset_musings'),
]


def upgrade():
    op.alter_column('minds', 'mold_id', new_column_name='preset_id',
                    schema='mind')
    for old, new, table in _PKEYS:
        op.execute(
            f'DO $$ BEGIN '
            f'IF EXISTS (SELECT 1 FROM pg_constraint '
            f"WHERE conname = '{old}') THEN "
            f'ALTER TABLE mind.{table} RENAME CONSTRAINT {old} TO {new}; '
            f'END IF; END $$'
        )


def downgrade():
    for old, new, table in _PKEYS:
        op.execute(
            f'DO $$ BEGIN '
            f'IF EXISTS (SELECT 1 FROM pg_constraint '
            f"WHERE conname = '{new}') THEN "
            f'ALTER TABLE mind.{table} RENAME CONSTRAINT {new} TO {old}; '
            f'END IF; END $$'
        )
    op.alter_column('minds', 'preset_id', new_column_name='mold_id',
                    schema='mind')
