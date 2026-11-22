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
from app.mind.tables import Episode, Memory, Relation
from conftest import open_state


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _rain(ep):
    return {
        'type': 'climate',
        'when': {'episode': ep, 'date': f'1950-04-0{ep}', 'phase': 'afternoon'},
        'data': {'precipitation': 5.0, 'tags': ['weather:wet']},
    }


def _dry(ep):
    return {
        'type': 'climate',
        'when': {'episode': ep, 'date': f'1950-04-0{ep}', 'phase': 'afternoon'},
        'data': {'precipitation': 0.0},
    }


def _open(client, char, ep, events, condition=None):
    r = client.post('/episodes', json={
        'game_id': 'middle_earth',
        'character': {'id': char},
        'episode_ref': f'd{ep}',
        'condition': condition or {},
        'events': events,
    })
    assert r.status_code == 200, r.text
    return r.json()


def _close(client, packet):
    r = client.post(
        f"/episodes/{packet['episode_id']}/close", json={'outcome': {}}
    )
    assert r.status_code == 200, r.text
    return r.json()


def _recurrences(client, packet):
    return [
        i for i in open_state(client, packet)['perceived_day']
        if i['type'] == 'recurrence'
    ]


def test_repetition_pressure_builds_with_the_streak(client):
    """Rain day 1-2: no pressure. Day 3: the sameness starts to weigh —
    a negative recurrence item appears; day 4 weighs more."""
    char = _uid('rain')
    for ep in (1, 2):
        packet = _open(client, char, ep, [_rain(ep)])
        assert _recurrences(client, packet) == []
        _close(client, packet)

    p3 = _open(client, char, 3, [_rain(3)])
    reps = _recurrences(client, p3)
    assert len(reps) == 1
    assert reps[0]['valence'] < 0
    assert reps[0]['data']['streak'] == 3
    _close(client, p3)

    p4 = _open(client, char, 4, [_rain(4)])
    rep4 = _recurrences(client, p4)[0]
    assert rep4['valence'] < reps[0]['valence']
    assert rep4['data']['streak'] == 4


def test_repetition_pressure_darkens_the_mood(client):
    """The wear is mood, not bookkeeping: the third wet day's episode
    mood is the pressure item alone (no other valence source)."""
    char = _uid('mood')
    for ep in (1, 2):
        _close(client, _open(client, char, ep, [_rain(ep)]))
    p3 = _open(client, char, 3, [_rain(3)])
    mind = client.get(f'/mind/state/{char}').json()['mind']
    assert mind['mood']['valence'] < 0


def test_dead_streak_is_one_day_of_news(client):
    """Three wet days then a dry one: the break surfaces positive and
    salient — and encodes as a volatile memory that will fade."""
    char = _uid('break')
    for ep in (1, 2, 3):
        _close(client, _open(client, char, ep, [_rain(ep)]))
    p4 = _open(client, char, 4, [_dry(4)])
    breaks = [
        i for i in _recurrences(client, p4) if i['data'].get('break_of')
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
                     'drink': 'waterskin'},
        }])
        _close(client, packet)
    # Reopen-free: day 4 still on the same fare — pressure from food,
    # silence from drink.
    p4 = _open(client, char, 4, [{
        'type': 'meal',
        'when': {'episode': 4, 'date': '1950-04-04'},
        'data': {'slot': 'midday', 'food': 'lembas',
                 'drink': 'waterskin'},
    }])
    tags = {i['data']['tag'] for i in _recurrences(client, p4)}
    assert 'tag:food:lembas' in tags
    assert 'tag:drink:waterskin' not in tags


def test_a_break_that_starves_is_no_relief(client):
    """C12: three days of the same bread, then the bread runs out while
    the body is already counting meals — the break is warning, not
    good news."""
    char = _uid('starved')
    for ep in (1, 2, 3):
        _close(client, _open(client, char, ep, [{
            'type': 'meal',
            'when': {'episode': ep, 'date': f'1950-04-0{ep}'},
            'data': {'slot': 'midday', 'food': 'lembas',
                     'drink': 'waterskin'},
        }]))

    # Day 4: no lembas, and the condition reports days without food.
    p4 = _open(
        client, char, 4, [], condition={'days_without_food': 2},
    )
    breaks = [i for i in _recurrences(client, p4) if i['data'].get('break_of')]
    assert len(breaks) == 1
    assert breaks[0]['valence'] == pytest.approx(-0.1)
    assert 'wrong way' in breaks[0]['reading'] or 'ended badly' in breaks[0]['reading']


def test_a_break_unwatched_stays_relief(client):
    """The same dead streak is still good news when no linked need is
    open — rain stopping is rain stopping."""
    char = _uid('clear')
    for ep in (1, 2, 3):
        _close(client, _open(client, char, ep, [_rain(ep)]))
    p4 = _open(client, char, 4, [_dry(4)])
    breaks = [i for i in _recurrences(client, p4) if i['data'].get('break_of')]
    assert len(breaks) == 1
    assert breaks[0]['valence'] > 0


def test_marker_tags_never_streak(client):
    """#147: a week of pure mechanical markers — sighted, dead_place,
    settlement, visited — produces no recurrence item and no pattern
    memory. Only declared pattern families can form a theme."""
    char = _uid('markers')
    for ep in (1, 2, 3, 4):
        packet = _open(client, char, ep, [{
            'type': 'travel',
            'when': {'episode': ep, 'date': f'1950-04-0{ep}'},
            'data': {'sighted': 'the ruin', 'entered': 'fords',
                     'tags': ['dead_place', 'settlement', 'visited']},
        }])
        assert _recurrences(client, packet) == []
        _close(client, packet)

    session = SessionLocal()
    patterns = session.query(Memory).filter_by(
        character_id=char, kind='pattern'
    ).all()
    session.close()
    assert patterns == []


def test_sleepless_nights_read_as_sleepless_nights(client):
    """#147: a non-noun streak subject comes from the phrase map, not
    the tag's tail — 'tag:rest:poor' never reads 'poor again'."""
    char = _uid('rest')
    for ep in (1, 2, 3):
        packet = _open(client, char, ep, [{
            'type': 'rest',
            'when': {'episode': ep, 'date': f'1950-04-0{ep}'},
            'data': {'rest': 'poor'},
        }])
        _close(client, packet)

    p4 = _open(client, char, 4, [{
        'type': 'rest',
        'when': {'episode': 4, 'date': '1950-04-04'},
        'data': {'rest': 'poor'},
    }])
    reps = _recurrences(client, p4)
    assert len(reps) == 1
    assert 'sleepless nights' in reps[0]['reading']
    assert 'poor' not in reps[0]['reading']


def _seed_relation(char, subject, **dims):
    session = SessionLocal()
    session.add(Relation(
        game_id='middle_earth', character_id=char, subject=subject,
        origin='seed', **dims))
    session.commit()
    session.close()


def test_dreaded_streak_wears_faster_and_its_break_is_deeper_relief(
        client):
    """#148: standing amplifies the wear — 'orcs again' on day four
    hurts more than the neutral formula because the orcs are feared;
    and when the streak finally dies, losing a hated thing is deeper
    relief than the flat default."""
    char = _uid('dread')
    _seed_relation(char, 'tag:entity_type:orcs', fear=0.8)
    for ep in (1, 2, 3):
        _close(client, _open(client, char, ep, [{
            'type': 'omen',
            'when': {'episode': ep, 'date': f'1950-04-0{ep}'},
            'data': {'tags': ['entity_type:orcs']},
        }]))

    p4 = _open(client, char, 4, [{
        'type': 'omen',
        'when': {'episode': 4, 'date': '1950-04-04'},
        'data': {'tags': ['entity_type:orcs']},
    }])
    reps = [i for i in _recurrences(client, p4)
            if i['data']['tag'] == 'tag:entity_type:orcs']
    # Neutral would be -(0.08 * 2) = -0.16; fear ~0.9 -> ~-0.3.
    assert reps[0]['valence'] < -0.2
    _close(client, p4)

    p5 = _open(client, char, 5, [])
    breaks = [i for i in _recurrences(client, p5) if i['data'].get('break_of')]
    assert len(breaks) == 1
    assert breaks[0]['valence'] > 0.3  # relief_val 0.15 + like*scale


def test_loved_streak_wears_slower_and_its_break_is_a_gap(client):
    """#148: affection slows the wear — the loved bread's day-four
    pressure is milder than the neutral formula — and the day the
    bread runs out is no relief: losing a loved streak is a gap."""
    char = _uid('loved')
    _seed_relation(char, 'tag:food:lembas', affection=0.8)
    for ep in (1, 2, 3):
        _close(client, _open(client, char, ep, [{
            'type': 'meal',
            'when': {'episode': ep, 'date': f'1950-04-0{ep}'},
            'data': {'slot': 'midday', 'food': 'lembas'},
        }]))

    p4 = _open(client, char, 4, [{
        'type': 'meal',
        'when': {'episode': 4, 'date': '1950-04-04'},
        'data': {'slot': 'midday', 'food': 'lembas'},
    }])
    reps = [i for i in _recurrences(client, p4)
            if i['data']['tag'] == 'tag:food:lembas']
    # Neutral would be -0.16; affection halves the wear at most.
    assert len(reps) == 1
    assert -0.16 < reps[0]['valence'] < 0
    _close(client, p4)

    p5 = _open(client, char, 5, [])
    breaks = [i for i in _recurrences(client, p5) if i['data'].get('break_of')]
    assert len(breaks) == 1
    assert breaks[0]['valence'] < 0
    assert 'gap' in breaks[0]['reading']


def test_pressure_anchors_to_its_own_beat(client):
    """#149: the bread complaint sits beside the meal beat, not on the
    first item of the day — 'when' follows the item that carried the
    streaking tag."""
    char = _uid('anchor')
    for ep in (1, 2, 3):
        packet = _open(client, char, ep, [
            {
                'type': 'land',
                'when': {'episode': ep, 'date': f'1950-04-0{ep}',
                         'phase': 'morning'},
                'data': {'tags': ['scenery']},
            },
            {
                'type': 'meal',
                'when': {'episode': ep, 'date': f'1950-04-0{ep}',
                         'phase': 'night'},
                'data': {'slot': 'midday', 'food': 'lembas'},
            },
        ])
        _close(client, packet)

    p4 = _open(client, char, 4, [
        {
            'type': 'land',
            'when': {'episode': 4, 'date': '1950-04-04',
                     'phase': 'morning'},
            'data': {'tags': ['scenery']},
        },
        {
            'type': 'meal',
            'when': {'episode': 4, 'date': '1950-04-04',
                     'phase': 'night'},
            'data': {'slot': 'midday', 'food': 'lembas'},
        },
    ])
    rep = [i for i in _recurrences(client, p4)
           if i['data']['tag'] == 'tag:food:lembas'][0]
    assert rep['when']['phase'] == 'night'


def test_a_salient_novel_event_makes_sameness_yield(client):
    """#149: rain on day four still counts, but a dragon at noon owns
    the day — the pressure item is not voiced (the streak lives)."""
    char = _uid('yield')
    for ep in (1, 2, 3):
        _close(client, _open(client, char, ep, [_rain(ep)]))

    p4 = _open(client, char, 4, [
        _rain(4),
        {
            'type': 'encounter',
            'when': {'episode': 4, 'date': '1950-04-04',
                     'phase': 'afternoon'},
            'data': {'entity': 'dragon_1', 'entity_name': 'a dragon',
                     'tags': ['entity_type:dragons'],
                     'intensity': 4},
        },
    ])
    assert _recurrences(client, p4) == []


def test_the_streaks_own_salience_does_not_silence_it(client):
    """#149: yield looks past the streak itself — orcs at their floor
    do not suppress the orc-streak complaint; they ARE the complaint."""
    char = _uid('ownsal')
    for ep in (1, 2, 3):
        _close(client, _open(client, char, ep, [{
            'type': 'encounter',
            'when': {'episode': ep, 'date': f'1950-04-0{ep}'},
            'data': {'entity': f'orc_{ep}', 'entity_name': 'orcs',
                     'tags': ['entity_type:orcs']},
        }]))

    p4 = _open(client, char, 4, [{
        'type': 'encounter',
        'when': {'episode': 4, 'date': '1950-04-04'},
        'data': {'entity': 'orc_4', 'entity_name': 'orcs',
                 'tags': ['entity_type:orcs']},
    }])
    reps = [i for i in _recurrences(client, p4)
            if i['data']['tag'] == 'tag:entity_type:orcs']
    assert len(reps) == 1


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
    lens = open_state(client, p4)['lens_block']
    assert 'shape of these days' not in lens
    assert 'pattern is unmistakable' not in lens
