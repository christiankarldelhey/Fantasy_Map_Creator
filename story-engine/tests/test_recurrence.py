# ============================================================================
# C5 smoke — repetition pressure + pattern breaks
# ----------------------------------------------------------------------------
# A content tag perceived in >= repetition_min_streak consecutive
# episodes synthesizes a 'recurrence' item: negative valence that grows
# with the streak, weighing on the episode mood through the ordinary
# salience-weighted mean. A streak that dies today produces a one-day
# 'break' item — positive, encodable, then forgotten like anything.
# Pattern memories never enter retrieval: their voice is this channel.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.db import SessionLocal
from app.mind.tables import Episode, Memory


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _rain(ep):
    return {
        'type': 'climate',
        'when': {'episode': ep, 'date': f'1950-04-0{ep}', 'phase': 'afternoon'},
        'data': {'precipitation': 5.0},
    }


def _dry(ep):
    return {
        'type': 'climate',
        'when': {'episode': ep, 'date': f'1950-04-0{ep}', 'phase': 'afternoon'},
        'data': {'precipitation': 0.0},
    }


def _open(client, char, ep, events):
    r = client.post('/episodes', json={
        'game_id': 'middle_earth',
        'character': {'id': char},
        'episode_ref': f'd{ep}',
        'events': events, 'day': {},
    })
    assert r.status_code == 200, r.text
    return r.json()


def _close(client, packet):
    r = client.post(
        f"/episodes/{packet['episode_id']}/close", json={'outcome': {}}
    )
    assert r.status_code == 200, r.text
    return r.json()


def _recurrences(packet):
    return [
        i for i in packet['psyche_packet']['perceived_day']
        if i['type'] == 'recurrence'
    ]


def test_repetition_pressure_builds_with_the_streak(client):
    """Rain day 1-2: no pressure. Day 3: the sameness starts to weigh —
    a negative recurrence item appears; day 4 weighs more."""
    char = _uid('rain')
    for ep in (1, 2):
        packet = _open(client, char, ep, [_rain(ep)])
        assert _recurrences(packet) == []
        _close(client, packet)

    p3 = _open(client, char, 3, [_rain(3)])
    reps = _recurrences(p3)
    assert len(reps) == 1
    assert reps[0]['valence'] < 0
    assert reps[0]['data']['streak'] == 3
    _close(client, p3)

    p4 = _open(client, char, 4, [_rain(4)])
    rep4 = _recurrences(p4)[0]
    assert rep4['valence'] < reps[0]['valence']
    assert rep4['data']['streak'] == 4


def test_repetition_pressure_darkens_the_mood(client):
    """The wear is mood, not bookkeeping: the third wet day's episode
    mood is the pressure item alone (no other valence source)."""
    char = _uid('mood')
    for ep in (1, 2):
        _close(client, _open(client, char, ep, [_rain(ep)]))
    p3 = _open(client, char, 3, [_rain(3)])
    assert p3['psyche_packet']['mood']['valence'] < 0


def test_dead_streak_is_one_day_of_news(client):
    """Three wet days then a dry one: the break surfaces positive and
    salient — and encodes as a volatile memory that will fade."""
    char = _uid('break')
    for ep in (1, 2, 3):
        _close(client, _open(client, char, ep, [_rain(ep)]))
    p4 = _open(client, char, 4, [_dry(4)])
    breaks = [
        i for i in _recurrences(p4) if i['data'].get('break_of')
    ]
    assert len(breaks) == 1
    assert breaks[0]['valence'] > 0
    _close(client, p4)

    session = SessionLocal()
    mem = session.query(Memory).filter_by(
        character_id=char, kind='episodic'
    ).filter(Memory.tags == ['rupture:tag:weather:wet']).one_or_none()
    session.close()
    assert mem is not None
    assert mem.consolidated is False  # volatile: it fades like any day


def test_pressure_items_do_not_encode(client):
    """'The rain again' is bookkeeping — only the rain days themselves
    are memories."""
    char = _uid('noenc')
    for ep in (1, 2, 3):
        _close(client, _open(client, char, ep, [_rain(ep)]))
    session = SessionLocal()
    descs = [
        m.desc for m in session.query(Memory)
        .filter_by(character_id=char).all()
    ]
    session.close()
    assert not any('sameness' in d or 'grates' in d for d in descs)


def test_base_routine_never_grates(client):
    """Water daily is life, not monotony — 'tag:drink:*' is exempt by
    default while the same fare ('tag:food:*') does wear."""
    char = _uid('routine')
    for ep in (1, 2, 3):
        packet = _open(client, char, ep, [{
            'type': 'meal',
            'when': {'episode': ep, 'date': f'1950-04-0{ep}'},
            'data': {'slot': 'midday', 'food': 'lembas',
                     'drink': 'water from the skin'},
        }])
        _close(client, packet)
    # Reopen-free: day 4 still on the same fare — pressure from food,
    # silence from drink.
    p4 = _open(client, char, 4, [{
        'type': 'meal',
        'when': {'episode': 4, 'date': '1950-04-04'},
        'data': {'slot': 'midday', 'food': 'lembas',
                 'drink': 'water from the skin'},
    }])
    tags = {i['data']['tag'] for i in _recurrences(p4)}
    assert 'tag:food:lembas' in tags
    assert 'tag:drink:water from the skin' not in tags


def test_patterns_never_enter_retrieval(client):
    """kind='pattern' memories are background: even with nothing else to
    stir, the lens' impressions stay free of 'the shape of these days'."""
    char = _uid('lens')
    for ep in (1, 2, 3):
        _close(client, _open(client, char, ep, [_rain(ep)]))

    session = SessionLocal()
    patterns = session.query(Memory).filter_by(
        character_id=char, kind='pattern'
    ).all()
    session.close()
    assert patterns, 'expected a weather pattern to have formed'

    # A fresh episode stirs memory — patterns must not be in it.
    p4 = _open(client, char, 4, [_rain(4)])
    lens = p4['psyche_packet']['lens_block']
    assert 'shape of these days' not in lens
    assert 'pattern is unmistakable' not in lens
