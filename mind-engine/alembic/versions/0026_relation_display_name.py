"""relations.display_name — the subject as the host worded it

Revision ID: 0026
Revises: 0025
Create Date: 2026-11-26

ADR 0017: the slug is identity; the display name is how it is said.
Narration renders 'The Prancing Pony', not 'prancing_pony' — and a
humanized slug can misread ('prancing pony' the animal vs the inn).
"""
import sqlalchemy as sa
from alembic import op

revision = '0026'
down_revision = '0025'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'relations',
        sa.Column('display_name', sa.String(160), nullable=True),
        schema='mind',
    )


def downgrade():
    op.drop_column('relations', 'display_name', schema='mind')
