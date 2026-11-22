"""celebrian prehistory — preset memories + the long voice

Revision ID: 0036
Revises: 0035
Create Date: 2026-12-01

  1. mind.preset_memories — the preset-side sibling of
     seed_starter_beliefs for the episodic flavour: an authored lived
     past cloned at provisioning (consolidated, origin='seed',
     lived_date -> memories.created_date).
  2. Seeds the 'celebrian' preset: ~38 prehistory memories (1450-1950),
     new musings and attitudes (pack-appended), and her preset_leans
     (regions and kinds where a bare stance cannot carry the vector).
  3. Backfills living minds of the preset the way 0017/0018 did —
     through the real seed_* clone functions, skipping rows the mind
     already carries (dedup by statement/desc/subject); lived state is
     never overwritten.
"""
import json
from types import SimpleNamespace

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Session

from app.mind.provisioning import (
    seed_memories, seed_musings, seed_starter_beliefs,
)
from app.mind.relations import seed_relations
from app.mind.seed_packs import (
    ATTITUDE_PACKS, LEAN_PACKS, MEMORY_PACKS, MUSING_PACKS,
)
from app.mind.tables import MindPreset

revision = '0036'
down_revision = '0035'
branch_labels = None
depends_on = None

GAME_ID = 'middle_earth'


def upgrade():
    op.create_table(
        'preset_memories',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('preset_id', sa.Integer,
                  sa.ForeignKey('mind.mind_presets.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('desc', sa.Text, nullable=False),
        sa.Column('tags', JSONB, nullable=False, server_default='[]'),
        sa.Column('subjects', JSONB, nullable=True),
        sa.Column('valence', sa.Float, nullable=False, server_default='0'),
        sa.Column('importance', sa.Float, nullable=False,
                  server_default='0.4'),
        sa.Column('imprint', JSONB, nullable=True),
        sa.Column('region', sa.String(120), nullable=True),
        sa.Column('entity_id', sa.String(120), nullable=True),
        sa.Column('lived_date', sa.Date, nullable=True),
        schema='mind',
    )

    bind = op.get_bind()
    preset_id = bind.execute(
        sa.text(
            'SELECT id FROM mind.mind_presets '
            'WHERE game_id = :g AND slug = :s'
        ),
        {'g': GAME_ID, 's': 'celebrian'},
    ).scalar()
    if preset_id is None:
        return

    for m in MEMORY_PACKS['celebrian']:
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
    for m in MUSING_PACKS['celebrian']:
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
    for a in ATTITUDE_PACKS['celebrian']:
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
    for l in LEAN_PACKS['celebrian']:
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

    # Living minds get the same rows through the real clone functions —
    # a namespace carrying only what the mind does not already hold.
    session = Session(bind=bind)
    preset = session.query(MindPreset).filter_by(id=preset_id).one_or_none()
    if preset is None:
        return
    for (character_id,) in bind.execute(
        sa.text(
            'SELECT character_id FROM mind.minds '
            'WHERE game_id = :g AND preset_slug = :s'
        ),
        {'g': GAME_ID, 's': 'celebrian'},
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
    session.flush()


def downgrade():
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "DELETE FROM mind.preset_memories WHERE preset_id IN ("
            "SELECT id FROM mind.mind_presets WHERE game_id = :g AND "
            "slug = :s)"
        ),
        {'g': GAME_ID, 's': 'celebrian'},
    )
    op.drop_table('preset_memories', schema='mind')
