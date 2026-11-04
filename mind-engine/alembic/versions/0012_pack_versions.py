"""create mind.pack_versions

Revision ID: 0012
Revises: 0011
Create Date: 2026-10-02

B10: world-pack versioning (PRD §9.2). The live pack keeps living under
`game_id`; drafts are copies under `<game_id>@draft-<version>`; promote
swaps them atomically and freezes the outgoing live content into
`snapshot` — the rollback record. Episode config_snapshot records the
active version at open.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0012'
down_revision = '0011'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'pack_versions',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('game_id', sa.String(120), nullable=False),
        sa.Column('version', sa.Integer, nullable=False),
        sa.Column('status', sa.String(20), nullable=False,
                  server_default='draft'),
        sa.Column('namespace', sa.String(120), nullable=True),
        sa.Column('snapshot', postgresql.JSONB, nullable=True),
        sa.Column('note', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.UniqueConstraint('game_id', 'version', name='uq_pack_version'),
        schema='mind',
    )
    op.create_index(
        'ix_pack_versions_game_status', 'pack_versions',
        ['game_id', 'status'], schema='mind',
    )


def downgrade():
    op.drop_index(
        'ix_pack_versions_game_status', 'pack_versions', schema='mind'
    )
    op.drop_table('pack_versions', schema='mind')
