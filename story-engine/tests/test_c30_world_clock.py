# ============================================================================
# C30 — the mind ages by the calendar, not by lived-episode distance
# ----------------------------------------------------------------------------
# episode_idx counts lived days for mechanics (refractory, dedup); the
# NARRATIVE age of a memory is calendar distance: a month of rest between
# journeys reads 'a long while ago', never 'yesterday'. episodes carry
# episode_date, memories carry created_date / last_evoked_date; rows that
# predate the columns fall back to the episode clock.
# ============================================================================
import uuid
from datetime import date

from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.db import SessionLocal
from app.mind.retrieval import episode_date_of, memory_age_days
from app.mind.tables import Memory


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _open(client, char, ref, when_episode, day_date, events=None):
    events = events or [{
        'type': 'body',
        'when': {'episode': when_episode, 'date': day_date},
        'data': {'energy': 0.8, 'wounded': 'none'},
    }]
    r = client.post('/episodes', json={
        'game_id': 'middle_earth', 'character': {'id': char},
        'episode_ref': ref, 'events': events, 'day': {},
    })
    assert r.status_code == 200, r.text
    return r.json()


def _close(client, episode_id):
    r = client.post(f'/episodes/{episode_id}/close', json={'outcome': {}})
    assert r.status_code == 200, r.text
    return r.json()


def _state(client, episode_id):
    r = client.get(f'/episodes/{episode_id}')
    assert r.status_code == 200, r.text
    return r.json()


def _mem(client, char, desc, ep, day):
    """Open + close one quiet lived day so a memory gets encoded."""
    eid = _open(client, char, f'd{ep}', ep, day, events=[{
        'type': 'encounter',
        'when': {'episode': ep, 'date': day, 'phase': 'afternoon'},
        'data': {
            'entity': 'witness', 'entity_name': 'A Traveller',
            'entity_type': 'humans', 'form': 'brief_exchange',
            'substance': {'content': desc, 'stance': 'Nods.'},
        },
    }])['episode_id']
    _close(client, eid)


def test_episode_date_stored_from_events(client):
    char = _uid('epdate')
    ep = _open(client, char, 'd1', 1, '1950-08-15')
    assert _state(client, ep['episode_id'])['episode_date'] == '1950-08-15'


def test_memory_created_date_stamped_at_encode(client):
    char = _uid('memdate')
    _mem(client, char, 'the ford ran brown with meltwater', 1, '1950-06-01')
    session = SessionLocal()
    mem = session.query(Memory).filter_by(
        character_id=char, kind='episodic'
    ).first()
    session.close()
    assert mem.created_date == date(1950, 6, 1)


def test_age_phrase_uses_calendar_distance():
    """Same lived-episode gap, different calendar gaps — the calendar
    decides: the previous episode a month ago is 'a long while'."""
    ep_now = SimpleNamespace(
        episode_idx=2, episode_date=date(1950, 8, 1), events=[],
    )
    mem_month = SimpleNamespace(
        created_episode=1, created_date=date(1950, 7, 1),
    )
    mem_yesterday = SimpleNamespace(
        created_episode=1, created_date=date(1950, 7, 31),
    )
    assert memory_age_days(ep_now, mem_month) == 31
    assert memory_age_days(ep_now, mem_yesterday) == 1


def test_memory_age_days_legacy_fallback():
    """Rows predating the date columns age by the episode clock."""
    ep = SimpleNamespace(episode_idx=5, episode_date=None, events=[])
    mem = SimpleNamespace(created_episode=3, created_date=None)
    assert memory_age_days(ep, mem) == 2


def test_episode_date_of_parses_when_date():
    ep = SimpleNamespace(
        episode_date=None,
        events=[{'when': {'date': '1950-06-21 13:00:00'}}],
    )
    assert episode_date_of(ep) == date(1950, 6, 21)


def test_month_gap_recaps_under_true_age_not_yesterday(client):
    """The bug's calendar face: episode 2 lived a MONTH after episode 1 —
    its memory must not recap as 'Yesterday' and must age as a month."""
    char = _uid('gap')
    _mem(client, char, 'the ranger shared his fire', 1, '1950-06-01')

    # Next lived episode — but a month of rest has passed in-world.
    packet = _open(client, char, 'd2', 2, '1950-07-01')
    lens = packet['psyche_packet']['lens_block']
    assert 'Yesterday, as they remember it' not in lens


def test_true_yesterday_still_recaps(client):
    char = _uid('truey')
    _mem(client, char, 'the ford ran brown with meltwater', 1, '1950-06-01')
    packet = _open(client, char, 'd2', 2, '1950-06-02')
    lens = packet['psyche_packet']['lens_block']
    assert 'Yesterday, as they remember it' in lens
    assert 'the ford ran brown' in lens


def test_last_evoked_date_stamped(client):
    """An evoked memory records the calendar day it stirred."""
    char = _uid('evoked')
    _mem(client, char, 'the Dúnedain asked after the north', 1, '1950-06-01')
    # Same contact tag two calendar days later — the memory stirs.
    _open(client, char, 'd2', 2, '1950-06-03', events=[{
        'type': 'encounter',
        'when': {'episode': 2, 'date': '1950-06-03'},
        'data': {
            'entity': 'dnedain', 'entity_name': 'Dúnedain',
            'entity_type': 'humans', 'form': 'brief_exchange',
            'substance': {'content': 'He nods at the road.', 'stance': '.'},
        },
    }])
    session = SessionLocal()
    mem = session.query(Memory).filter_by(
        character_id=char, kind='episodic'
    ).first()
    session.close()
    assert mem.last_evoked_date == date(1950, 6, 3)
