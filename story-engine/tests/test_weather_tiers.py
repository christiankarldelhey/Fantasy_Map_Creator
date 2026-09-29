# ============================================================================
# C6 smoke — severe weather is an event, mild weather is ambience
# ----------------------------------------------------------------------------
# _semantic_tags tiers climate data: mild tags (wet/windy) mark ambience;
# severe tags (storm/snow/deep_cold/scorching) pair with 'severity.<tag>'
# wiring floors so a hard day of weather carries real salience and
# encodes — drizzle never does. Both feed 'affect.tag:weather:*' valence.
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


def _climate(**data):
    return {
        'type': 'climate',
        'when': {'episode': 1, 'date': '1950-04-15', 'phase': 'afternoon'},
        'data': data,
    }


def _open(client, char, events):
    r = client.post('/episodes', json={
        'game_id': 'middle_earth',
        'character': {'id': char},
        'episode_ref': 'd1',
        'events': events, 'day': {},
    })
    assert r.status_code == 200, r.text
    return r.json()['psyche_packet']['perceived_day'][0]


def test_drizzle_stays_ambient(client):
    """A wet, breezy afternoon is background: wet/windy tags, low
    severity, low salience."""
    item = _open(client, _uid('drizzle'), [_climate(
        precipitation=1.0, wind_speed_10m=20, temperature_2m=12,
    )])
    assert 'tag:weather:wet' in item['tags']
    assert 'tag:weather:windy' in item['tags']
    assert 'tag:weather:storm' not in item['tags']
    assert item['severity'] < 0.3


def test_storm_is_an_event(client):
    """Gale-force wind crosses the storm tier: severity floor applies,
    salience jumps, valence goes negative — the day is *about* weather."""
    storm = _open(client, _uid('storm'), [_climate(
        precipitation=2.0, wind_speed_10m=60, temperature_2m=8,
    )])
    assert 'tag:weather:storm' in storm['tags']
    assert storm['severity'] == 0.6
    assert storm['valence'] < 0

    drizzle = _open(client, _uid('calm'), [_climate(
        precipitation=1.0, wind_speed_10m=20, temperature_2m=12,
    )])
    assert storm['salience'] > drizzle['salience']


def test_storm_by_heavy_phase_precipitation(client):
    """A phase with truly heavy summed precipitation is also a storm,
    even without gale winds."""
    item = _open(client, _uid('deluge'), [_climate(
        precipitation=12.0, wind_speed_10m=10, temperature_2m=15,
    )])
    assert 'tag:weather:storm' in item['tags']
    assert item['severity'] == 0.6


def test_snow_and_deep_cold_tiers(client):
    item = _open(client, _uid('snow'), [_climate(
        precipitation=2.0, temperature_2m=-12, wind_speed_10m=10,
    )])
    assert 'tag:weather:snow' in item['tags']
    assert 'tag:weather:deep_cold' in item['tags']
    assert 'tag:weather:freezing' in item['tags']
    assert item['severity'] == 0.55  # deep_cold beats snow's floor
    assert item['valence'] == -0.3


def test_severity_tag_wiring_is_generic(client):
    """'severity.<tag>' is a mechanism, not a climate special case —
    any tag on any event type can carry a severity floor."""
    r = TestClient(main_module.app).post('/episodes', json={
        'game_id': 'middle_earth',
        'character': {'id': _uid('gen')},
        'episode_ref': 'd1',
        'events': [{
            'type': 'encounter',
            'when': {'episode': 1, 'date': '1950-04-15'},
            'data': {'entity': 'wolves', 'tags': ['omen-of-war']},
        }],
        'day': {},
    })
    assert r.status_code == 200
    # The tag exists but carries no floor by default — severity stays 0.
    item = r.json()['psyche_packet']['perceived_day'][0]
    assert 'tag:omen-of-war' in item['tags']
    assert item['severity'] == 0.0
