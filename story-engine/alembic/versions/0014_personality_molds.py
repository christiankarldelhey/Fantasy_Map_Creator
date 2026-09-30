"""personality molds: celebrian + aranath (C18)

Revision ID: 0014
Revises: 0013
Create Date: 2026-10-07

Each playable character is a person, not an archetype — their nature
carries authored seed beliefs (origin='seed': backstory, exempt from the
evidence rule). The traits that used to fill Celebrian's 1124-char
system_prompt now live here as starter beliefs so the lens invokes them
when the day touches them (rank_beliefs: confidence × tag-overlap),
instead of weighing on every prompt.

Both molds clone 'default''s wiring + theme_weights: nature is shared,
beliefs are the person.
"""
import json

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '0014'
down_revision = '0013'
branch_labels = None
depends_on = None

GAME_ID = 'middle_earth'

MOLDS = [
    {
        'slug': 'celebrian',
        'name': 'Celebrian mind',
        'description': (
            'Noldor exile who refuses the West; she stays to watch the '
            'mortal world fade. Death is her filter.'
        ),
    },
    {
        'slug': 'aranath',
        'name': 'Aranath mind',
        'description': (
            'Ranger of the old north; walks the borders of fallen Arnor '
            'and reads the land by its signs.'
        ),
    },
]

PEOPLE_TAGS = [
    'tag:entity_type:humans', 'tag:entity_type:elves',
    'tag:entity_type:dwarves', 'tag:entity_type:hobbits',
]
HOSTILE_TAGS = [
    'tag:form:attacks', 'tag:form:confronts', 'tag:form:sudden_peril',
    'tag:entity_type:orcs', 'tag:entity_type:undead',
    'tag:entity_type:trolls',
]

STARTER_BELIEFS = {
    'celebrian': [
        ('self', 0.9, [],
         'She will not sail West. She means to be the last witness when '
         'the lights go out.'),
        ('world', 0.8, [],
         'Everything that lives is already half in its grave — she has '
         'buried lovers, friends and whole kingdoms.'),
        ('self', 0.75, [],
         'She is not driven; she is drawn — the way water runs downhill. '
         'She keeps no errand and does not hurry.'),
        ('self', 0.7, PEOPLE_TAGS,
         'She trusts growing things more than people.'),
        ('world', 0.6, PEOPLE_TAGS,
         'Narrow paths force travellers close; that is why friendship is '
         'so often born there.'),
    ],
    'aranath': [
        ('self', 0.85, [],
         'He has spent years walking the borders of fallen Arnor; this '
         'time he walks alone.'),
        ('world', 0.7, [],
         'An old road does not die — it waits for the one who still '
         'remembers it.'),
        ('self', 0.7, HOSTILE_TAGS,
         'After danger passes, gratitude is the sharpest feeling.'),
        ('world', 0.65, [],
         'The forest keeps secrets better than any elven heart.'),
    ],
}


def upgrade():
    bind = op.get_bind()
    default_id = bind.execute(
        sa.text(
            "SELECT id FROM mind.brain_molds "
            "WHERE game_id = :g AND slug = 'default'"
        ),
        {'g': GAME_ID},
    ).scalar()

    for mold in MOLDS:
        # Idempotent: re-running after a failed apply must not 500 on the
        # unique constraint, and must not double-seed beliefs.
        mold_id = bind.execute(
            sa.text(
                'SELECT id FROM mind.brain_molds '
                'WHERE game_id = :g AND slug = :s'
            ),
            {'g': GAME_ID, 's': mold['slug']},
        ).scalar()
        if mold_id is None:
            bind.execute(
                sa.text(
                    'INSERT INTO mind.brain_molds '
                    '(game_id, slug, name, description) '
                    'VALUES (:g, :s, :n, :d)'
                ),
                {
                    'g': GAME_ID, 's': mold['slug'],
                    'n': mold['name'], 'd': mold['description'],
                },
            )
            mold_id = bind.execute(
                sa.text(
                    'SELECT id FROM mind.brain_molds '
                    'WHERE game_id = :g AND slug = :s'
                ),
                {'g': GAME_ID, 's': mold['slug']},
            ).scalar()

        if default_id is not None:
            for table in ('mold_wiring', 'mold_theme_weights'):
                cols = 'key, value' if table == 'mold_wiring' else 'key, weight'
                bind.execute(
                    sa.text(
                        f'INSERT INTO mind.{table} (mold_id, {cols}) '
                        f'SELECT :m, {cols} FROM mind.{table} '
                        f'WHERE mold_id = :d '
                        f'ON CONFLICT DO NOTHING'
                    ),
                    {'m': mold_id, 'd': default_id},
                )

        for kind, confidence, tags, statement in STARTER_BELIEFS[mold['slug']]:
            bind.execute(
                sa.text(
                    'INSERT INTO mind.mold_starter_beliefs '
                    '(mold_id, kind, statement, confidence, tags) '
                    'SELECT :m, :k, :st, :c, CAST(:t AS jsonb) '
                    'WHERE NOT EXISTS ('
                    '  SELECT 1 FROM mind.mold_starter_beliefs '
                    '  WHERE mold_id = :m AND statement = :st'
                    ')'
                ),
                {
                    'm': mold_id, 'k': kind, 'st': statement,
                    'c': confidence, 't': json.dumps(tags),
                },
            )


def downgrade():
    bind = op.get_bind()
    for mold in MOLDS:
        bind.execute(
            sa.text(
                'DELETE FROM mind.brain_molds '
                'WHERE game_id = :g AND slug = :s'
            ),
            {'g': GAME_ID, 's': mold['slug']},
        )
