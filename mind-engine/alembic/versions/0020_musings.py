"""musings — the authored inner voice leaves the belief tables

Revision ID: 0020
Revises: 0019
Create Date: 2026-11-04

#55: a Musing (CONTEXT.md · Musing) is a line of the character's inner
voice — flavour for the narration, never evidence. No confidence, no
status, no facets; Reflection never touches it. The voice lines have
lived inside beliefs since 0017 (every pack row without a Subject):
they get their own tables now.

  1. mind.mold_musings — mold_id, statement, tags. Starter rows with no
     subject (the voice lines; Attitudes always carry one) move out of
     mind.mold_starter_beliefs.
  2. mind.musings — mu_*, game/character, statement, tags, origin,
     formed_episode. Living seed beliefs with no subject move out of
     mind.beliefs — including ones a life already touched: a voice line
     whose confidence drifted is still a voice line, not a Belief.

Downgrade re-inserts the moved rows as seed beliefs (kind 'self',
confidence 0.6 — the pack shape they carried at 0017). Boosts the three
pack lines once carried are not restored.
"""
import json
import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision = '0020'
down_revision = '0019'
branch_labels = None
depends_on = None

# A facet-less row: Subject absent or empty means there was never a
# proposition about something — just a voice line.
_NO_SUBJECT = "(subject IS NULL OR subject = '[]'::jsonb)"


def upgrade():
    op.create_table(
        'mold_musings',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            'mold_id', sa.Integer,
            sa.ForeignKey('mind.brain_molds.id', ondelete='CASCADE'),
            nullable=False),
        sa.Column('statement', sa.Text, nullable=False),
        sa.Column('tags', JSONB, nullable=False, server_default='[]'),
        schema='mind',
    )
    op.create_table(
        'musings',
        sa.Column('id', sa.String(40), primary_key=True),
        sa.Column('game_id', sa.String(120), nullable=False),
        sa.Column('character_id', sa.String(120), nullable=False),
        sa.Column('statement', sa.Text, nullable=False),
        sa.Column('tags', JSONB, nullable=False, server_default='[]'),
        sa.Column('origin', sa.String(30), nullable=False,
                  server_default='seed'),
        sa.Column('formed_episode', sa.Integer, nullable=True),
        schema='mind',
    )

    bind = op.get_bind()

    # Mold rows: every facet-less starter belief is a voice line.
    bind.execute(
        sa.text(
            f'INSERT INTO mind.mold_musings (mold_id, statement, tags) '
            f'SELECT mold_id, statement, tags '
            f'FROM mind.mold_starter_beliefs WHERE {_NO_SUBJECT}'
        )
    )
    bind.execute(
        sa.text(
            f'DELETE FROM mind.mold_starter_beliefs WHERE {_NO_SUBJECT}'
        )
    )

    # Living rows: seed beliefs without a Subject are the cloned voice.
    # Learned/lived beliefs (origin <> 'seed') stay, whatever their
    # shape — they carry evidence, they are propositions.
    moved = bind.execute(
        sa.text(
            'SELECT game_id, character_id, statement, tags, origin, '
            'formed_episode FROM mind.beliefs '
            f"WHERE origin = 'seed' AND {_NO_SUBJECT}"
        )
    ).fetchall()
    for game_id, character_id, statement, tags, origin, ep in moved:
        bind.execute(
            sa.text(
                'INSERT INTO mind.musings '
                '(id, game_id, character_id, statement, tags, origin, '
                'formed_episode) VALUES '
                '(:i, :g, :c, :s, CAST(:tags AS jsonb), :o, :e)'
            ),
            {
                'i': f'mu_{uuid.uuid4().hex}',
                'g': game_id, 'c': character_id, 's': statement,
                'tags': json.dumps(tags or []), 'o': origin, 'e': ep,
            },
        )
    bind.execute(
        sa.text(
            f"DELETE FROM mind.beliefs "
            f"WHERE origin = 'seed' AND {_NO_SUBJECT}"
        )
    )


def downgrade():
    bind = op.get_bind()

    for game_id, character_id, statement, tags, origin, ep in (
        bind.execute(
            sa.text(
                'SELECT game_id, character_id, statement, tags, origin, '
                'formed_episode FROM mind.musings'
            )
        ).fetchall()
    ):
        bind.execute(
            sa.text(
                'INSERT INTO mind.beliefs '
                '(id, game_id, character_id, kind, statement, '
                'confidence, tags, evidence, origin, status, horizon, '
                'formed_episode) VALUES '
                "(:i, :g, :c, 'self', :s, 0.6, CAST(:tags AS jsonb), "
                "'[]'::jsonb, :o, 'active', 'enduring', :e)"
            ),
            {
                'i': f'bl_{uuid.uuid4().hex}',
                'g': game_id, 'c': character_id, 's': statement,
                'tags': json.dumps(tags or []), 'o': origin, 'e': ep,
            },
        )
    bind.execute(
        sa.text(
            'INSERT INTO mind.mold_starter_beliefs '
            "(mold_id, kind, statement, confidence, tags) "
            "SELECT mold_id, 'self', statement, 0.6, tags "
            'FROM mind.mold_musings'
        )
    )

    op.drop_table('musings', schema='mind')
    op.drop_table('mold_musings', schema='mind')
