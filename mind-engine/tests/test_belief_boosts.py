# ============================================================================
# B6 smoke — belief boosts bend theme_weights
# ----------------------------------------------------------------------------
# beliefs.boosts = {tag: magnitude} adds to the mind's effective
# theme_weights while the belief stays active and confident
# (>= belief_boost_min_strength). Weakened/dead/low beliefs don't bend
# anything. The boost lives in data — no config mutation.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.db import SessionLocal
from app.mind.boosts import effective_theme_weights
from app.mind.tables import (
    Belief, Mind, MindPreset, PresetStarterBelief,
)


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _rainy_day(ep=1):
    return {
        'type': 'climate',
        'when': {'episode': ep, 'date': f'1950-01-{18 + ep:02d}'},
        'data': {'temperature_2m': 8.0, 'precipitation': 4.0,
                 'tags': ['weather:wet']},
    }


def _open(client, char, events, ref='d1', preset=None):
    character = {'id': char}
    if preset:
        character['preset'] = preset
    r = client.post('/episodes', json={
        'game_id': 'middle_earth', 'character': character,
        'episode_ref': ref, 'events': events, 'day': {},
    })
    assert r.status_code == 200, r.text
    return r.json()


def _superstitious_mold():
    """A preset whose seed dreads wet weather: boosts tag:weather:* by +0.9."""
    session = SessionLocal()
    slug = _uid('raindread')
    preset = MindPreset(game_id='middle_earth', slug=slug, name='Rain-dread')
    session.add(preset)
    session.flush()
    session.add(PresetStarterBelief(
        preset_id=preset.id, kind='world',
        statement='The rain always brings ruin',
        strength=4, tags=['tag:weather:wet'],
        boosts={'tag:weather:*': 0.9},
    ))
    session.commit()
    session.close()
    return slug


def test_effective_weights_add_active_boosts():
    session = SessionLocal()
    char = _uid('boost')
    mind = Mind(
        game_id='middle_earth', character_id=char,
        preset_slug='x', theme_weights={'tag:weather:wet': 0.2},
        wiring={}, mood={}, counters={},
    )
    session.add(mind)
    session.flush()
    session.add(Belief(
        game_id='middle_earth', character_id=char, kind='world',
        statement='rain means ruin', strength=4, status='active',
        tags=['tag:weather:wet'], boosts={'tag:weather:wet': 0.5},
    ))
    session.flush()  # autoflush is off project-wide
    weights = effective_theme_weights(session, mind)
    assert weights['tag:weather:wet'] == pytest.approx(0.7)
    session.rollback()
    session.close()


def test_low_strength_and_inactive_beliefs_dont_boost():
    session = SessionLocal()
    char = _uid('boost')
    mind = Mind(
        game_id='middle_earth', character_id=char, preset_slug='x',
        theme_weights={}, wiring={}, mood={}, counters={},
    )
    session.add(mind)
    session.flush()
    for conf, status in ((1.5, 'active'), (4.5, 'weakened')):
        session.add(Belief(
            game_id='middle_earth', character_id=char, kind='world',
            statement='x', strength=conf, status=status,
            tags=[], boosts={'tag:weather:wet': 0.9},
        ))
    session.flush()  # autoflush is off project-wide
    weights = effective_theme_weights(session, mind)
    assert 'tag:weather:wet' not in weights
    session.rollback()
    session.close()


def test_boost_bends_perceived_salience(client):
    slug = _superstitious_mold()
    rainy = _rainy_day()

    believer = _open(client, _uid('believer'), [rainy], preset=slug)
    plain = _open(client, _uid('plain'), [rainy])

    s_believer = believer['psyche_packet']['perceived_day'][0]['salience']
    s_plain = plain['psyche_packet']['perceived_day'][0]['salience']
    assert s_believer > s_plain
    # The boost is w_theme * 0.9 = 0.135 of extra salience.
    assert s_believer - s_plain == pytest.approx(0.135, abs=0.01)
