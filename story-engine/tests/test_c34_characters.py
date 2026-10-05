# ============================================================================
# C34 — the Mind owns the Character card (ADR 0001)
# ----------------------------------------------------------------------------
# The first open adopts the Host's card into mind.characters; from then on
# the Mind's copy answers identity (name, description, foundational phrase,
# voice, skills) and the wire only carries the live Condition (energy,
# shadow, conditions, wounded).
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.db import SessionLocal
from app.mind.tables import Character, Episode


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _open(client, char, ref, card=None, events=None):
    r = client.post('/episodes', json={
        'game_id': 'middle_earth',
        'character': {'id': char, **(card or {})},
        'episode_ref': ref, 'events': events or [], 'day': {},
    })
    assert r.status_code == 200, r.text
    return r.json()


def test_first_open_adopts_the_card(client):
    char = _uid('card')
    _open(client, char, 't:1', card={
        'name': 'Norell', 'skills': {'tracking': 9},
        'system_prompt': 'Speak in short sentences.',
        'introduction_instructions': 'Never narrates her own thoughts.',
        'entity_name': 'Dúnedain', 'description': 'A quiet ranger.',
    })

    session = SessionLocal()
    row = session.query(Character).filter_by(character_id=char).one()
    assert row.kind == 'copy'
    assert row.name == 'Norell'
    assert row.foundational_phrase == 'Speak in short sentences.'
    assert row.voice_instructions == 'Never narrates her own thoughts.'
    assert row.skills == {'tracking': 9}
    session.close()


def test_the_minds_card_wins_over_the_wire(client):
    """A later open may report different identity fields — the Mind's
    copy is what the narrator hears."""
    char = _uid('card')
    _open(client, char, 't:1', card={
        'name': 'Wire Name', 'system_prompt': 'Wire phrase.'})

    session = SessionLocal()
    row = session.query(Character).filter_by(character_id=char).one()
    row.name = 'Mind Name'
    row.foundational_phrase = 'Mind phrase.'
    row.skills = {'lore': 7}
    session.commit()
    session.close()

    ep = _open(client, char, 't:2', card={
        'name': 'Wire Name 2', 'system_prompt': 'Wire phrase 2.',
        'skills': {'tracking': 1}, 'energy': 55,
    })
    session = SessionLocal()
    card = session.get(Episode, ep['episode_id']).narrator_payload['character']
    assert card['name'] == 'Mind Name'
    assert card['system_prompt'] == 'Mind phrase.'
    assert card['skills'] == {'lore': 7}
    # ...and the Condition still comes from the Host's live report.
    assert card['energy'] == 55
    session.close()


def test_reopen_does_not_readopt(client):
    """Re-open replays the stored episode; the card row is untouched."""
    char = _uid('card')
    ep = _open(client, char, 't:1', card={'name': 'Norell'})
    same = _open(client, char, 't:1', card={'name': 'Someone Else'})
    assert same['episode_id'] == ep['episode_id']
    session = SessionLocal()
    row = session.query(Character).filter_by(character_id=char).one()
    assert row.name == 'Norell'
    session.close()
