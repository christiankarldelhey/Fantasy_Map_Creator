# ============================================================================
# Belief facets — subject matching for the brief/reflection (CONTEXT.md ·
# Attitude facets). The motion lives in Relations now (test_relations.py,
# ADR 0017): a stanced starter belief also seeds its subject's Relation at
# provisioning, but at runtime nothing here colours or drifts — the facets
# only match who/what a thought is about.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.db import SessionLocal
from app.mind.attitudes import is_attitude, match_level
from app.mind.reflection import _apply_ops
from app.mind.tables import (
    Memory, Mind, MindPreset, PresetStarterBelief,
)


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _open(client, char, events, ref='d1', preset=None):
    character = {'id': char}
    if preset:
        character['preset'] = preset
    r = client.post('/episodes', json={
        'game_id': 'middle_earth', 'character': character,
        'episode_ref': ref, 'events': events,
    })
    assert r.status_code == 200, r.text
    return r.json()


def _beliefs(char):
    """Conviction-tier Memory rows (#168) — statement is `desc`, the
    subject/stance ride `subjects`/`imprint`, the rest the facet."""
    session = SessionLocal()
    rows = (
        session.query(Memory)
        .filter_by(character_id=char, kind='conviction')
        .order_by(Memory.desc).all()
    )
    for r in rows:
        session.expunge(r)
    session.close()
    return rows


def _conviction(char, statement, strength=3, subject=None, stance=None,
                source=None, status='active', tags=None):
    return Memory(
        game_id='middle_earth', character_id=char,
        kind='conviction', depth='conviction', consolidated=True,
        desc=statement, tags=list(tags or []),
        subjects=list(subject) if subject else None,
        imprint={'affection': stance} if stance is not None else None,
        origin='seed',
        conviction={
            'kind': 'world', 'horizon': 'enduring', 'status': status,
            'strength': strength, 'evidence': [], 'source': source,
        },
    )


def _new_mind(char):
    session = SessionLocal()
    session.add(Mind(
        game_id='middle_earth', character_id=char, preset_slug='x',
        wiring={}, mood={}, counters={},
    ))
    session.commit()
    session.close()


def test_provisioning_clones_every_facet(client):
    """A preset's starter belief carries subject/stance/source into the
    mind's copy — a belief without them stays a plain thought."""
    session = SessionLocal()
    slug = _uid('faceted')
    preset = MindPreset(game_id='middle_earth', slug=slug, name='Faceted')
    session.add(preset)
    session.flush()
    session.add(PresetStarterBelief(
        preset_id=preset.id, kind='world', statement='Foxes are kin',
        strength=3, tags=[], boosts={},
        subject=['tag:family:foxes'], stance=0.6, source='lived',
    ))
    session.add(PresetStarterBelief(
        preset_id=preset.id, kind='self', statement='I keep my own counsel',
        strength=3, tags=['context:solitude'], boosts={},
    ))
    session.commit()
    session.close()

    char = _uid('clone')
    _open(client, char, [{'type': 'travel', 'when': {'episode': 1},
                          'data': {}}], preset=slug)
    faceted, plain = _beliefs(char)

    assert faceted.subjects == ['tag:family:foxes']
    assert faceted.imprint['affection'] == 0.6
    assert faceted.conviction['source'] == 'lived'
    assert is_attitude(faceted)

    assert plain.subjects is None and plain.imprint is None
    assert not is_attitude(plain)


def test_narrowest_subject_speaks_for_the_encounter():
    """entity > family > type: Celebrian loves horses, and the horses of
    Mordor are not that."""
    class _B:
        def __init__(self, subject, stance):
            self.subject, self.stance = subject, stance
            self.tags, self.strength = [], 0.6
    broad = _B(['tag:entity_type:riding_animals'], 0.2)
    family = _B(['tag:family:horses'], 0.7)
    exact = _B(['entity:horses_of_mordor'], -0.8)

    tags = ['entity:horses_of_mordor', 'tag:family:horses',
            'tag:entity_type:riding_animals']
    # The narrowest match speaks: entity (3) > family (2) > type (1).
    assert match_level(exact, tags) == 3
    assert match_level(family, tags) == 2
    assert match_level(broad, tags) == 1
    wild = ['entity:wild_horses', 'tag:family:horses',
            'tag:entity_type:riding_animals']
    assert match_level(family, wild) == 2
    # The exact subject doesn't answer for a different entity.
    assert match_level(exact, wild) == 0
    # No touch — no attitude.
    assert match_level(family, ['entity:orcs', 'tag:entity_type:orcs']) == 0


def test_only_the_narrowest_attitude_line_speaks(client):
    """In the Lens, the horses-of-Mordor attitude answers a Mordor-horse
    encounter; the general love of horses steps back."""
    char = _uid('narrow')
    _new_mind(char)
    session = SessionLocal()
    for subject, stance, stmt in (
        (['tag:family:horses'], 0.7, 'Horses are the last joy'),
        (['entity:horses_of_mordor'], -0.8, 'I pity those horses'),
    ):
        session.add(_conviction(
            char, stmt, subject=subject, stance=stance,
        ))
    session.commit()
    session.close()

    opened = _open(client, char, [{
        'type': 'encounter',
        'when': {'episode': 1, 'date': '1950-01-19'},
        'data': {'entity': 'horses_of_mordor', 'family': 'horses',
                 'entity_type': 'riding_animals', 'form': 'confronts',
                 'danger': 4},
    }])

    brief = opened['psyche_packet']['brief']
    lines = [
        l for l in brief['carried'] + brief['day']
        if str(l.get('id', '')).startswith('belief:')
    ]
    texts = [l['text'] for l in lines]
    assert 'I pity those horses' in texts
    assert 'Horses are the last joy' not in texts


def test_inverted_belief_keeps_its_facets():
    """When reflection turns a prejudice, the grown belief still knows
    its subject — with the stance turned and 'lived' as its source."""
    char = _uid('turned')
    session = SessionLocal()
    session.add(Mind(
        game_id='middle_earth', character_id=char, preset_slug='x',
        wiring={}, mood={}, counters={},
    ))
    session.flush()
    mind = session.query(Mind).filter_by(character_id=char).one()
    old = Memory(
        game_id='middle_earth', character_id=char,
        kind='conviction', depth='conviction', consolidated=True,
        desc='I do not trust dwarves',
        tags=['tag:entity_type:dwarves', 'trauma'],
        subjects=['tag:entity_type:dwarves'],
        imprint={'affection': -0.3}, origin='seed',
        conviction={
            'kind': 'other', 'horizon': 'enduring', 'status': 'active',
            'strength': 3, 'evidence': ['m1'], 'source': 'heard',
        },
    )
    session.add(old)
    session.flush()
    _apply_ops(session, mind, [{
        'op': 'invert', 'belief_id': old.id,
        'statement': 'The mountain folk kept their word when no one '
                     'else did', 'strength': 2.5,
        'evidence': ['m1'],
    }], {old.id: old}, 5, {})
    session.commit()

    grown = (
        session.query(Memory)
        .filter_by(character_id=char, kind='conviction')
        .filter(Memory.id != old.id).one()
    )
    assert grown.subjects == ['tag:entity_type:dwarves']
    assert grown.imprint['affection'] == pytest.approx(0.3)
    assert grown.conviction['source'] == 'lived'
    assert grown.tags == ['tag:entity_type:dwarves']  # trauma dropped
    assert old.conviction['status'] == 'inverted'
    session.close()
