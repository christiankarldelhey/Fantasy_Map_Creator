# ============================================================================
# C19 — character regeneration wipes the lived mind
# ----------------------------------------------------------------------------
# POST /mind/minds/{character_id}/reset: everything the character LIVED
# dies — memories, learned beliefs, open needs, episodes — and the preset's
# starter beliefs come back (origin='seed'). The nature survives: mind
# row, preset, theme weights, wiring. Called by the game host on character
# regeneration; never blocks gameplay upstream.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.db import SessionLocal
from app.mind.provisioning import NEUTRAL_MOOD
from app.mind.tables import (
    Belief, Mind, MindPreset, Episode, Memory, PresetMusing,
    PresetStarterBelief, Musing, Need,
)


@pytest.fixture()
def client():
    return TestClient(main_module.app)


GAME = 'middle_earth'


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _open(client, character_id, preset):
    r = client.post('/episodes', json={
        'game_id': GAME,
        'character': {'id': character_id, 'preset': preset},
        'episode_ref': _uid('ep'),
        'events': [{
            'type': 'encounter',
            'when': {'episode': 1, 'date': '1950-01-18'},
            'data': {'entity': 42, 'entity_name': 'A Ranger',
                     'entity_type': 'humans', 'form': 'brief_exchange',
                     'danger': 0.0, 'noticed': True},
        }],
        'day': {},
    })
    assert r.status_code == 200, r.text
    return r.json()


def _reset(client, character_id):
    r = client.post(f'/mind/minds/{character_id}/reset', json={})
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture()
def lived_brain(client):
    """A committed mind with a personal preset, seed beliefs, lived
    memories/needs/episodes and a disturbed mood — everything a reset
    must sort into 'survives' vs 'dies'."""
    session = SessionLocal()
    slug = _uid('reset-preset')
    preset = MindPreset(game_id=GAME, slug=slug, name='Reset test persona')
    session.add(preset)
    session.flush()
    session.add(PresetStarterBelief(
        preset_id=preset.id, kind='self', strength=4.5,
        statement='The road is all she has.', tags=[], boosts=None,
    ))
    session.add(PresetMusing(
        preset_id=preset.id, statement='The road hums under her feet.',
        tags=['context:solitude'],
    ))
    session.commit()

    character_id = _uid('reset-char')
    ep = _open(client, character_id, slug)

    session.add(Memory(
        game_id=GAME, character_id=character_id, kind='episodic',
        desc='a conversation by the road', importance=0.5, strength=0.5,
    ))
    session.add(Belief(
        game_id=GAME, character_id=character_id, kind='world',
        statement='The north is closing.', strength=3,
        origin='experience', status='active',
    ))
    session.add(Need(
        game_id=GAME, character_id=character_id, key='hunger',
        type='physiological', description='the stomach aches', urgency=0.7,
    ))
    mind = (
        session.query(Mind)
        .filter_by(game_id=GAME, character_id=character_id).one()
    )
    mind.mood = {'label': 'dread', 'valence': -0.8, 'arousal': 0.6}
    mind.counters = {'days_since_meal': 3}
    session.commit()
    session.close()

    yield {'character_id': character_id, 'preset_slug': slug, 'episode': ep}

    session = SessionLocal()
    for model in (Memory, Belief, Need, Episode, Mind, Musing):
        session.query(model).filter_by(
            game_id=GAME, character_id=character_id).delete()
    session.query(MindPreset).filter_by(game_id=GAME, slug=slug).delete()
    session.commit()
    session.close()


def test_reset_wipes_lived_content_and_reseeds(client, lived_brain):
    character_id = lived_brain['character_id']
    out = _reset(client, character_id)

    assert out['character_id'] == character_id
    assert out['mind']['preset_slug'] == lived_brain['preset_slug']
    assert out['deleted']['episodes'] >= 1
    assert out['deleted']['memories'] >= 1
    assert out['deleted']['beliefs'] >= 2  # seed + learned, all die
    assert out['deleted']['needs'] >= 1
    assert out['deleted']['musings'] >= 1
    assert out['seeds'] == 2

    session = SessionLocal()
    mind = (
        session.query(Mind)
        .filter_by(game_id=GAME, character_id=character_id).one()
    )
    assert mind.preset_slug == lived_brain['preset_slug']
    assert mind.mood == NEUTRAL_MOOD
    assert mind.counters == {}

    assert session.query(Memory).filter_by(
        game_id=GAME, character_id=character_id).count() == 0
    assert session.query(Need).filter_by(
        game_id=GAME, character_id=character_id).count() == 0
    assert session.query(Episode).filter_by(
        game_id=GAME, character_id=character_id).count() == 0

    beliefs = session.query(Belief).filter_by(
        game_id=GAME, character_id=character_id).all()
    assert len(beliefs) == 1
    assert beliefs[0].origin == 'seed'
    assert beliefs[0].statement == 'The road is all she has.'
    assert beliefs[0].status == 'active'
    musings = session.query(Musing).filter_by(
        game_id=GAME, character_id=character_id).all()
    assert [m.statement for m in musings] == [
        'The road hums under her feet.'
    ]
    session.close()


def test_reset_is_idempotent(client, lived_brain):
    character_id = lived_brain['character_id']
    _reset(client, character_id)
    out = _reset(client, character_id)
    assert out['seeds'] == 2

    session = SessionLocal()
    beliefs = session.query(Belief).filter_by(
        game_id=GAME, character_id=character_id).all()
    assert len(beliefs) == 1
    musings = session.query(Musing).filter_by(
        game_id=GAME, character_id=character_id).all()
    assert len(musings) == 1
    session.close()


def test_reset_without_brain_is_a_safe_noop(client):
    out = _reset(client, _uid('never-seen'))
    assert out['mind'] is None
    assert out['deleted'] == {
        'memories': 0, 'forgotten': 0, 'beliefs': 0, 'needs': 0,
        'episodes': 0, 'musings': 0,
    }
    assert out['seeds'] == 0
