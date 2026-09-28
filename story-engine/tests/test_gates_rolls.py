# ============================================================================
# B1 smoke — gates & rolls on perceived events
# ----------------------------------------------------------------------------
# The host declares a check inside the event (data.check = {skill, gate?,
# difficulty?, mods?}); the mind resolves it deterministically:
#   gate closed (skill < min) -> unnoticed, no roll thrown
#   roll success              -> noticed (+salience bonus on hard rolls)
#   roll failure              -> unnoticed (no reading, dampened salience)
#   failure while altered     -> misread (a wrong reading from the NL pack)
# All runs against the real local Postgres, like the A12 suite.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _open(client, character, ref, events):
    r = client.post('/episodes', json={
        'game_id': 'middle_earth',
        'character': character,
        'episode_ref': ref,
        'events': events, 'day': {},
    })
    assert r.status_code == 200, r.text
    return r.json()


def _checked_event(check, ep=1):
    return {
        'type': 'encounter',
        'when': {'episode': ep, 'date': '1950-01-19'},
        'where': {'region': 'lone-lands'},
        'data': {'entity': 'wolves', 'check': check},
    }


def _only_event(packet):
    return packet['psyche_packet']['perceived_day'][0]


def test_gate_closed_means_no_roll(client):
    """Skill below the gate floor: the option never existed — unnoticed
    without a die being thrown."""
    packet = _open(
        client, {'id': _uid('gate'), 'skills': {'tracking': 1}},
        'd1', [_checked_event({'skill': 'tracking', 'gate': 5, 'difficulty': 5})],
    )
    item = _only_event(packet)
    assert item['perception'] == 'unnoticed'
    assert item['reading'] is None
    check = item['check']
    assert check['attempted'] is False and check['success'] is False
    assert check['skill'] == 1 and check['min'] == 5
    assert packet['psyche_packet']['check_results'] == [check]


def test_successful_roll_notices(client):
    """skill 8 + d10 >= difficulty 5 always passes; a won roll adds its
    perception bonus to salience vs the same unchecked event."""
    hard = _open(
        client, {'id': _uid('win'), 'skills': {'tracking': 8}},
        'd1', [_checked_event({'skill': 'tracking', 'difficulty': 5})],
    )
    item = _only_event(hard)
    assert item['perception'] == 'noticed'
    assert item['check']['success'] is True
    assert item['check']['roll'] >= 1
    assert item['reading'] == 'wolves'

    plain = _open(client, {'id': _uid('plain')}, 'd1', [{
        'type': 'encounter',
        'when': {'episode': 1, 'date': '1950-01-19'},
        'where': {'region': 'lone-lands'},
        'data': {'entity': 'wolves'},
    }])
    assert item['salience'] > _only_event(plain)['salience']


def test_failed_roll_unnoticed(client):
    """skill 0 + d10 can never reach 25: the event passes unregistered."""
    packet = _open(
        client, {'id': _uid('miss'), 'skills': {'tracking': 0}},
        'd1', [_checked_event({'skill': 'tracking', 'difficulty': 25})],
    )
    item = _only_event(packet)
    assert item['perception'] == 'unnoticed'
    assert item['reading'] is None
    assert item['check']['attempted'] is True
    assert item['check']['success'] is False


def test_failure_while_altered_misreads(client):
    """Same doomed roll, but shadow above the misread floor: the event is
    perceived wrongly instead of not at all."""
    packet = _open(
        client,
        {'id': _uid('fear'), 'skills': {'tracking': 0}, 'shadow': 0.8},
        'd1', [_checked_event({'skill': 'tracking', 'difficulty': 25})],
    )
    item = _only_event(packet)
    assert item['perception'] == 'misread'
    assert item['reading'] is not None and item['reading'] != 'wolves'
    assert item['check']['success'] is False


def test_state_modifiers_bend_the_roll(client):
    """A spent body drags the total down; the mods are reported."""
    tired = _open(
        client,
        {'id': _uid('tired'), 'skills': {'tracking': 8}, 'energy': 10},
        'd1', [_checked_event({'skill': 'tracking', 'difficulty': 5})],
    )
    fresh = _open(
        client,
        {'id': _uid('fresh'), 'skills': {'tracking': 8}, 'energy': 95},
        'd1', [_checked_event({'skill': 'tracking', 'difficulty': 5})],
    )
    assert _only_event(tired)['check']['mods'] == -2.0
    assert _only_event(fresh)['check']['mods'] == 0.0


def test_rolls_are_deterministic(client):
    """The die is seeded by the event, not the character: two different
    minds with the same sheet roll the same number on the same day."""
    events = [_checked_event({'skill': 'tracking', 'difficulty': 8})]
    a = _open(
        client, {'id': _uid('seed-a'), 'skills': {'tracking': 3}}, 'd1', events,
    )
    b = _open(
        client, {'id': _uid('seed-b'), 'skills': {'tracking': 3}}, 'd1', events,
    )
    assert (
        a['psyche_packet']['check_results']
        == b['psyche_packet']['check_results']
    )


def test_episode_state_reports_checks(client):
    opened = _open(
        client, {'id': _uid('state'), 'skills': {'tracking': 8}},
        'd1', [_checked_event({'skill': 'tracking', 'difficulty': 5})],
    )
    r = client.get(f"/episodes/{opened['episode_id']}")
    assert r.status_code == 200
    results = r.json()['check_results']
    assert len(results) == 1 and results[0]['gate'] == 'tracking'
