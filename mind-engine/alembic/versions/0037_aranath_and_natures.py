"""aranath prehistory + authored natures (temperament/personality)

Revision ID: 0037
Revises: 0036
Create Date: 2026-12-01

  1. Seeds the 'aranath' preset the way 0036 did celebrian's: seed
     memories (1878-1946, the Dúnadan's eighty years), new musings and
     attitudes, preset_leans — and backfills living minds through the
     same seed_* clone functions, dedup by statement/desc/subject.
  2. Authors the resting point and couplings on BOTH presets — until
     now temperament/personality shipped empty, so every mind regressed
     to the same neutral middle. Celebrian rests apathetic and holds
     long (low moodiness, high resistance, high reflectiveness — the
     ruminant she is); Aranath rests watchful and stays open (low-mid
     moodiness, open resistance, mid reflectiveness). The same authored
     values are written into the living minds, which had nothing set.

Natures are declared in this file (not the packs): temperament is a
resting point in mood space {valence, arousal, dominance}; personality
the couplings {moodiness, resistance, reflectiveness}.
"""
import json
from types import SimpleNamespace

import sqlalchemy as sa
from alembic import op
from sqlalchemy.orm import Session

from app.mind.provisioning import (
    seed_memories, seed_musings, seed_starter_beliefs,
)
from app.mind.relations import seed_relations
from app.mind.seed_packs import (
    ATTITUDE_PACKS, LEAN_PACKS, MEMORY_PACKS, MUSING_PACKS,
)
from app.mind.tables import MindPreset

revision = '0037'
down_revision = '0036'
branch_labels = None
depends_on = None

GAME_ID = 'middle_earth'

SLUG = 'aranath'

NATURES = {
    'celebrian': {
        # Apathetic rest: below neutral, low energy, self-possessed.
        'temperament': {
            'valence': -0.05, 'arousal': -0.15, 'dominance': 0.15,
        },
        # The ruminant: the world moves her little, her opinions move
        # less, and her inner voice answers loudly when left alone.
        'personality': {
            'moodiness': 0.15, 'resistance': 0.7, 'reflectiveness': 0.85,
        },
    },
    'aranath': {
        # Watchful rest: alert, mildly engaged, composed.
        'temperament': {
            'valence': 0.05, 'arousal': 0.2, 'dominance': 0.15,
        },
        # The steady one: events move him a measured amount and his
        # standings stay open to revision ('I keep a hand open').
        'personality': {
            'moodiness': 0.25, 'resistance': 0.45, 'reflectiveness': 0.6,
        },
    },
}


def _seed_preset_rows(bind, slug):
    preset_id = bind.execute(
        sa.text(
            'SELECT id FROM mind.mind_presets '
            'WHERE game_id = :g AND slug = :s'
        ),
        {'g': GAME_ID, 's': slug},
    ).scalar()
    if preset_id is None:
        return None
    for m in MEMORY_PACKS.get(slug, []):
        bind.execute(
            sa.text(
                'INSERT INTO mind.preset_memories '
                '(preset_id, "desc", tags, subjects, valence, '
                'importance, imprint, region, entity_id, lived_date) '
                'SELECT :p, :d, CAST(:tags AS jsonb), '
                'CAST(:subj AS jsonb), :v, :i, CAST(:imp AS jsonb), '
                ':r, :e, :ld '
                'WHERE NOT EXISTS ('
                'SELECT 1 FROM mind.preset_memories '
                'WHERE preset_id = :p AND "desc" = :d)'
            ),
            {
                'p': preset_id, 'd': m['desc'],
                'tags': json.dumps(m['tags']),
                'subj': json.dumps(m['subjects']),
                'v': m['valence'], 'i': m['importance'],
                'imp': json.dumps(m['imprint']),
                'r': m['region'], 'e': m['entity_id'],
                'ld': m['lived_date'],
            },
        )
    for m in MUSING_PACKS.get(slug, []):
        bind.execute(
            sa.text(
                'INSERT INTO mind.preset_musings (preset_id, statement, tags) '
                'SELECT :p, :s, CAST(:tags AS jsonb) '
                'WHERE NOT EXISTS ('
                'SELECT 1 FROM mind.preset_musings '
                'WHERE preset_id = :p AND statement = :s)'
            ),
            {'p': preset_id, 's': m['statement'],
             'tags': json.dumps(m['tags'])},
        )
    for a in ATTITUDE_PACKS.get(slug, []):
        bind.execute(
            sa.text(
                'INSERT INTO mind.preset_starter_beliefs '
                '(preset_id, kind, statement, strength, tags, boosts, '
                'subject, stance, source) '
                'SELECT :p, :k, :s, :str, CAST(:tags AS jsonb), '
                'CAST(:b AS jsonb), CAST(:subj AS jsonb), :st, :src '
                'WHERE NOT EXISTS ('
                'SELECT 1 FROM mind.preset_starter_beliefs '
                'WHERE preset_id = :p AND statement = :s)'
            ),
            {
                'p': preset_id, 'k': a['kind'], 's': a['statement'],
                'str': a['strength'], 'tags': json.dumps(a['tags']),
                'b': json.dumps(a['boosts']),
                'subj': json.dumps(a['subject']),
                'st': a['stance'], 'src': a['source'],
            },
        )
    for l in LEAN_PACKS.get(slug, []):
        bind.execute(
            sa.text(
                'INSERT INTO mind.preset_leans '
                '(preset_id, subject, affection, trust, fear, '
                'familiarity) '
                'SELECT :p, :s, :a, :t, :f, :fam '
                'WHERE NOT EXISTS ('
                'SELECT 1 FROM mind.preset_leans '
                'WHERE preset_id = :p AND subject = :s)'
            ),
            {'p': preset_id, 's': l['subject'], 'a': l['affection'],
             't': l['trust'], 'f': l['fear'], 'fam': l['familiarity']},
        )
    return preset_id


def _backfill_minds(bind, session, slug, preset):
    """Living minds get the same rows through the real clone functions —
    a namespace carrying only what the mind does not already hold."""
    for (character_id,) in bind.execute(
        sa.text(
            'SELECT character_id FROM mind.minds '
            'WHERE game_id = :g AND preset_slug = :s'
        ),
        {'g': GAME_ID, 's': slug},
    ).fetchall():
        carried_statements = {
            r[0] for r in bind.execute(
                sa.text(
                    'SELECT statement FROM mind.musings '
                    'WHERE game_id = :g AND character_id = :c'
                ),
                {'g': GAME_ID, 'c': character_id},
            )
        }
        seed_musings(session, GAME_ID, character_id, SimpleNamespace(
            musings=[m for m in preset.musings
                     if m.statement not in carried_statements],
        ))
        carried_descs = {
            r[0] for r in bind.execute(
                sa.text(
                    'SELECT "desc" FROM mind.memories '
                    'WHERE game_id = :g AND character_id = :c'
                ),
                {'g': GAME_ID, 'c': character_id},
            )
        }
        seed_starter_beliefs(session, GAME_ID, character_id, SimpleNamespace(
            starter_beliefs=[b for b in preset.starter_beliefs
                             if b.statement not in carried_descs],
        ))
        seed_memories(session, GAME_ID, character_id, SimpleNamespace(
            memories=[m for m in preset.memories
                      if m.desc not in carried_descs],
        ))
        carried_subjects = {
            r[0] for r in bind.execute(
                sa.text(
                    'SELECT subject FROM mind.relations '
                    'WHERE game_id = :g AND character_id = :c'
                ),
                {'g': GAME_ID, 'c': character_id},
            )
        }
        seed_relations(session, GAME_ID, character_id, SimpleNamespace(
            leans=[l for l in preset.leans
                   if l.subject not in carried_subjects],
            starter_beliefs=[
                SimpleNamespace(
                    subject=[s for s in (b.subject or [])
                             if s not in carried_subjects],
                    stance=b.stance, source=b.source,
                )
                for b in preset.starter_beliefs
            ],
        ))


def upgrade():
    bind = op.get_bind()
    session = Session(bind=bind)

    preset_id = _seed_preset_rows(bind, SLUG)
    if preset_id is not None:
        preset = session.query(MindPreset).filter_by(id=preset_id).one_or_none()
        if preset is not None:
            _backfill_minds(bind, session, SLUG, preset)

    # The authored natures — on the presets for future clones, and on
    # the living minds (which shipped with none set).
    for slug, nature in NATURES.items():
        for table in ('mind_presets', 'minds'):
            if table == 'mind_presets':
                where = 'game_id = :g AND slug = :s'
            else:
                where = 'game_id = :g AND preset_slug = :s'
            bind.execute(
                sa.text(
                    f'UPDATE mind.{table} SET '
                    f"temperament = CAST(:t AS jsonb), "
                    f"personality = CAST(:p AS jsonb) WHERE {where}"
                ),
                {
                    'g': GAME_ID, 's': slug,
                    't': json.dumps(nature['temperament']),
                    'p': json.dumps(nature['personality']),
                },
            )
    session.flush()


def downgrade():
    bind = op.get_bind()
    for slug, nature in NATURES.items():
        for table, col in (
            ('mind_presets', 'slug'), ('minds', 'preset_slug')
        ):
            bind.execute(
                sa.text(
                    f"UPDATE mind.{table} SET temperament = '{{}}'::jsonb, "
                    f"personality = '{{}}'::jsonb "
                    f'WHERE game_id = :g AND {col} = :s'
                ),
                {'g': GAME_ID, 's': slug},
            )
