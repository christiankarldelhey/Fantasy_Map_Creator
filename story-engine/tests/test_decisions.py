# ============================================================================
# B5 smoke — decision points + /decide
# ----------------------------------------------------------------------------
# An event carrying data.decision surfaces a decision_point in open and
# narrate responses; POST /decide records the host's pick, returns the
# option's proposed_commands (the mind proposes, never executes) and a
# resolution line. Re-deciding the same option replays; a different one
# conflicts.
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


def _decision_event(ep=1):
    return {
        'type': 'crossroads',
        'when': {'episode': ep, 'date': f'1950-01-{18 + ep:02d}'},
        'data': {
            'decision': {
                'id': 'bridge_or_wood',
                'prompt': 'The bridge is watched; the wood is dark.',
                'options': [
                    {'id': 'bridge', 'label': 'take the watched bridge',
                     'tags': ['risk:bold'],
                     'commands': [{'type': 'state_change',
                                   'field': 'route', 'value': 'bridge'}]},
                    {'id': 'wood', 'label': 'slip through the dark wood',
                     'tags': ['risk:cautious'],
                     'commands': [{'type': 'state_change',
                                   'field': 'route', 'value': 'wood'},
                                  {'type': 'goal_resolve',
                                   'goal': 'avoid_watchers'}]},
                ],
            }
        },
    }


def _open(client, char, events, ref='d1'):
    r = client.post('/episodes', json={
        'game_id': 'middle_earth', 'character': {'id': char},
        'episode_ref': ref, 'events': events, 'day': {},
    })
    assert r.status_code == 200, r.text
    return r.json()


def test_decision_point_in_open_packet(client):
    char = _uid('dec')
    opened = _open(client, char, [_decision_event()])
    point = opened['psyche_packet']['decision_point']
    assert point['decision_id'] == 'bridge_or_wood'
    assert point['prompt'] == 'The bridge is watched; the wood is dark.'
    assert {o['id'] for o in point['options']} == {'bridge', 'wood'}
    # Options carry no commands in the point — commands ship at decide.
    assert all('commands' not in o for o in point['options'])


def test_decide_returns_proposed_commands(client):
    char = _uid('dec')
    opened = _open(client, char, [_decision_event()])
    ep = opened['episode_id']

    r = client.post(f'/episodes/{ep}/decide', json={'option_id': 'wood'})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body['decision_id'] == 'bridge_or_wood'
    assert body['proposed_commands'] == [
        {'type': 'state_change', 'field': 'route', 'value': 'wood'},
        {'type': 'goal_resolve', 'goal': 'avoid_watchers'},
    ]
    assert body['already_decided'] is False
    assert 'slip through the dark wood' in body['resolution']

    # The state endpoint reports the recorded pick + pending commands.
    state = client.get(f'/episodes/{ep}').json()
    assert state['decisions'] == {'bridge_or_wood': 'wood'}
    assert state['proposed_commands'] == body['proposed_commands']
    assert state['decision_point'] is None  # resolved — nothing pending


def test_decide_idempotent_and_conflict(client):
    char = _uid('dec')
    opened = _open(client, char, [_decision_event()])
    ep = opened['episode_id']

    client.post(f'/episodes/{ep}/decide', json={'option_id': 'wood'})
    replay = client.post(f'/episodes/{ep}/decide',
                         json={'option_id': 'wood'})
    assert replay.status_code == 200
    assert replay.json()['already_decided'] is True

    conflict = client.post(f'/episodes/{ep}/decide',
                           json={'option_id': 'bridge'})
    assert conflict.status_code == 409


def test_decide_unknowns(client):
    char = _uid('dec')
    opened = _open(client, char, [_decision_event()])
    ep = opened['episode_id']

    bad_option = client.post(f'/episodes/{ep}/decide',
                             json={'option_id': 'nope'})
    assert bad_option.status_code == 422
    bad_decision = client.post(
        f'/episodes/{ep}/decide',
        json={'option_id': 'wood', 'decision_id': 'ghost'})
    assert bad_decision.status_code == 404

    # No decision declared at all → 404.
    no_dec = _open(client, _uid('plain'), [
        {'type': 'meal',
         'when': {'episode': 1, 'date': '1950-01-19'},
         'data': {'food': 'bread'}},
    ])
    r = client.post(f"/episodes/{no_dec['episode_id']}/decide",
                    json={'option_id': 'x'})
    assert r.status_code == 404


def test_recommended_follows_theme_weights(client):
    """A brain that weighs risk:bold high recommends the bold option;
    one without opinionated wiring recommends nothing."""
    from app.db import SessionLocal
    from app.mind.tables import BrainMold, MoldThemeWeight

    session = SessionLocal()
    slug = _uid('bold')
    mold = BrainMold(game_id='middle_earth', slug=slug, name='Bold')
    session.add(mold)
    session.flush()
    session.add(MoldThemeWeight(mold_id=mold.id,
                                key='risk:bold', weight=0.8))
    session.commit()
    session.close()

    char = _uid('bold-heart')
    opened = client.post('/episodes', json={
        'game_id': 'middle_earth',
        'character': {'id': char, 'brain_profile': slug},
        'episode_ref': 'd1',
        'events': [_decision_event()], 'day': {},
    }).json()
    point = opened['psyche_packet']['decision_point']
    assert point['recommended'] == 'bridge'

    plain = _open(client, _uid('plain-heart'), [_decision_event()])
    assert 'recommended' not in plain['psyche_packet']['decision_point']
