# ============================================================================
# C1 — distinctive encoding (docs/design/memory-depths.md §1)
# ----------------------------------------------------------------------------
# A memory encodes only what teaches the mind something: a first thing
# (novel signature), a new record for its kind (absorbs into the existing
# row), a streak break, or the day's Focus. The routine repeat of a thing
# already kept never becomes a memory — 'the eighth identical night' is
# bookkeeping, not an impression.
#
# Signature: (item type, anchor entity/place/region, contact-tag set).
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


def _open_and_close(client, character_id, ref, events, condition=None):
    r = client.post('/episodes', json={
        'game_id': 'middle_earth',
        'character': {'id': character_id},
        'episode_ref': ref,
        'condition': condition or {},
        'events': events,
    })
    assert r.status_code == 200, r.text
    opened = r.json()
    c = client.post(f"/episodes/{opened['episode_id']}/close", json={})
    assert c.status_code == 200, c.text
    return opened, c.json()


def _encounter(entity, form, reading, region='Minhiriath', intensity=0):
    return {
        'type': 'encounter',
        'when': {'phase': 'morning'},
        'where': {'region': region},
        'reading': reading,
        'tags': [f'entity:{entity}', 'tag:entity_type:carnivores',
                 f'tag:form:{form}'],
        'data': {'entity': entity, 'form': form, 'intensity': intensity},
    }


def _episodic(character_id):
    session = SessionLocal()
    rows = (
        session.query(Memory)
        .filter_by(character_id=character_id, kind='episodic')
        .all()
    )
    session.close()
    return rows


def test_first_thing_encodes(client):
    char = _uid('mem')
    _open_and_close(client, char, 'd1', [
        _encounter('foxes', 'sign_only', 'Foxes cross the path at dusk'),
    ])
    rows = _episodic(char)
    assert len(rows) == 1
    assert rows[0].desc == 'Foxes cross the path at dusk'


def test_routine_repeat_does_not_encode_a_second_row(client):
    """Same signature, nothing new to teach: the second fox sighting was
    routine — different words, same kind of thing. It never becomes a
    memory of its own."""
    char = _uid('mem')
    _open_and_close(client, char, 'd1', [
        _encounter('foxes', 'sign_only', 'Foxes cross the path at dusk'),
    ])
    _open_and_close(client, char, 'd2', [
        _encounter('foxes', 'sign_only', 'Fresh fox tracks in the mud'),
    ])
    rows = _episodic(char)
    assert len(rows) == 1


def test_record_repeat_refreshes_the_held_row(client):
    """Same signature but weightier — the second storm WAS worse than
    the one kept: the held row absorbs it (new day, new weight, new
    words) instead of spawning a sibling."""
    char = _uid('mem')
    _open_and_close(client, char, 'd1', [
        _encounter('foxes', 'sign_only', 'Foxes cross the path at dusk'),
    ])
    _open_and_close(client, char, 'd2', [
        _encounter('foxes', 'sign_only',
                   'The foxes turned and held her stare', intensity=4),
    ])
    rows = _episodic(char)
    assert len(rows) == 1
    assert rows[0].desc == 'The foxes turned and held her stare'
    assert len(set(rows[0].episode_ids or [])) == 2


def test_no_reading_no_memory(client):
    """'town' as a bare name is not a memory — an item the world did
    not put into words keeps nothing."""
    char = _uid('mem')
    _open_and_close(client, char, 'd1', [
        {
            'type': 'place',
            'when': {'phase': 'midday'},
            'where': {'region': 'Minhiriath'},
            'data': {'entity': 'town'},
        },
        _encounter('foxes', 'sign_only', 'Foxes cross the path at dusk'),
    ])
    rows = _episodic(char)
    assert [m.desc for m in rows] == ['Foxes cross the path at dusk']


def test_rupture_encodes_despite_held_signature(client):
    """'The first dry day' is news by design: a break item encodes even
    when the mind already keeps the thing it broke."""
    char = _uid('mem')
    break_event = _encounter(
        'foxes', 'sign_only', 'No foxes today — the first break')
    break_event['tags'] = ['rupture:tag:entity:foxes']
    _open_and_close(client, char, 'd1', [
        _encounter('foxes', 'sign_only', 'Foxes cross the path at dusk'),
    ])
    _open_and_close(client, char, 'd2', [break_event])
    assert len(_episodic(char)) == 2
