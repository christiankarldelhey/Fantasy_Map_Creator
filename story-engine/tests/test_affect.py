# ============================================================================
# Affect channel — derived valence
# ----------------------------------------------------------------------------
# An event's valence comes from the mind's own wiring ('affect.<tag>' /
# 'affect.field:<name>' keys), never from raw plumbing — unless the host
# declares data.valence, which always wins. Episode mood is the
# salience-weighted mean of item valences and blends into the brain's
# running mood; memory stores the *perceived* valence, so the same world
# can leave different traces in different minds.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.db import SessionLocal
from app.mind.tables import Brain, Episode, Memory


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _open(client, char, events, ref):
    r = client.post('/episodes', json={
        'game_id': 'middle_earth',
        'character': {'id': char},
        'episode_ref': ref,
        'events': events,
        'day': {},
    })
    assert r.status_code == 200, r.text
    return r.json()


def _open_and_close(client, char, ref, events):
    opened = _open(client, char, events, ref)
    c = client.post(f"/episodes/{opened['episode_id']}/close", json={})
    assert c.status_code == 200, c.text
    return opened, c.json()


def _encounter(ep, form='confronts', outcome='wounded', danger=3):
    return {
        'type': 'encounter',
        'when': {'episode': ep, 'date': f'1950-01-{18 + ep:02d}'},
        'data': {
            'entity': 'corpse-candles',
            'entity_name': 'Corpse Candles',
            'danger': danger,
            'form': form,
            'outcome': outcome,
        },
    }


def _perceived(char, episode_index=0, item_index=0):
    session = SessionLocal()
    days = (
        session.query(Episode.perceived_day)
        .filter_by(character_id=char)
        .order_by(Episode.created_at)
        .all()
    )
    session.close()
    return days[episode_index][0][item_index]


def _episode_mood(char, episode_index=0):
    session = SessionLocal()
    moods = (
        session.query(Episode.mood)
        .filter_by(character_id=char)
        .order_by(Episode.created_at)
        .all()
    )
    session.close()
    return moods[episode_index][0]


def _brain_mood(char):
    session = SessionLocal()
    brain = session.query(Brain).filter_by(character_id=char).one()
    mood = dict(brain.mood or {})
    session.close()
    return mood


def _set_wiring(char, **wiring):
    session = SessionLocal()
    brain = (
        session.query(Brain)
        .filter_by(game_id='middle_earth', character_id=char)
        .one()
    )
    brain.wiring = {**(brain.wiring or {}), **wiring}
    session.commit()
    session.close()


def test_hostile_encounter_darkens_the_day(client):
    """A confrontation that wounds is a bad day — valence flows from the
    affect wiring into the item, the episode mood and the memory."""
    char = _uid('hurt')
    _open_and_close(client, char, 'd1', [_encounter(1)])

    item = _perceived(char)
    # 'tag:outcome:wounded' (-0.5) beats 'confronts'; 'affect.field:danger'
    # stacks the entity's deadliness (3 × -0.1) on top.
    assert item['valence'] == pytest.approx(-0.8)
    mood = _episode_mood(char)
    assert mood['valence'] < 0
    assert mood['dominant'] != 'steady'

    session = SessionLocal()
    mem = session.query(Memory).filter_by(character_id=char).one()
    session.close()
    assert mem.valence == pytest.approx(-0.8)


def test_host_valence_always_wins(client):
    """An explicit data.valence is the host overriding the mind's read."""
    char = _uid('host')
    event = {**_encounter(1), 'data': {
        **_encounter(1)['data'], 'valence': 0.8,
    }}
    _open_and_close(client, char, 'd1', [event])
    assert _perceived(char)['valence'] == 0.8


def test_numeric_fields_push_valence(client):
    """'affect.field:shadow_effect' scales a number into feeling — the
    night under a haunted place hurts without needing a tag."""
    char = _uid('haunted')
    rest = {
        'type': 'rest',
        'when': {'episode': 1, 'date': '1950-01-19'},
        'data': {'rest_quality': 0, 'shadow_effect': 2},
    }
    _open_and_close(client, char, 'd1', [rest])
    assert _perceived(char)['valence'] == pytest.approx(-0.3)


def test_two_minds_feel_the_same_world_differently(client):
    """The whole point: a brain wired to hate wet weather reads the same
    rain as misery where the default mind stays neutral."""
    stoic = _uid('stoic')
    rain = {
        'type': 'climate',
        'when': {'episode': 1, 'date': '1950-01-19'},
        'data': {'temperature_2m': 10, 'precipitation': 1.0},
    }
    _open_and_close(client, stoic, 'd1', [rain])
    assert _perceived(stoic)['valence'] == 0.0

    tender = _uid('tender')
    _open_and_close(client, tender, 'd1', [rain])  # create the brain first
    _set_wiring(tender, **{'affect.tag:weather:wet': -0.6})
    _open_and_close(client, tender, 'd2', [{
        **rain, 'when': {'episode': 2, 'date': '1950-01-20'},
    }])
    assert _perceived(tender, 1)['valence'] == -0.6


def test_a_bad_day_leaves_a_morning_after(client):
    """Mood blends across episodes: the day after the wound is not a
    reset — the brain's running mood still carries the trace."""
    char = _uid('carrying')
    _open_and_close(client, char, 'd1', [_encounter(1)])
    assert _brain_mood(char)['valence'] < 0

    calm = {
        'type': 'travel',
        'when': {'episode': 2, 'date': '1950-01-20'},
        'data': {'distance_km': 10},
    }
    _open_and_close(client, char, 'd2', [calm])
    assert _episode_mood(char, 1)['valence'] == 0.0  # the day itself: neutral
    assert _brain_mood(char)['valence'] < 0          # the mind: still marked
