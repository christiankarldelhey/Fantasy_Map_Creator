# ============================================================================
# C4 smoke — sleep/wake: night-phase checks pass unheard
# ----------------------------------------------------------------------------
# During `when.phase` in wiring.sleep_phases (default ['night']) the mind
# is unconscious: an event that would take a check is slept through —
# perception 'unnoticed', an 'asleep' trace instead of a roll — unless
# the form is intrusive (sleep_wake_forms) or the outcome is harm already
# done (sleep_wake_outcomes). A nocturnal mold empties sleep_phases.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.db import SessionLocal
from app.mind.tables import Brain


@pytest.fixture()
def client():
    return TestClient(main_module.app)


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


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _open(client, character, events, ref='d1'):
    r = client.post('/episodes', json={
        'game_id': 'middle_earth',
        'character': character,
        'episode_ref': ref,
        'events': events, 'day': {},
    })
    assert r.status_code == 200, r.text
    return r.json()


def _night_encounter(**data):
    return {
        'type': 'encounter',
        'when': {'episode': 1, 'date': '1950-04-15', 'phase': 'night'},
        'where': {'region': 'mirkwood'},
        'data': {
            'entity': 'wolves',
            'check': {'skill': 'tracking', 'difficulty': 5},
            **data,
        },
    }


def _only(packet):
    return packet['psyche_packet']['perceived_day'][0]


def test_night_sign_only_is_slept_through(client):
    """A 02:30 rustle that needs tracking to notice is simply not heard —
    no roll is thrown and the event keeps dampened salience."""
    item = _only(_open(
        client,
        {'id': _uid('asleep'), 'skills': {'tracking': 9}},
        [_night_encounter(form='sign_only')],
    ))
    assert item['perception'] == 'unnoticed'
    assert item['reading'] is None
    check = item['check']
    assert check['asleep'] is True
    assert check['attempted'] is False and check['success'] is False


def test_night_attack_wakes_the_mind(client):
    """An intrusive form reaches consciousness — the roll runs and the
    (always-won) check reports a normal attempt, not sleep."""
    item = _only(_open(
        client,
        {'id': _uid('woken'), 'skills': {'tracking': 9}},
        [_night_encounter(form='attacks')],
    ))
    assert item['perception'] == 'noticed'
    check = item['check']
    assert 'asleep' not in check
    assert check['attempted'] is True and check['success'] is True


def test_night_wound_wakes_the_mind(client):
    """Harm already done needs no intrusion: 'wounded' wakes the sleeper."""
    item = _only(_open(
        client,
        {'id': _uid('wounded'), 'skills': {'tracking': 9}},
        [_night_encounter(form='stalks', outcome='wounded')],
    ))
    assert item['perception'] == 'noticed'
    assert item['check']['attempted'] is True


def test_daytime_encounter_unaffected(client):
    """Sleep only claims sleep phases — the same sign at noon rolls."""
    event = _night_encounter(form='sign_only')
    event['when']['phase'] = 'afternoon'
    item = _only(_open(
        client,
        {'id': _uid('day'), 'skills': {'tracking': 9}},
        [event],
    ))
    assert item['perception'] == 'noticed'
    assert item['check']['attempted'] is True


def test_nocturnal_brain_never_sleeps(client):
    """A brain whose wiring empties sleep_phases rolls at night like day."""
    char = _uid('noct')
    _open(  # first contact creates the brain; then we rewire it.
        client, {'id': char, 'skills': {'tracking': 9}},
        [_night_encounter(form='sign_only')],
        ref='d0',
    )
    _set_wiring(char, sleep_phases=[])
    item = _only(_open(
        client, {'id': char, 'skills': {'tracking': 9}},
        [_night_encounter(form='sign_only')],
        ref='d1',
    ))
    assert item['perception'] == 'noticed'
    assert item['check']['attempted'] is True
