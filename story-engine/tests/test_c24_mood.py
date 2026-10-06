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

    # C29: the brain's clock counts LIVED episodes — a seeded 'episode 1'
    # memory only reads as yesterday if the mind actually lived a first
    # episode. Open it with a reading-less body event: nothing to tag,
    # nothing to evoke (a named place would semantically stir the wolf
    # memory and set off the refractory quiet).
    _open(client, char, 1, [{
        'type': 'body',
        'when': {'episode': 1, 'date': '1950-04-01'},
        'data': {'energy': 0.8, 'wounded': 'none'},
    }])

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


# ---------------------------------------------------------------------------
# The entering Mood, told through its cause
# ---------------------------------------------------------------------------
from datetime import date

from app.mind.lens import mood_cause, render_lens


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


def test_brain_mood_carries_its_cause_and_drops_it_at_ease():
    session = SessionLocal()
    brain = SimpleNamespace(mood={'valence': 0.0, 'arousal': 0.0}, wiring=None)
    cause = {'reading': 'orc boots, a pursuit gait', 'valence': -0.8}
    mood = update_brain_mood(
        session, GAME, brain,
        {'valence': -0.6, 'arousal': 0.5, 'need_pressure': 0.0},
        cause=cause, when=date(1950, 10, 7),
    )
    assert mood['cause']['reading'] == 'orc boots, a pursuit gait'
    assert mood['cause']['date'] == '1950-10-07'
    # A causeless calm day: the mood settles and lets the cause go.
    mood = update_brain_mood(
        session, GAME, brain,
        {'valence': 0.35, 'arousal': 0.1, 'need_pressure': 0.0},
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
    block = render_lens('Aranath', entering, [], [], needs=[],
                        today=date(1950, 10, 8))
    assert 'Still weighing on them (from yesterday): orc boots, a pursuit gait' in block
    assert 'troubled' not in block


def test_episode_lens_never_carries_its_own_day_into_the_mood(client):
    """The orcs of THIS afternoon must not colour this episode's opening:
    the lens speaks the mood the mind carried in. The next episode does
    carry them, as cause."""
    char = _uid('enter')
    orc_day = [{
        'type': 'encounter',
        'when': {'episode': 1, 'date': '1950-10-07', 'phase': 'afternoon'},
        'data': {'entity': 'orc_trackers', 'entity_name': 'Orc Trackers',
                 'entity_type': 'orcs', 'form': 'attacks', 'danger': 4,
                 'prose_hint': 'orc boots, a pursuit gait'},
    }]
    first = _open(client, char, 1, orc_day)['psyche_packet']['lens_block']
    assert 'Still weighing on them' not in first
    second = _open(client, char, 2, [{
        'type': 'body',
        'when': {'episode': 2, 'date': '1950-10-08'},
        'data': {'energy': 0.8, 'wounded': 'none'},
    }])['psyche_packet']['lens_block']
    assert 'Still weighing on them (from yesterday)' in second
    assert 'Orc Trackers' in second
