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
from app.mind.models import DayPayload
from app.natural_language.place_notes import collect_location_notes


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def test_day_payload_accepts_lodging_and_rich_locations():
    # Regression: DayPayload is extra='forbid' — a settlement day must not
    # 422 the episode open.
    day = DayPayload(**{
        'date': '1950-10-09',
        'day_number': 4,
        'is_last_day': True,
        'lodging': {
            'paid': True, 'cost': 5, 'coinsAfter': 12,
            'place': 'Esgaroth',
        },
        'locations': [{
            'name': 'Esgaroth', 'type': 'town', 'region': 'Rhovanion',
            'description_es': 'Una ciudad lacustre sobre el Lago Largo.',
            'population': 910, 'inhabitants': 'lake-men',
            'indoor': True, 'entered': True, 'distance_km': 0.01,
        }],
    })
    assert day.lodging['paid'] is True
    assert day.locations[0].entered is True


def test_open_with_settlement_day_perceives_place_and_rest(client):
    ref = f'settle-{uuid.uuid4().hex[:8]}'
    r = client.post('/episodes', json={
        'game_id': 'middle_earth',
        'character': {'id': f'settle-{uuid.uuid4().hex[:8]}'},
        'episode_ref': ref,
        'events': [
            {
                'type': 'place',
                'when': {'episode': 4, 'phase': 'morning', 'date': '1950-10-09'},
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
                'when': {'episode': 4, 'phase': 'night', 'date': '1950-10-09'},
                'where': {'region': 'Rhovanion'},
                'data': {
                    'place': 'Esgaroth', 'rest_quality': 3,
                    'lodging': {'paid': True, 'cost': 5},
                    'tags': ['paid', 'indoor'],
                },
            },
        ],
        'day': {'day_number': 4, 'lodging': {'paid': True, 'place': 'Esgaroth'}},
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


def test_location_notes_tell_entry_from_passing_by():
    notes = collect_location_notes([
        {'name': 'Esgaroth', 'type': 'town', 'hour_float': 10.45,
         'distance_km': 0.01, 'entered': True},
        {'name': 'Amon Sul', 'type': 'ruins', 'distance_km': 4.0},
        {'name': 'Dol Guldur', 'type': 'fortified city', 'distance_km': 0.3,
         'hostile': True},
    ])
    assert 'the day ends here' in notes[0]
    assert 'passed close by' not in notes[0]
    assert 'passed at some distance' in notes[1]
    assert 'enemy country' in notes[2]
