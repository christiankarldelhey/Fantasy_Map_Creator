# ============================================================================
# C28 — what touched the mechanics weighs more
# ----------------------------------------------------------------------------
# A soup that closed hunger is not the drizzle. The host marks mechanically
# consequential events ('given', 'decision'); the mind's salience_min
# floors lift them out of background and 'affect.tag:given' makes a gift
# feel like kindness. When /decide applies an option's commands the
# perceived items gain 'tag:changed' — the night taken outweighs the
# offer declined.
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


def _open(client, char, events, ref='d1'):
    r = client.post('/episodes', json={
        'game_id': 'middle_earth', 'character': {'id': char},
        'episode_ref': ref, 'events': events, 'day': {},
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
    perceived = opened['psyche_packet']['perceived_day']
    encounter = next(i for i in perceived if i['type'] == 'encounter')
    meal = next(i for i in perceived if i['type'] == 'meal')
    assert 'tag:given' in encounter['tags']
    assert encounter['salience'] >= 0.6
    assert 'tag:given' in meal['tags']
    assert meal['salience'] >= 0.6
    # And it is felt as kindness, not bookkeeping.
    assert encounter['valence'] > 0
    assert meal['valence'] > 0


def test_decision_offer_registers(client):
    """An offer weighed and declined is still a moment — the fork lifts
    to the 'decision' floor even before the host's answer arrives."""
    char = _uid('offered')
    opened = _open(client, char, [{
        'type': 'encounter',
        'when': {'episode': 1, 'date': '1950-06-01'},
        'data': {
            'entity': 'wayhouse', 'entity_type': 'sites',
            'form': 'harvest_shelter',
            'tags': ['decision'],
            'decision': {
                'id': 'shelter-1',
                'options': [
                    {'id': 'stay', 'label': 'take the bed',
                     'commands': [{'type': 'overnight_shelter',
                                   'name': 'the wayhouse',
                                   'rest_quality': 4}]},
                    {'id': 'move_on', 'label': 'walk on', 'commands': []},
                ],
            },
        },
    }])
    item = opened['psyche_packet']['perceived_day'][0]
    assert 'tag:decision' in item['tags']
    assert item['salience'] >= 0.5


def test_applied_decision_marks_changed(client):
    """When the host's pick lands commands, the items the choice touched
    gain 'tag:changed' and rise to its floor — the bed taken weighs more
    than the bed merely offered."""
    char = _uid('taken')
    opened = _open(client, char, [
        {
            'type': 'encounter',
            'when': {'episode': 1, 'date': '1950-06-01'},
            'data': {
                'entity': 'wayhouse', 'entity_type': 'sites',
                'form': 'harvest_shelter',
                'substance': {'stance': 'Marks the lamp for the road back.'},
                'decision': {
                    'id': 'shelter-1',
                    'options': [
                        {'id': 'stay', 'label': 'take the bed',
                         'commands': [{
                             'type': 'overnight_shelter',
                             'name': 'the wayhouse',
                             'rest_quality': 4,
                             'indoor': True}],
                         'stance': 'Takes the bed. Eats the pot.'},
                        {'id': 'move_on', 'label': 'walk on',
                         'commands': []},
                    ],
                },
            },
        },
        {
            'type': 'rest',
            'when': {'episode': 1, 'date': '1950-06-01'},
            'data': {'place': 'open ground', 'rest_quality': 0,
                     'scope': 'region'},
        },
    ])
    r = client.post(
        f"/episodes/{opened['episode_id']}/decide",
        json={'option_id': 'stay'},
    )
    assert r.status_code == 200, r.text

    perceived = client.get(
        f"/episodes/{opened['episode_id']}"
    ).json()['perceived_day']
    encounter = next(i for i in perceived if i['type'] == 'encounter')
    rest = next(i for i in perceived if i['type'] == 'rest')
    assert 'tag:changed' in encounter['tags']
    assert encounter['salience'] >= 0.65
    assert 'tag:changed' in rest['tags']
    assert rest['salience'] >= 0.65


def test_declined_offer_stays_unmarked(client):
    """Walking on applies no command — the contact keeps its offer's
    weight but is never claimed as a thing that changed the body."""
    char = _uid('walked')
    opened = _open(client, char, [{
        'type': 'encounter',
        'when': {'episode': 1, 'date': '1950-06-01'},
        'data': {
            'entity': 'wayhouse', 'entity_type': 'sites',
            'form': 'harvest_shelter',
            'decision': {
                'id': 'shelter-1',
                'options': [
                    {'id': 'stay', 'label': 'take the bed',
                     'commands': [{'type': 'overnight_shelter',
                                   'name': 'the wayhouse'}]},
                    {'id': 'move_on', 'label': 'walk on',
                     'commands': []},
                ],
            },
        },
    }])
    r = client.post(
        f"/episodes/{opened['episode_id']}/decide",
        json={'option_id': 'move_on'},
    )
    assert r.status_code == 200, r.text
    perceived = client.get(
        f"/episodes/{opened['episode_id']}"
    ).json()['perceived_day']
    encounter = next(i for i in perceived if i['type'] == 'encounter')
    assert 'tag:changed' not in encounter['tags']
