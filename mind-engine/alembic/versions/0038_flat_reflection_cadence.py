"""retire reflectiveness — flat reflection cadence

Revision ID: 0038
Revises: 0037
Create Date: 2026-12-02

  1. `reflection_every` becomes 3 on every living mind — the cadence is
     the wiring's schedule, the same for all minds (stored wirings
     carried the old 5 frozen at clone time, so the default change
     alone never reached them).
  2. `reflectiveness` is stripped from personality dicts (minds and
     presets) — a retired spec reads cleaner absent than ignored. The
     couplings that remain (moodiness, resistance, choice_variability)
     all bend experience, never engine plumbing.
"""
from alembic import op

revision = '0038'
down_revision = '0037'
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "UPDATE mind.minds SET wiring = "
        "jsonb_set(wiring, '{reflection_every}', '3') "
        "WHERE wiring ? 'reflection_every'"
    )
    op.execute(
        "UPDATE mind.minds SET personality = personality - 'reflectiveness' "
        "WHERE personality ? 'reflectiveness'"
    )
    op.execute(
        "UPDATE mind.mind_presets "
        "SET personality = personality - 'reflectiveness' "
        "WHERE personality ? 'reflectiveness'"
    )


def downgrade():
    # The reflectiveness values themselves are unrecoverable — the spec
    # is retired, so only the cadence needs a way back.
    op.execute(
        "UPDATE mind.minds SET wiring = "
        "jsonb_set(wiring, '{reflection_every}', '5') "
        "WHERE wiring ? 'reflection_every'"
    )
