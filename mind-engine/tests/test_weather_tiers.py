# ============================================================================
# C6 smoke — severe weather is an event, mild weather is ambience
# ----------------------------------------------------------------------------
# The host declares 'weather:*' tiers on climate events (#53 — the mind
# never derives tags from raw numbers). Mild tags (wet/windy) mark
# ambience; severe tiers ride the shared 'data.intensity' dial (0-4)
# so a hard day of weather carries real salience and encodes — drizzle
# never does. The felt channel reads the 'tag:weather:*' semantics rows
# (ADR 0017).
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


def _climate(tags=(), **data):
    return {
        'type': 'climate',
        'when': {'episode': 1, 'date': '1950-04-15', 'phase': 'afternoon'},
        'data': {**data, 'tags': list(tags)},
    }


def _open(client, char, events):
    r = client.post('/episodes', json={
        'game_id': 'middle_earth',
        'character': {'id': char},
        'episode_ref': 'd1',
        'events': events,
    })
    assert r.status_code == 200, r.text
    return open_state(client, r.json())['perceived_day'][0]


def test_drizzle_stays_ambient(client):
    """A wet, breezy afternoon is background: wet/windy tags, low
    severity, low salience."""
    item = _open(client, _uid('drizzle'), [_climate(
        ['weather:wet', 'weather:windy'],
        precipitation=1.0, wind_speed_10m=20, temperature_2m=12,
    )])
    assert 'tag:weather:wet' in item['tags']
    assert 'tag:weather:windy' in item['tags']
    assert 'tag:weather:storm' not in item['tags']
    assert item['severity'] < 0.3


def test_storm_is_an_event(client):
    """A declared storm tier rides the intensity dial: salience jumps,
    valence goes negative — the day is *about* weather."""
    storm = _open(client, _uid('storm'), [_climate(
        ['weather:storm'],
        intensity=3,
        precipitation=2.0, wind_speed_10m=60, temperature_2m=8,
    )])
    assert 'tag:weather:storm' in storm['tags']
    assert storm['severity'] == 0.75  # intensity 3 on the shared dial
    assert storm['valence'] < 0

    drizzle = _open(client, _uid('calm'), [_climate(
        ['weather:wet', 'weather:windy'],
        precipitation=1.0, wind_speed_10m=20, temperature_2m=12,
    )])
    assert storm['salience'] > drizzle['salience']


def test_severe_tiers_carry_floors(client):
    """Severe tiers share the intensity dial; the host stamps the
    strongest the day carried — deep cold drives the day here."""
    item = _open(client, _uid('snow'), [_climate(
        ['weather:snow', 'weather:deep_cold', 'weather:freezing'],
        intensity=3,
        precipitation=2.0, temperature_2m=-12, wind_speed_10m=10,
    )])
    assert 'tag:weather:snow' in item['tags']
    assert 'tag:weather:deep_cold' in item['tags']
    assert 'tag:weather:freezing' in item['tags']
    assert item['severity'] == 0.75  # intensity 3 on the shared dial
    # The felt channel reads the tiers as pull words (#184): one word
    # per event — deep_cold -> 'tense' wins by declared precedence,
    # and the event's felt colour is that single pull's target.
    assert item['valence'] == pytest.approx(-0.18, abs=0.02)
    assert [p['word'] for p in item['mood_pull']] == ['tense']
    assert item['imprint']['fear'] > 0


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
    })
    assert r.status_code == 200
    # The tag exists but carries no floor by default — severity stays 0.
    item = open_state(client, r.json())['perceived_day'][0]
    assert 'tag:omen-of-war' in item['tags']
    assert item['severity'] == 0.0
