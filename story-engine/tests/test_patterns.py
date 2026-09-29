# ============================================================================
# B3 smoke — pattern memories
# ----------------------------------------------------------------------------
# A theme-eligible tag (entity:*, region:*, tag:weather:*, or a
# single-segment host tag) perceived in >= pattern_min_episodes (3) of
# the last pattern_window (4) episodes consolidates into a fixed
# kind='pattern' memory. Raw 'tag:<field>:<value>' pairs are bookkeeping,
# never themes. Patterns whose theme stops recurring fade like volatiles.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.db import SessionLocal
from app.mind.embeddings import embed
from app.mind.tables import Brain, Episode, Memory


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


def _travel(ep, region=None):
    return {
        'type': 'travel',
        'when': {'episode': ep, 'date': f'1950-01-{18 + ep:02d}'},
        'where': {'region': region},
        'data': {'distance_km': 9.0},
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


def _all_tags(character_id):
    session = SessionLocal()
    days = (
        session.query(Episode.perceived_day)
        .filter_by(character_id=character_id)
        .all()
    )
    session.close()
    tags = set()
    for (day,) in days:
        for item in day or []:
            tags.update(item.get('tags') or [])
    return tags


def _set_wiring(character_id, **wiring):
    session = SessionLocal()
    brain = (
        session.query(Brain)
        .filter_by(game_id='middle_earth', character_id=character_id)
        .one()
    )
    brain.wiring = {**(brain.wiring or {}), **wiring}
    session.commit()
    session.close()


def test_repeated_tag_consolidates_into_pattern(client):
    char = _uid('pat')
    last_close = None
    for ep in (1, 2, 3):
        _, last_close = _open_and_close(
            client, char, f'd{ep}', [_travel(ep, 'Dor Guldur')]
        )
    assert last_close['patterns'] == 1

    patterns = _patterns(char)
    assert len(patterns) == 1
    pat = patterns[0]
    assert pat.tags == ['region:Dor Guldur']
    assert pat.consolidated is True
    assert 'Dor Guldur' in pat.desc


def test_two_episodes_are_not_a_pattern(client):
    char = _uid('short')
    for ep in (1, 2):
        _open_and_close(client, char, f'd{ep}', [_travel(ep, 'Dor Guldur')])
    assert _patterns(char) == []


def test_pattern_does_not_duplicate(client):
    char = _uid('nodup')
    for ep in (1, 2, 3, 4):
        _, close = _open_and_close(
            client, char, f'd{ep}', [_travel(ep, 'Dor Guldur')]
        )
    assert close['patterns'] == 0  # day 4 re-touches, never re-creates
    assert len(_patterns(char)) == 1


def test_host_theme_tags_form_patterns(client):
    """A single-segment host tag ('tags': ['omen']) is curated semantics —
    eligible for patterns. Multi-segment 'tag:<field>:<value>' is not."""
    char = _uid('theme')
    for ep in (1, 2, 3):
        event = {
            'type': 'omen',
            'when': {'episode': ep, 'date': f'1950-01-{18 + ep:02d}'},
            'data': {'tags': ['road-weariness']},
        }
        _open_and_close(client, char, f'd{ep}', [event])
    patterns = _patterns(char)
    assert [p.tags for p in patterns] == [['tag:road-weariness']]


def test_field_values_never_form_patterns(client):
    """The daily ration is bookkeeping: 'tag:food:lembas' feeds weights and
    retrieval but must never consolidate into a recurring theme."""
    char = _uid('ration')
    for ep in (1, 2, 3):
        _open_and_close(client, char, f'd{ep}', [_meal(ep)])
    assert _patterns(char) == []
    assert 'tag:food:lembas' in _all_tags(char)


def test_absence_markers_never_tag_or_pattern(client):
    """'wounded: none' reports nothing happened — it must not tag, let
    alone become the mind's strongest recurring memory."""
    char = _uid('unwounded')
    for ep in (1, 2, 3):
        body = {
            'type': 'body',
            'when': {'episode': ep, 'date': f'1950-01-{18 + ep:02d}'},
            'data': {'wounded': 'none', 'food': None, 'rest': 'Null'},
        }
        _open_and_close(client, char, f'd{ep}', [body])
    tags = _all_tags(char)
    assert 'tag:wounded:none' not in tags
    assert 'tag:rest:Null' not in tags
    assert not any(t.startswith('tag:wounded:') for t in tags)
    assert _patterns(char) == []


def test_prose_fields_are_words_not_tags(client):
    """Free prose (description, prose_hint) feeds readings and memory but
    must never enter the tag space — a paragraph is not a theme key."""
    char = _uid('prose')
    rest = {
        'type': 'rest',
        'when': {'episode': 1, 'date': '1950-01-19'},
        'data': {
            'rest_quality': 0, 'shadow_effect': 2,
            'place': 'the barrow field',
            'description': 'the will itself feels weighed and probed',
        },
    }
    _open_and_close(client, char, 'd1', [rest])
    tags = _all_tags(char)
    assert not any(t.startswith('tag:description:') for t in tags)


def test_rest_reads_the_nights_own_prose(client):
    """The overnight's authored description is the reading of the night —
    the numbers alone left the worst nights invisible."""
    char = _uid('reader')
    rest = {
        'type': 'rest',
        'when': {'episode': 1, 'date': '1950-01-19'},
        'data': {
            'rest_quality': 0, 'shadow_effect': 2,
            'description': 'the will itself feels weighed and probed',
        },
    }
    _open_and_close(client, char, 'd1', [rest])
    session = SessionLocal()
    day = session.query(Episode.perceived_day).filter_by(
        character_id=char
    ).scalar()
    session.close()
    assert day[0]['reading'] == 'the will itself feels weighed and probed'


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


def test_ineligible_pattern_artifacts_are_evicted(client):
    """A pattern born under the old rules on a bookkeeping tag
    ('tag:wounded:none') was never a theme — the first close deletes it,
    even though retrieval keeps stirring it."""
    char = _uid('legacy')
    session = SessionLocal()
    session.add(Memory(
        game_id='middle_earth',
        character_id=char,
        episode_ids=[],
        kind='pattern',
        tags=['tag:wounded:none'],
        desc='none again — it is becoming the shape of these days',
        valence=0.0,
        importance=1.0,
        strength=1.0,
        evocations=5,
        consolidated=True,
        origin='experience',
        created_episode=0,
        embedding=embed('none again'),
    ))
    session.commit()
    session.close()

    _open_and_close(client, char, 'd1', [_travel(1)])
    assert _patterns(char) == []


def test_patterns_fade_when_theme_stops(client):
    """Patterns live by recurrence: once the theme leaves the window the
    memory dissolves back into routine, strength decaying to forgetting.
    Ambient recall is disabled here — a stirred pattern does not fade."""
    char = _uid('outlives')
    for ep in (1, 2, 3):
        _open_and_close(client, char, f'd{ep}', [_travel(ep, 'Dor Guldur')])
    assert len(_patterns(char)) == 1
    _set_wiring(char, retrieval_top_k=0)

    faded = 0
    for ep in range(4, 16):  # long stretch elsewhere — the theme dissolves
        _, close = _open_and_close(
            client, char, f'd{ep}', [_travel(ep)]
        )
        faded += close['patterns_faded']
    assert faded >= 1
    assert _patterns(char) == []
