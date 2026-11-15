# ============================================================================
# Settlements lived, not just passed
# ----------------------------------------------------------------------------
# The day payload carries what a settlement stop means: 'lodging' reports
# how the night was secured (paid bed, charity plea, door shut), and
# locations flag 'entered'/'hostile' so the prompt never calls a city the
# traveller slept in "passed close by".
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.mind.models import EventIn


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def test_event_wire_accepts_lodging_and_rich_places():
    # The settlement's facts ride events[].data — free-form by contract:
    # how the night was secured and a town 'entered', not passed.
    rest = EventIn(**{
        'type': 'rest',
        'when': {'phase': 'night'},
        'data': {
            'place': 'Esgaroth', 'rest_quality': 3,
            'lodging': {
                'paid': True, 'cost': 5, 'coinsAfter': 12,
                'place': 'Esgaroth',
            },
        },
    })
    place = EventIn(**{
        'type': 'place',
        'when': {'phase': 'morning'},
        'data': {
            'name': 'Esgaroth', 'kind': 'town', 'region': 'Rhovanion',
            'population': 910, 'inhabitants': 'lake-men',
            'indoor': True, 'entered': True, 'distance_km': 0.01,
        },
    })
    assert rest.data['lodging']['paid'] is True
    assert place.data['entered'] is True


def test_open_with_settlement_day_perceives_place_and_rest(client):
    ref = f'settle-{uuid.uuid4().hex[:8]}'
    r = client.post('/episodes', json={
        'game_id': 'middle_earth',
        'character': {'id': f'settle-{uuid.uuid4().hex[:8]}'},
        'episode_ref': ref,
        'episode': {'index': 4, 'at': '1950-10-09'},
        'events': [
            {
                'type': 'place',
                'when': {'phase': 'morning'},
                'where': {'region': 'Rhovanion'},
                'data': {
                    'name': 'Esgaroth', 'kind': 'town', 'population': 910,
                    'inhabitants': 'lake-men',
                    'description': 'A town built on piles over the Long Lake.',
                    'tags': ['settlement', 'entered'],
                },
            },
            {
                'type': 'rest',
                'when': {'phase': 'night'},
                'where': {'region': 'Rhovanion'},
                'data': {
                    'place': 'Esgaroth', 'rest_quality': 3,
                    'lodging': {'paid': True, 'cost': 5},
                    'tags': ['paid', 'indoor'],
                },
            },
        ],
    })
    assert r.status_code == 200, r.text
    perceived = r.json()['psyche_packet']['perceived_day']
    place = next(e for e in perceived if e['type'] == 'place')
    rest = next(e for e in perceived if e['type'] == 'rest')
    # The entered town and the paid bed clear their salience floors —
    # a night inside walls is never background noise.
    assert 'tag:entered' in place['tags']
    assert place['salience'] >= 0.55
    assert 'tag:paid' in rest['tags']
    assert 'tag:indoor' in rest['tags']
    assert rest['salience'] >= 0.3
    # Prose fields never leak into the tag space.
    assert not any(t.startswith('tag:description') for t in place['tags'])
    assert not any(t.startswith('tag:inhabitants') for t in place['tags'])
    assert not any(t.startswith('tag:lodging') for t in rest['tags'])


# The entry-vs-passing-by wording moved host-side with the world voice
# (#54): covered by collectLocationNotes tests in the backend suite.
