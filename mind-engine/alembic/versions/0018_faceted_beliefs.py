"""faceted beliefs — subject/stance/source/pull/habit + attitude seeds

Revision ID: 0018
Revises: 0017
Create Date: 2026-11-02

A Belief may carry facets (CONTEXT.md): subject (what it is about, as
touch-tags: entity:<slug> > tag:family:<slug> > tag:entity_type:<t>),
stance (-1..1 toward the subject), source (lived/heard/legend), pull
(sensitivity to a declared Condition state), habit (a ritual tied to an
owned resource). A belief without facets is still a plain thought; an
attitude is subject+stance.

This migration:
  1. adds the five nullable facet columns to mind.beliefs and
     mind.mold_starter_beliefs;
  2. seeds the attitude packs (app/mind/thought_packs.py) into the
     'celebrian' and 'aranath' molds and backfills living brains of
     those molds — same rule as 0017: only statements the brain does
     not already carry are inserted;
  3. normalizes the pre-pack seeds (0014) to the pack confidence 0.6 —
     rows still at their seeded value, in molds AND brains. A belief
     whose confidence life moved (reflection reinforced/decayed it) is
     lived state and is left alone;
  4. uncrosses two 0014 seeds planted in the wrong mold: Aranath's
     'Narrow paths…' sat on Celebrian, Celebrian's 'The forest keeps
     secrets…' sat on Aranath (each mold already carries the right
     pack version). Mold rows go; brain copies go only while still at
     the seeded confidence — a copy life touched is reported, not
     deleted.

Downgrade deletes the attitude seeds it added (mold + brains, seed
origin), restores the crossed rows and the mold confidences, and drops
the facet columns — facet data on non-seed rows is lost on downgrade,
which is what dropping columns means.
"""
import json
import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

from app.mind.thought_packs import ATTITUDE_PACKS

# revision identifiers, used by Alembic.
revision = '0018'
down_revision = '0017'
branch_labels = None
depends_on = None

GAME_ID = 'middle_earth'

# statement -> confidence it carried before 0018 normalized it to 0.6.
LEGACY_CONFIDENCE = {
    'celebrian': {
        'I will not sail West. I mean to be the last witness when the '
        'lights go out.': 0.9,
        'Everything that lives is already half in its grave; I have '
        'buried lovers, friends and whole kingdoms.': 0.8,
        'I am not driven; I am drawn, the way water runs downhill. I '
        'keep no errand and do not hurry.': 0.75,
        'I trust growing things more than people.': 0.7,
    },
    'aranath': {
        'I have spent years walking the borders of fallen Arnor; this '
        'time I walk alone.': 0.85,
        'After danger passes, gratitude is the sharpest feeling.': 0.7,
        'An old road does not die — it waits for the one who still '
        'remembers it.': 0.7,
    },
}

# Seeds planted in the wrong mold by 0014 —
# (owner mold, statement, kind, confidence, tags). The right pack
# version already lives on the correct mold.
CROSSED_SEEDS = [
    (
        'celebrian',
        'Narrow paths force travellers close; that is why friendship '
        'is so often born there.',
        'world', 0.6,
        ['tag:entity_type:humans', 'tag:entity_type:elves',
         'tag:entity_type:dwarves', 'tag:entity_type:hobbits'],
    ),
    (
        'aranath',
        'The forest keeps secrets better than any elven heart.',
        'world', 0.65, [],
    ),
]

_FACETS = ('subject', 'stance', 'source', 'pull', 'habit')


def _mold_id(bind, slug):
    return bind.execute(
        sa.text(
            'SELECT id FROM mind.brain_molds '
            'WHERE game_id = :g AND slug = :s'
        ),
        {'g': GAME_ID, 's': slug},
    ).scalar()


def _seed_attitudes(bind, slug, attitudes, mold_id):
    """Insert the attitude rows into one mold and every living brain of
    it — statements a brain already carries keep their lived state."""
    for a in attitudes:
        exists = bind.execute(
            sa.text(
                'SELECT 1 FROM mind.mold_starter_beliefs '
                'WHERE mold_id = :m AND statement = :s'
            ),
            {'m': mold_id, 's': a['statement']},
        ).scalar()
        if exists is None:
            bind.execute(
                sa.text(
                    'INSERT INTO mind.mold_starter_beliefs '
                    '(mold_id, kind, statement, confidence, tags, '
                    'boosts, subject, stance, source) VALUES '
                    '(:m, :k, :s, :c, CAST(:tags AS jsonb), '
                    'CAST(:boosts AS jsonb), CAST(:subj AS jsonb), '
                    ':st, :src)'
                ),
                {
                    'm': mold_id, 'k': a['kind'], 's': a['statement'],
                    'c': a['confidence'],
                    'tags': json.dumps(a['tags']),
                    'boosts': json.dumps(a['boosts']),
                    'subj': json.dumps(a['subject']),
                    'st': a['stance'], 'src': a['source'],
                },
            )

    statements = [a['statement'] for a in attitudes]
    brains = bind.execute(
        sa.text(
            'SELECT character_id FROM mind.brains '
            'WHERE game_id = :g AND mold_slug = :s'
        ),
        {'g': GAME_ID, 's': slug},
    ).fetchall()
    for (character_id,) in brains:
        carried = {
            r[0] for r in bind.execute(
                sa.text(
                    'SELECT statement FROM mind.beliefs '
                    'WHERE game_id = :g AND character_id = :c '
                    'AND statement = ANY(:st)'
                ),
                {'g': GAME_ID, 'c': character_id, 'st': statements},
            ).fetchall()
        }
        for a in attitudes:
            if a['statement'] in carried:
                continue
            bind.execute(
                sa.text(
                    'INSERT INTO mind.beliefs '
                    '(id, game_id, character_id, kind, statement, '
                    'confidence, tags, boosts, evidence, origin, '
                    'status, horizon, subject, stance, source) VALUES '
                    '(:i, :g, :c, :k, :s, :conf, CAST(:tags AS jsonb), '
                    'CAST(:boosts AS jsonb), \'[]\'::jsonb, \'seed\', '
                    '\'active\', \'enduring\', CAST(:subj AS jsonb), '
                    ':st, :src)'
                ),
                {
                    'i': f'bl_{uuid.uuid4().hex}',
                    'g': GAME_ID, 'c': character_id,
                    'k': a['kind'], 's': a['statement'],
                    'conf': a['confidence'],
                    'tags': json.dumps(a['tags']),
                    'boosts': json.dumps(a['boosts']),
                    'subj': json.dumps(a['subject']),
                    'st': a['stance'], 'src': a['source'],
                },
            )


def upgrade():
    bind = op.get_bind()

    for table in ('beliefs', 'mold_starter_beliefs'):
        op.add_column(
            table,
            sa.Column('subject', JSONB, nullable=True), schema='mind')
        op.add_column(
            table,
            sa.Column('stance', sa.Float, nullable=True), schema='mind')
        op.add_column(
            table,
            sa.Column('source', sa.String(20), nullable=True),
            schema='mind')
        op.add_column(
            table,
            sa.Column('pull', JSONB, nullable=True), schema='mind')
        op.add_column(
            table,
            sa.Column('habit', JSONB, nullable=True), schema='mind')

    for slug, attitudes in ATTITUDE_PACKS.items():
        mold_id = _mold_id(bind, slug)
        if mold_id is not None:
            _seed_attitudes(bind, slug, attitudes, mold_id)

    # Normalize the pre-pack seeds to the pack confidence — rows still
    # at their seeded value only (lived confidence is not overwritten).
    for slug, confidences in LEGACY_CONFIDENCE.items():
        mold_id = _mold_id(bind, slug)
        for statement, old in confidences.items():
            if mold_id is not None:
                bind.execute(
                    sa.text(
                        'UPDATE mind.mold_starter_beliefs '
                        'SET confidence = 0.6 '
                        'WHERE mold_id = :m AND statement = :s '
                        'AND confidence = :old'
                    ),
                    {'m': mold_id, 's': statement, 'old': old},
                )
            bind.execute(
                sa.text(
                    "UPDATE mind.beliefs SET confidence = 0.6 "
                    "WHERE game_id = :g AND origin = 'seed' "
                    'AND statement = :st AND confidence = :old '
                    'AND character_id IN ('
                    '  SELECT character_id FROM mind.brains '
                    '  WHERE game_id = :g AND mold_slug = :m)'
                ),
                {'g': GAME_ID, 'st': statement, 'old': old, 'm': slug},
            )

    # Uncross the two seeds planted in the wrong mold — mold rows and
    # brain copies still at the seeded confidence. A copy life already
    # moved keeps its state and stays (reported in the change notes).
    for slug, statement, _kind, seeded, _tags in CROSSED_SEEDS:
        mold_id = _mold_id(bind, slug)
        if mold_id is not None:
            bind.execute(
                sa.text(
                    'DELETE FROM mind.mold_starter_beliefs '
                    'WHERE mold_id = :m AND statement = :s'
                ),
                {'m': mold_id, 's': statement},
            )
        bind.execute(
            sa.text(
                "DELETE FROM mind.beliefs WHERE game_id = :g "
                "AND origin = 'seed' AND statement = :st "
                'AND confidence = :conf '
                'AND character_id IN ('
                '  SELECT character_id FROM mind.brains '
                '  WHERE game_id = :g AND mold_slug = :m)'
            ),
            {'g': GAME_ID, 'st': statement, 'conf': seeded, 'm': slug},
        )


def downgrade():
    bind = op.get_bind()

    # Restore the crossed seeds on their (wrong) 0014 owner molds and
    # brains that no longer carry the statement.
    for slug, statement, kind, conf, tags in CROSSED_SEEDS:
        mold_id = _mold_id(bind, slug)
        if mold_id is not None:
            bind.execute(
                sa.text(
                    'INSERT INTO mind.mold_starter_beliefs '
                    '(mold_id, kind, statement, confidence, tags) '
                    'VALUES (:m, :k, :s, :c, CAST(:tags AS jsonb))'
                ),
                {
                    'm': mold_id, 'k': kind, 's': statement,
                    'c': conf, 'tags': json.dumps(tags),
                },
            )
        brains = bind.execute(
            sa.text(
                'SELECT character_id FROM mind.brains '
                'WHERE game_id = :g AND mold_slug = :s'
            ),
            {'g': GAME_ID, 's': slug},
        ).fetchall()
        for (character_id,) in brains:
            carried = bind.execute(
                sa.text(
                    'SELECT 1 FROM mind.beliefs '
                    'WHERE game_id = :g AND character_id = :c '
                    'AND statement = :s'
                ),
                {'g': GAME_ID, 'c': character_id, 's': statement},
            ).scalar()
            if carried is not None:
                continue
            bind.execute(
                sa.text(
                    'INSERT INTO mind.beliefs '
                    '(id, game_id, character_id, kind, statement, '
                    'confidence, tags, boosts, evidence, origin, '
                    'status, horizon) '
                    "VALUES (:i, :g, :c, :k, :s, :conf, "
                    "CAST(:tags AS jsonb), '{}'::jsonb, '[]'::jsonb, "
                    "'seed', 'active', 'enduring')"
                ),
                {
                    'i': f'bl_{uuid.uuid4().hex}',
                    'g': GAME_ID, 'c': character_id,
                    'k': kind, 's': statement, 'conf': conf,
                    'tags': json.dumps(tags),
                },
            )

    # Restore the pre-pack confidences on the mold rows they came from.
    for slug, confidences in LEGACY_CONFIDENCE.items():
        mold_id = _mold_id(bind, slug)
        if mold_id is None:
            continue
        for statement, old in confidences.items():
            bind.execute(
                sa.text(
                    'UPDATE mind.mold_starter_beliefs '
                    'SET confidence = :old '
                    'WHERE mold_id = :m AND statement = :s '
                    'AND confidence = 0.6'
                ),
                {'m': mold_id, 's': statement, 'old': old},
            )

    # Remove the attitude seeds (molds + brains, seed origin only — an
    # attitude born from reflection keeps its life).
    for slug, attitudes in ATTITUDE_PACKS.items():
        statements = [a['statement'] for a in attitudes]
        mold_id = _mold_id(bind, slug)
        if mold_id is not None:
            bind.execute(
                sa.text(
                    'DELETE FROM mind.mold_starter_beliefs '
                    'WHERE mold_id = :m AND statement = ANY(:st)'
                ),
                {'m': mold_id, 'st': statements},
            )
        bind.execute(
            sa.text(
                "DELETE FROM mind.beliefs WHERE game_id = :g "
                "AND origin = 'seed' AND statement = ANY(:st) "
                'AND character_id IN ('
                '  SELECT character_id FROM mind.brains '
                '  WHERE game_id = :g AND mold_slug = :s)'
            ),
            {'g': GAME_ID, 's': slug, 'st': statements},
        )

    for table in ('mold_starter_beliefs', 'beliefs'):
        for facet in reversed(_FACETS):
            op.drop_column(table, facet, schema='mind')
