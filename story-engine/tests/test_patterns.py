# ============================================================================
# B3 smoke — pattern memories
# ----------------------------------------------------------------------------
# A non-type tag seen in >= pattern_min_episodes (3) of the last
# pattern_window (4) episodes consolidates into a fixed kind='pattern'
# memory. Fragments keep decaying; the theme persists.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.db import SessionLocal
from app.mind.tables import Memory


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _open_and_close(client, character_id, ref, events):
    r = client.post('/episodes', json={
        'game_id': 'middle_earth',
        'character': {'id': character_id},
        'episode_ref': ref,
        'events': events,
        'day': {},
    })
    assert r.status_code == 200, r.text
    opened = r.json()
    c = client.post(f"/episodes/{opened['episode_id']}/close", json={})
    assert c.status_code == 200, c.text
    return opened, c.json()


def _meal(ep, food='lembas'):
    return {
        'type': 'meal',
        'when': {'episode': ep, 'date': f'1950-01-{18 + ep:02d}'},
        'data': {'food': food},
    }


def _patterns(character_id):
    session = SessionLocal()
    rows = (
        session.query(Memory)
        .filter_by(character_id=character_id, kind='pattern')
        .all()
    )
    session.close()
    return rows


def test_repeated_tag_consolidates_into_pattern(client):
    char = _uid('pat')
    last_close = None
    for ep in (1, 2, 3):
        _, last_close = _open_and_close(client, char, f'd{ep}', [_meal(ep)])
    assert last_close['patterns'] == 1

    patterns = _patterns(char)
    assert len(patterns) == 1
    pat = patterns[0]
    assert pat.tags == ['tag:food:lembas']
    assert pat.consolidated is True
    assert 'lembas' in pat.desc


def test_two_episodes_are_not_a_pattern(client):
    char = _uid('short')
    for ep in (1, 2):
        _open_and_close(client, char, f'd{ep}', [_meal(ep)])
    assert _patterns(char) == []


def test_pattern_does_not_duplicate(client):
    char = _uid('nodup')
    for ep in (1, 2, 3, 4):
        _, close = _open_and_close(client, char, f'd{ep}', [_meal(ep)])
    assert close['patterns'] == 0  # day 4 re-touches, never re-creates
    assert len(_patterns(char)) == 1


def test_weather_pattern_via_semantic_tags(client):
    """Climate events are numeric-only — the 'tag:weather:freezing' tag is
    derived from NL thresholds, and three frozen days form the theme."""
    char = _uid('frozenpat')
    for ep in (1, 2, 3):
        storm = {
            'type': 'climate',
            'when': {'episode': ep, 'date': f'1950-01-{18 + ep:02d}'},
            'data': {'temperature_2m': -6, 'precipitation': 0},
        }
        _open_and_close(client, char, f'd{ep}', [storm])
    patterns = _patterns(char)
    assert any(p.tags == ['tag:weather:freezing'] for p in patterns)


def test_patterns_never_decay(client):
    """The pattern is consolidated at birth: it outlives the fragments
    that fed it."""
    char = _uid('outlives')
    for ep in (1, 2, 3):
        _open_and_close(client, char, f'd{ep}', [_meal(ep)])
    for ep in range(4, 12):  # long quiet stretch — fragments die
        quiet = {
            'type': 'travel',
            'when': {'episode': ep, 'date': f'1950-01-{18 + ep:02d}'},
            'data': {'distance_km': 9.0},
        }
        _open_and_close(client, char, f'd{ep}', [quiet])
    session = SessionLocal()
    rows = session.query(Memory).filter_by(character_id=char).all()
    session.close()
    patterns = [m for m in rows if m.kind == 'pattern']
    fragments = [m for m in rows if m.kind == 'episodic']
    assert len(patterns) == 1
    assert all(m.desc != 'food: lembas' for m in fragments)
