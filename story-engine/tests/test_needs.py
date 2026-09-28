# ============================================================================
# B2 smoke — needs engine
# ----------------------------------------------------------------------------
# Detectors (physiological) fire from character/body state and auto-resolve
# when the state clears; threads open from `data.thread` markers on noticed
# events and close only via `data.resolves` or `outcome.resolved_needs`.
# needs_active fills the packet, the lens' Needs: section, and the episode
# snapshot. Runs against real Postgres like the rest of the suite.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.db import SessionLocal
from app.mind.tables import Need


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _open(client, character_id, ref, events, extra=None):
    r = client.post('/episodes', json={
        'game_id': 'middle_earth',
        'character': {'id': character_id, **(extra or {})},
        'episode_ref': ref,
        'events': events,
    })
    assert r.status_code == 200, r.text
    return r.json()


def _close(client, episode_id, outcome=None):
    r = client.post(
        f'/episodes/{episode_id}/close', json={'outcome': outcome or {}}
    )
    assert r.status_code == 200, r.text
    return r.json()


def _body(ep, **data):
    return {
        'type': 'body',
        'when': {'episode': ep, 'date': f'1950-01-{18 + ep:02d}'},
        'data': data,
    }


def _quiet(ep):
    return {
        'type': 'travel',
        'when': {'episode': ep, 'date': f'1950-01-{18 + ep:02d}'},
        'data': {'distance_km': 8.0},
    }


def _need_keys(packet):
    return [n['key'] for n in packet['psyche_packet']['needs_active']]


def test_hunger_detector_opens_need(client):
    char = _uid('hungry')
    packet = _open(client, char, 'd1', [_body(1, days_without_food=2)])
    needs = packet['psyche_packet']['needs_active']
    hunger = next(n for n in needs if n['key'] == 'hunger')
    assert hunger['type'] == 'physiological'
    assert hunger['urgency'] == pytest.approx(0.7)  # 0.3 + 0.2 * 2 days
    # And it reaches the lens as an intention, not a number.
    assert 'Needs:' in packet['psyche_packet']['lens_block']
    assert 'hunger' in packet['psyche_packet']['lens_block']


def test_detector_need_clears_when_state_clears(client):
    char = _uid('fed')
    _open(client, char, 'd1', [_body(1, days_without_food=2)])
    second = _open(client, char, 'd2', [_body(2, days_without_food=0)])
    assert 'hunger' not in _need_keys(second)

    session = SessionLocal()
    need = session.query(Need).filter_by(character_id=char, key='hunger').one()
    session.close()
    assert need.status == 'resolved'
    assert need.resolution['reason'] == 'state_cleared'


def test_thread_opens_and_waits(client):
    """A thread survives later quiet episodes — threads never resolve
    themselves."""
    char = _uid('debt')
    owing = {
        'type': 'encounter',
        'when': {'episode': 1, 'date': '1950-01-19'},
        'where': {'region': 'bree'},
        'data': {'entity': 'hobbit-caller', 'thread': 'debt:hobbit'},
    }
    first = _open(client, char, 'd1', [owing])
    needs = first['psyche_packet']['needs_active']
    thread = next(n for n in needs if n['key'] == 'thread:debt:hobbit')
    assert thread['type'] == 'thread'
    assert thread['entity'] == 'hobbit-caller'

    second = _open(client, char, 'd2', [_quiet(2)])
    assert 'thread:debt:hobbit' in _need_keys(second)


def test_thread_resolves_via_event_marker(client):
    char = _uid('settled')
    owing = {
        'type': 'encounter',
        'when': {'episode': 1, 'date': '1950-01-19'},
        'data': {'entity': 'hobbit-caller', 'thread': 'debt:hobbit'},
    }
    _open(client, char, 'd1', [owing])
    repaid = {
        'type': 'encounter',
        'when': {'episode': 2, 'date': '1950-01-20'},
        'data': {'entity': 'hobbit-caller', 'resolves': 'debt:hobbit'},
    }
    second = _open(client, char, 'd2', [repaid])
    assert 'thread:debt:hobbit' not in _need_keys(second)


def test_outcome_resolves_need_at_close(client):
    char = _uid('host-resolved')
    opened = _open(client, char, 'd1', [_body(1, days_without_food=1)])
    assert 'hunger' in _need_keys(opened)
    closed = _close(client, opened['episode_id'], {'resolved_needs': ['hunger']})
    assert closed['needs_resolved'] == 1

    # A later episode without the condition confirms it stays closed.
    again = _open(client, char, 'd2', [_quiet(2)])
    assert 'hunger' not in _need_keys(again)


def test_weather_streak_opens_exposure(client):
    """Three closed hostile-weather episodes open the exposure need."""
    char = _uid('frozen')
    for ep in (1, 2):
        storm = {
            'type': 'climate',
            'when': {'episode': ep, 'date': f'1950-01-{18 + ep:02d}'},
            'data': {'temperature_2m': -6, 'precipitation': 0},
        }
        opened = _open(client, char, f'd{ep}', [storm])
        assert 'exposure' not in _need_keys(opened)
        _close(client, opened['episode_id'])

    third = {
        'type': 'climate',
        'when': {'episode': 3, 'date': '1950-01-21'},
        'data': {'temperature_2m': -6, 'precipitation': 0},
    }
    opened = _open(client, char, 'd3', [third])
    assert 'exposure' in _need_keys(opened)


def test_unnoticed_event_opens_no_thread(client):
    """An event the mind never registered can't leave a thread."""
    char = _uid('blind')
    hidden = {
        'type': 'encounter',
        'when': {'episode': 1, 'date': '1950-01-19'},
        'data': {
            'entity': 'wolves', 'thread': 'danger:wolves',
            'check': {'skill': 'tracking', 'difficulty': 25},
        },
    }
    packet = _open(
        client, char, 'd1', [hidden], extra={'skills': {'tracking': 0}}
    )
    item = packet['psyche_packet']['perceived_day'][0]
    assert item['perception'] == 'unnoticed'
    assert 'thread:danger:wolves' not in _need_keys(packet)
