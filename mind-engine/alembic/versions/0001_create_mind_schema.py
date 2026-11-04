"""create mind schema

Revision ID: 0001
Revises:
Create Date: 2026-09-27

The `mind` schema is the Mind Engine's persistence boundary: every table this
layer owns (episodes, memories, beliefs, brains, nl_* config) lands here and
nowhere else.
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.execute('CREATE SCHEMA IF NOT EXISTS mind')


def downgrade():
    # Never dropped automatically: mind.alembic_version lives inside this
    # schema, so dropping it would orphan Alembic's own bookkeeping. Teardown
    # is a deliberate manual step: DROP SCHEMA mind CASCADE.
    pass
