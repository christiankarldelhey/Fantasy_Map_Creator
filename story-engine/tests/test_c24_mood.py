# ============================================================================
# C24 — the body outranks the temper; a memory renders once
# ----------------------------------------------------------------------------
# Two review findings from a live day-7 packet (energy 0.07, hunger 0.9,
# three days without food — and 'mood: steady'):
#  1. update_brain_mood: under real need pressure the present weighs
#     more than half — a starving body does not blend away into
#     'steady'; the day's need IS the mood.
#  2. Yesterday-recap vs Stirring: a memory encoded yesterday AND evoked
#     today rendered twice in the lens. The recap now yields to the
#     stirring — each memory speaks once.
# ============================================================================
import uuid

from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.db import SessionLocal
from app.mind.lens import update_brain_mood
from app.mind.tables import Memory


@pytest.fixture()
def client():
    return TestClient(main_module.app)


GAME = 'middle_earth'


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def test_extreme_need_keeps_the_mood_honest():
    """Prior 'steady' + a despairing starving day must not resolve back
    to 'steady' — pressure makes the present dominate the blend."""
    session = SessionLocal()
    brain = SimpleNamespace(
        mood={'valence': 0.36, 'arousal': 0.3, 'dominant': 'steady'},
        wiring=None,
    )
    ep_mood = {
        'valence': -0.81, 'arousal': 0.46,
        'dominant': 'despairing', 'need_pressure': 0.27,
    }
    mood = update_brain_mood(session, GAME, brain, ep_mood)
    session.rollback()
    session.close()
    assert mood['valence'] <= -0.25
    assert mood['dominant'] != 'steady'


def test_calm_day_still_blends_half():
    """No need pressure: the running mood keeps its even keel."""
    session = SessionLocal()
    brain = SimpleNamespace(
        mood={'valence': 0.4, 'arousal': 0.2, 'dominant': 'heartened'},
        wiring=None,
    )
    ep_mood = {
        'valence': -0.2, 'arousal': 0.3,
        'dominant': 'steady', 'need_pressure': 0.0,
    }
    mood = update_brain_mood(session, GAME, brain, ep_mood)
    session.rollback()
    session.close()
    assert -0.15 < mood['valence'] < 0.15


def _open(client, char, ep, events):
    r = client.post('/episodes', json={
        'game_id': GAME,
        'character': {'id': char},
        'episode_ref': f'd{ep}',
        'events': events, 'day': {},
    })
    assert r.status_code == 200, r.text
    return r.json()


def test_yesterday_recap_yields_to_todays_stirring(client):
    """Two memories encoded yesterday: the wolf-sign one stirs again
    today (same carnivore contact) and must NOT also sit in the recap;
    the quiet one stays — each memory speaks once."""
    char = _uid('dup')
    session = SessionLocal()
    session.add(Memory(
        game_id=GAME, character_id=char, kind='episodic',
        desc='wolves crossing the south road at dusk',
        tags=['entity:wolves', 'tag:entity_type:carnivores'],
        importance=0.8, strength=0.6, created_episode=1,
    ))
    session.add(Memory(
        game_id=GAME, character_id=char, kind='episodic',
        desc='a long cold night under open sky',
        tags=['tag:rest:open_sky'],
        importance=0.7, strength=0.6, created_episode=1,
    ))
    session.commit()  # the endpoint reads from its own session
    session.close()

    packet = _open(client, char, 2, [{
        'type': 'encounter',
        'when': {'episode': 2, 'date': '1950-04-02', 'phase': 'afternoon'},
        'data': {'entity': 'bears', 'entity_name': 'Bears',
                 'entity_type': 'carnivores'},
    }])
    lens = packet['psyche_packet']['lens_block']
    assert 'Yesterday, as they remember it' in lens
    assert 'a long cold night under open sky' in lens
    assert 'wolves crossing the south road' not in lens
