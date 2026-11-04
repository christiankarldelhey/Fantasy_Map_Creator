# ============================================================================
# C29 — the mind keeps its own clock (bug #3)
# ----------------------------------------------------------------------------
# when.episode is the host's trip day_number — it resets every journey.
# Aging memories by it let a new trip's day 1 collide with an old trip's
# day 1: a week-old memory scored as 'yesterday', and the refractory
# window misfired. episodes.episode_idx counts the brain's lived episodes
# monotonically; created_episode / last_evoked_episode / age phrases all
# anchor on it.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.db import SessionLocal
from app.mind.tables import Memory


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _open(client, char, ref, when_episode, events=None):
    events = events or [{
        'type': 'encounter',
        'when': {'episode': when_episode, 'date': '1950-06-01'},
        'data': {
            'entity': 'dnedain', 'entity_name': 'Dúnedain',
            'entity_type': 'humans', 'form': 'brief_exchange',
            'substance': {
                'content': 'He asks whether she has seen movement north.',
                'stance': 'Answers what she knows.',
            },
        },
    }]
    r = client.post('/episodes', json={
        'game_id': 'middle_earth', 'character': {'id': char},
        'episode_ref': ref, 'events': events, 'day': {},
    })
    assert r.status_code == 200, r.text
    return r.json()


def _state(client, episode_id):
    r = client.get(f'/episodes/{episode_id}')
    assert r.status_code == 200, r.text
    return r.json()


def _close(client, episode_id):
    r = client.post(f'/episodes/{episode_id}/close', json={'outcome': {}})
    assert r.status_code == 200, r.text
    return r.json()


def test_episode_idx_counts_lived_days_not_trip_days(client):
    """Two trips, both starting at when.episode=1 — the brain's counter
    never resets."""
    char = _uid('clock')
    a = _open(client, char, 'tripA:day:1', 1)
    b = _open(client, char, 'tripA:day:2', 2)
    c = _open(client, char, 'tripB:day:1', 1)  # a new journey, day 1

    assert _state(client, a['episode_id'])['episode_idx'] == 1
    assert _state(client, b['episode_id'])['episode_idx'] == 2
    assert _state(client, c['episode_id'])['episode_idx'] == 3


def test_reopen_replays_the_same_idx(client):
    """Idempotent open: re-opening the same episode_ref never advances
    the clock."""
    char = _uid('replay')
    a = _open(client, char, 'tripA:day:1', 1)
    again = _open(client, char, 'tripA:day:1', 1)
    assert again['episode_id'] == a['episode_id']
    assert _state(client, a['episode_id'])['episode_idx'] == 1


def test_old_trip_memory_never_counts_as_fresh(client):
    """The exact bug: a memory encoded on trip A's day 1 must not read
    as same-day when trip B's day 1 arrives — the brain's delta is the
    lived distance, not the day_number coincidence."""
    char = _uid('two-trips')
    first = _open(client, char, 'tripA:day:1', 1)
    _close(client, first['episode_id'])

    # New journey — the host's numbering restarts at day 1, but the
    # brain's clock is already on its second lived episode.
    second = _open(client, char, 'tripB:day:1', 1)
    assert _state(client, second['episode_id'])['episode_idx'] == 2

    session = SessionLocal()
    mem = session.query(Memory).filter_by(
        character_id=char, kind='episodic'
    ).first()
    session.close()
    # Encoded on the brain's day 1, evoked on its day 2: under the old
    # clock both stamps would read 1 — a memory of the last journey
    # posing as one of today.
    assert mem.created_episode == 1
    assert mem.last_evoked_episode == 2
