"""thought packs — authored personality as starter beliefs

Revision ID: 0017
Revises: 0016
Create Date: 2026-10-24

Each playable character gets a full inner library: ~95 authored thoughts
(app/mind/thought_packs.py) cloned as origin='seed' beliefs — social,
solitude ('context:solitude'), hostile aftermath, nature, and
enemy/portent-specific. They speak through the lens when the day's own
tags put them at stake; solitude thoughts speak when nobody touched the
mind at all.

This migration:
  1. inserts the pack rows into mind.mold_starter_beliefs for the
     'celebrian' and 'aranath' molds — statements already seeded by 0014
     get their tags corrected to the pack's (the pack is the source of
     truth for the touch surface);
  2. backfills mind.beliefs for existing brains of those molds: missing
     thoughts are inserted as seeds; thoughts the brain already carries
     are left untouched (they have lived state — confidence, status,
     evidence — that a migration must not overwrite).
"""
import json
import uuid

import sqlalchemy as sa
from alembic import op

from app.mind.thought_packs import LEGACY_REWRITES, PACKS

# revision identifiers, used by Alembic.
revision = '0017'
down_revision = '0016'
branch_labels = None
depends_on = None

GAME_ID = 'middle_earth'

# Pack statements that 0014 had already seeded, with their 0014 tags —
# upgrade retags them, downgrade must restore (not delete) them.
SEEDED_BY_0014 = {
    'aranath': {
        'After danger passes, gratitude is the sharpest feeling.': [
            'tag:form:attacks', 'tag:form:confronts', 'tag:form:sudden_peril',
            'tag:entity_type:orcs', 'tag:entity_type:undead',
            'tag:entity_type:trolls',
        ],
    },
}


def _rewrite(bind, slug, frm, to, tags):
    """Swap one seed's text+tags in the mold and in every living brain of
    that mold — confidence, evidence and status are lived and stay."""
    params = {'g': GAME_ID, 's': slug, 'frm': frm, 'to': to,
              'tags': json.dumps(tags)}
    bind.execute(sa.text(
        'UPDATE mind.mold_starter_beliefs SET statement = :to, '
        'tags = CAST(:tags AS jsonb) WHERE statement = :frm AND mold_id = ('
        '  SELECT id FROM mind.brain_molds WHERE game_id = :g AND slug = :s)'
    ), params)
    bind.execute(sa.text(
        "UPDATE mind.beliefs SET statement = :to, tags = CAST(:tags AS jsonb) "
        "WHERE game_id = :g AND origin = 'seed' AND statement = :frm "
        'AND character_id IN ('
        '  SELECT character_id FROM mind.brains '
        '  WHERE game_id = :g AND mold_slug = :s)'
    ), params)


def upgrade():
    bind = op.get_bind()

    for slug, rewrites in LEGACY_REWRITES.items():
        for old, new, _old_tags, new_tags in rewrites:
            _rewrite(bind, slug, old, new, new_tags)

    for slug, thoughts in PACKS.items():
        mold_id = bind.execute(
            sa.text(
                'SELECT id FROM mind.brain_molds '
                'WHERE game_id = :g AND slug = :s'
            ),
            {'g': GAME_ID, 's': slug},
        ).scalar()
        if mold_id is None:
            continue

        for t in thoughts:
            existing = bind.execute(
                sa.text(
                    'SELECT id FROM mind.mold_starter_beliefs '
                    'WHERE mold_id = :m AND statement = :s'
                ),
                {'m': mold_id, 's': t['statement']},
            ).scalar()
            if existing is not None:
                bind.execute(
                    sa.text(
                        'UPDATE mind.mold_starter_beliefs '
                        'SET tags = CAST(:tags AS jsonb), '
                        'boosts = CAST(:boosts AS jsonb) '
                        'WHERE id = :i'
                    ),
                    {
                        'tags': json.dumps(t['tags']),
                        'boosts': json.dumps(t['boosts']),
                        'i': existing,
                    },
                )
            else:
                bind.execute(
                    sa.text(
                        'INSERT INTO mind.mold_starter_beliefs '
                        '(mold_id, kind, statement, confidence, tags, boosts) '
                        'VALUES (:m, :k, :s, :c, CAST(:tags AS jsonb), '
                        'CAST(:boosts AS jsonb))'
                    ),
                    {
                        'm': mold_id, 'k': t['kind'], 's': t['statement'],
                        'c': t['confidence'],
                        'tags': json.dumps(t['tags']),
                        'boosts': json.dumps(t['boosts']),
                    },
                )

        # Backfill living brains of this mold — insert the thoughts they
        # never got; leave ones they already carry alone.
        statements = [t['statement'] for t in thoughts]
        brains = bind.execute(
            sa.text(
                'SELECT id, character_id FROM mind.brains '
                'WHERE game_id = :g AND mold_slug = :s'
            ),
            {'g': GAME_ID, 's': slug},
        ).fetchall()
        for brain in brains:
            carried = {
                r[0] for r in bind.execute(
                    sa.text(
                        'SELECT statement FROM mind.beliefs '
                        'WHERE game_id = :g AND character_id = :c '
                        'AND statement = ANY(:st)'
                    ),
                    {
                        'g': GAME_ID, 'c': brain.character_id,
                        'st': statements,
                    },
                ).fetchall()
            }
            for t in thoughts:
                if t['statement'] in carried:
                    continue
                bind.execute(
                    sa.text(
                        'INSERT INTO mind.beliefs '
                        '(id, game_id, character_id, kind, statement, '
                        'confidence, tags, boosts, evidence, origin, status, '
                        'horizon) '
                        "VALUES (:i, :g, :c, :k, :s, :conf, "
                        "CAST(:tags AS jsonb), CAST(:boosts AS jsonb), "
                        "'[]'::jsonb, 'seed', 'active', 'enduring')"
                    ),
                    {
                        'i': f'bl_{uuid.uuid4().hex}',
                        'g': GAME_ID, 'c': brain.character_id,
                        'k': t['kind'], 's': t['statement'],
                        'conf': t['confidence'],
                        'tags': json.dumps(t['tags']),
                        'boosts': json.dumps(t['boosts']),
                    },
                )


def downgrade():
    bind = op.get_bind()
    for slug, thoughts in PACKS.items():
        # Statements 0014 already seeded go back to their 0014 tags; only
        # what 0017 brought is deleted.
        for statement, tags in SEEDED_BY_0014.get(slug, {}).items():
            _rewrite(bind, slug, statement, statement, tags)
        statements = [
            t['statement'] for t in thoughts
            if t['statement'] not in SEEDED_BY_0014.get(slug, {})
        ]
        mold_id = bind.execute(
            sa.text(
                'SELECT id FROM mind.brain_molds '
                'WHERE game_id = :g AND slug = :s'
            ),
            {'g': GAME_ID, 's': slug},
        ).scalar()
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

    for slug, rewrites in LEGACY_REWRITES.items():
        for old, new, old_tags, _new_tags in rewrites:
            _rewrite(bind, slug, new, old, old_tags)
