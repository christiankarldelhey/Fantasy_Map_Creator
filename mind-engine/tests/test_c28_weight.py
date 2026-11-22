# ============================================================================
# C28 — what touched the mechanics weighs more
# ----------------------------------------------------------------------------
# A soup that closed hunger is not the drizzle. The host marks mechanically
# consequential events ('given', 'changed'); the mind's salience_min
# floors lift them out of background and 'affect.tag:given' makes a gift
# feel like kindness. A fork the interaction engine resolved carries
# 'changed' on the encounter — the night taken outweighs the offer
# walked on.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from conftest import open_state


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _open(client, char, events, ref='d1'):
    r = client.post('/episodes', json={
        'game_id': 'middle_earth', 'character': {'id': char},
        'episode_ref': ref, 'events': events,
    })
    assert r.status_code == 200, r.text
    return r.json()


def _given_events(ep=1):
    """A farm wife feeds the traveller: the contact carries 'given', and
    the provided meal does too."""
    return [
        {
            'type': 'encounter',
            'when': {'episode': ep, 'date': f'1950-06-0{ep}'},
            'data': {
                'entity': 'farmstead', 'entity_name': 'A farmstead',
                'entity_type': 'sites', 'form': 'aid_or_trade',
                'substance': {
                    'content': "Soup on the fire, no questions asked.",
                    'stance': "Eats. Leaves while the light holds.",
                },
                'tags': ['given'],
            },
        },
        {
            'type': 'meal',
            'when': {'episode': ep, 'date': f'1950-06-0{ep}'},
            'data': {
                'slot': 'midday', 'eaten': True,
                'food': "the farm wife's soup",
                'tags': ['given'],
            },
        },
    ]


def test_given_outweighs_ambience(client):
    """A gift registers near the top of the scale — the contact and the
    meal it left behind both clear the 'given' floor."""
    char = _uid('gifted')
    opened = _open(client, char, _given_events())
    perceived = open_state(client, opened)['perceived_day']
    encounter = next(i for i in perceived if i['type'] == 'encounter')
    meal = next(i for i in perceived if i['type'] == 'meal')
    assert 'tag:given' in encounter['tags']
    assert encounter['salience'] >= 0.6
    assert 'tag:given' in meal['tags']
    assert meal['salience'] >= 0.6
    # And it is felt as kindness, not bookkeeping.
    assert encounter['valence'] > 0
    assert meal['valence'] > 0


def test_taken_fork_marks_changed(client):
    """A fork the interaction engine resolved lands as 'changed' — the
    host declares the tag on the encounter event (the bed taken weighs
    more than the bed merely offered)."""
    char = _uid('taken')
    opened = _open(client, char, [
        {
            'type': 'encounter',
            'when': {'episode': 1, 'date': '1950-06-01'},
            'data': {
                'entity': 'wayhouse', 'entity_type': 'sites',
                'form': 'harvest_shelter',
                'substance': {'stance': 'Takes the bed. Eats the pot.'},
                'resolved_choice': {
                    'interaction_id': 'cnt:1:stay',
                    'act': 'accept',
                    'changed': True,
                },
                'tags': ['changed'],
            },
        },
        {
            'type': 'rest',
            'when': {'episode': 1, 'date': '1950-06-01'},
            'data': {'place': 'the wayhouse', 'rest_quality': 4,
                     'scope': 'region'},
        },
    ])
    perceived = open_state(client, opened)['perceived_day']
    encounter = next(i for i in perceived if i['type'] == 'encounter')
    assert 'tag:changed' in encounter['tags']
    assert encounter['salience'] >= 0.65


def test_walked_on_fork_stays_unmarked(client):
    """A 'moved on' pick changes nothing — the host leaves 'changed' off
    and the contact is never claimed as a thing that touched the body."""
    char = _uid('walked')
    opened = _open(client, char, [{
        'type': 'encounter',
        'when': {'episode': 1, 'date': '1950-06-01'},
        'data': {
            'entity': 'wayhouse', 'entity_type': 'sites',
            'form': 'harvest_shelter',
            'resolved_choice': {
                'interaction_id': 'cnt:1:move_on',
                'act': 'avoid',
                'changed': False,
            },
        },
    }])
    perceived = open_state(client, opened)['perceived_day']
    encounter = next(i for i in perceived if i['type'] == 'encounter')
    assert 'tag:changed' not in encounter['tags']
