"""relations.display_name — drop rows that stored the tag as the name

Revision ID: 0028
Revises: 0027

A display_name carrying the tag separator ('tag:npc:orc-scout',
'region:South Downs') was never a name — it is the subject tag itself,
leaked in through a host field. feed() now refuses such values; this
NULLs the polluted rows so the Lens falls back to humanizing the slug
('orc scout', 'South Downs') instead of reading raw bookkeeping aloud.
"""
from alembic import op

revision = '0028'
down_revision = '0027'
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "UPDATE mind.relations SET display_name = NULL "
        "WHERE position(':' in display_name) > 0"
    )


def downgrade():
    # The dropped values were not names — nothing worth restoring.
    pass
