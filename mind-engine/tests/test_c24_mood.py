# ============================================================================
# C24 — the body outranks the temper; a memory renders once
# ----------------------------------------------------------------------------
# Two review findings from a live day-7 packet (energy 0.07, hunger 0.9,
# three days without food — and 'mood: steady'):
#  1. update_mind_mood: under real need pressure the present weighs
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
from app.mind.lens import update_mind_mood
from app.mind.tables import Memory


@pytest.fixture()
def client():
    return TestClient(main_module.app)


GAME = 'middle_earth'


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def test_extreme_need_keeps_the_mood_honest():
    """Prior 'steady' + a despairing starving day must not resolve back
    to 'steady' — the projected body drags the mood down on its own."""
    session = SessionLocal()
    mind = SimpleNamespace(
        mood={'valence': 0.36, 'arousal': 0.3, 'dominant': 'steady'},
        wiring=None,
        body={'hunger': 0.9, 'pain': 0.5},
    )
    ep_mood = {
        'valence': -0.81, 'arousal': 0.46,
        'dominant': 'despairing', 'thread_pressure': 0.27,
        'felt': {'fear': 0.4},
    }
    mood = update_mind_mood(session, GAME, mind, ep_mood)
    session.rollback()
    session.close()
    assert mood['valence'] <= -0.25
    assert mood['dominant'] != 'steady'


def test_calm_day_keeps_the_running_mood():
    """The day's pull trajectory already landed near the prior state —
    the running mood keeps the landing, the sound body adds nothing."""
    session = SessionLocal()
    mind = SimpleNamespace(
        mood={'valence': 0.4, 'arousal': 0.2, 'dominant': 'heartened'},
        wiring=None,
        body={},
    )
    ep_mood = {
        # Landing already includes the prior position (#184): the day
        # pulled the 0.4 keel down a touch and it stays there.
        'valence': 0.28, 'arousal': 0.18,
        'dominant': 'steady', 'thread_pressure': 0.0,
        'felt': {'affection': -0.15},
    }
    mood = update_mind_mood(session, GAME, mind, ep_mood)
    session.rollback()
    session.close()
    assert 0.15 < mood['valence'] < 0.35


def _open(client, char, ep, events, condition=None):
    r = client.post('/episodes', json={
        'game_id': GAME,
        'character': {'id': char},
        'episode_ref': f'd{ep}',
        'episode': {'index': ep, 'at': f'1950-10-0{6 + ep}'},
        'condition': condition or {},
        'events': events,
    })
    assert r.status_code == 200, r.text
    return r.json()


# ---------------------------------------------------------------------------
# The entering Mood, told through its cause
# ---------------------------------------------------------------------------
from datetime import date

from app.mind.lens import mood_cause, render_lens
from conftest import open_state


def test_mood_cause_picks_what_weighed_most():
    perceived = [
        {'type': 'climate', 'reading': 'cool, overcast', 'valence': -0.1, 'salience': 0.2},
        {'type': 'encounter', 'reading': 'orc boots, a pursuit gait', 'valence': -0.8, 'salience': 0.6},
        {'type': 'need', 'reading': 'hunger', 'valence': -0.9, 'salience': 0.9},
    ]
    cause = mood_cause(perceived)
    assert cause['reading'] == 'orc boots, a pursuit gait'
    # Ambient noise alone never becomes a cause.
    assert mood_cause(perceived[:1]) is None


def test_mind_mood_carries_its_cause_and_drops_it_at_ease():
    session = SessionLocal()
    mind = SimpleNamespace(
        mood={'valence': 0.0, 'arousal': 0.0}, wiring=None, body={},
    )
    cause = {'reading': 'orc boots, a pursuit gait', 'valence': -0.8}
    mood = update_mind_mood(
        session, GAME, mind,
        {'valence': -0.6, 'arousal': 0.5, 'thread_pressure': 0.0,
         'felt': {'fear': 0.6}},
        cause=cause, when=date(1950, 10, 7),
    )
    assert mood['cause']['reading'] == 'orc boots, a pursuit gait'
    assert mood['cause']['date'] == '1950-10-07'
    # A causeless calm day: the mood settles and lets the cause go.
    mood = update_mind_mood(
        session, GAME, mind,
        {'valence': 0.35, 'arousal': 0.1, 'thread_pressure': 0.0,
         'felt': {'affection': 0.35}},
    )
    session.rollback()
    session.close()
    assert mood['cause'] is None


def test_lens_speaks_the_entering_mood_through_its_cause():
    entering = {
        'valence': -0.4, 'dominant': 'troubled',
        'cause': {'reading': 'orc boots, a pursuit gait', 'valence': -0.8,
                  'date': '1950-10-07'},
    }
    from app.mind.lens import line_text
    mood_line = {'kind': 'mood', 'text': entering['cause']['reading']}
    mood_line['render'] = line_text(mood_line, entering, date(1950, 10, 8))
    block = render_lens(
        'Aranath', {'focus': None, 'carried': [mood_line], 'day': []},
    )
    assert 'Still weighing on them (from yesterday): orc boots, a pursuit gait' in block
    assert 'troubled' not in block


def test_lens_names_the_entering_mood_when_it_stands_somewhere():
    """The wheel word reaches the Lens even without a cause — 'the day
    finds them worried' is how they walk in; 'steady' stays silent."""
    worried = render_lens(
        'Aranath', {'focus': None, 'carried': [], 'day': []},
        mood={'valence': -0.4, 'arousal': 0.2},
    )
    assert 'The day finds them worried.' in worried
    steady = render_lens(
        'Aranath', {'focus': None, 'carried': [], 'day': []},
        mood={'valence': 0.05, 'arousal': 0.05},
    )
    assert 'The day finds them' not in steady
    # No mood passed: the lens stays exactly as before.
    silent = render_lens('Aranath', {'focus': None, 'carried': [], 'day': []})
    assert 'The day finds them' not in silent


def test_episode_lens_never_carries_its_own_day_into_the_mood(client):
    """The orcs of THIS afternoon must not colour this episode's opening:
    the lens speaks the mood the mind carried in. The next episode does
    carry them, as cause."""
    char = _uid('enter')
    orc_day = [{
        'type': 'encounter',
        'when': {'phase': 'afternoon'},
        'data': {'entity': 'orc_trackers', 'entity_name': 'Orc Trackers',
                 'entity_type': 'orcs', 'form': 'attacks', 'danger': 4,
                 'prose_hint': 'orc boots, a pursuit gait'},
    }]
    first = open_state(client, _open(client, char, 1, orc_day))['lens_block']
    assert 'Still weighing on them' not in first
    second = open_state(client, _open(
        client, char, 2, [], condition={'energy': 0.8, 'wounded': 'none'},
    ))['lens_block']
    assert 'Still weighing on them (from yesterday)' in second
    assert 'Orc Trackers' in second
