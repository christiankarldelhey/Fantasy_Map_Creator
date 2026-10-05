# ============================================================================
# Mind Studio read API (block 1) — see a Mind
# ----------------------------------------------------------------------------
# The Studio opens on the most recently lived Mind, and one Mind's payload
# carries enough to rebuild it on any past Episode: live memories plus
# Forgotten traces, beliefs with their birth Episode, and every Episode's
# Lens lines tied back to the node they came from.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
import app.narrate_day as narrate_module
from app.db import SessionLocal
from app.mind.tables import Brain, ForgottenMemory

AUTH = ('studio-user', 'studio-pass')


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setenv('ADMIN_USER', AUTH[0])
    monkeypatch.setenv('ADMIN_PASSWORD', AUTH[1])
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _encounter(n):
    return {
        'type': 'encounter',
        'when': {'episode': n, 'date': f'1950-06-0{n}', 'phase': 'morning'},
        'data': {
            'entity': 'dnedain', 'entity_name': 'Dúnedain',
            'entity_type': 'humans', 'form': 'brief_exchange',
            'substance': {
                'content': 'He asks whether she has seen movement north.',
                'stance': 'Answers what she knows.',
            },
        },
    }


def _live(client, char, n, name='Ilmare'):
    r = client.post('/episodes', json={
        'game_id': 'middle_earth',
        'character': {
            'id': char, 'name': name, 'system_prompt': 'She reads stars.',
            'skills': {'lore': 7},
        },
        'episode_ref': f'd{n}', 'events': [_encounter(n)],
        'day': {'day_number': n, 'date': f'1950-06-0{n}'},
        'trip_name': 'T', 'language': 'english',
    })
    assert r.status_code == 200, r.text
    return r.json()['episode_id']


def _narrate(client, monkeypatch, ep_id, text):
    monkeypatch.setattr(
        narrate_module, 'generate_narrative',
        lambda *a, **k: {
            'text': text, 'ia_provider': 'test', 'temperature': 0.7,
            'frequency_penalty': 0.0, 'presence_penalty': 0.0, 'top_p': 1.0,
        },
    )
    r = client.post(f'/episodes/{ep_id}/narrate', json={})
    assert r.status_code == 200, r.text


def test_studio_is_closed_without_credentials(client):
    r = client.get('/studio/api/minds')
    assert r.status_code == 401
    assert r.headers['www-authenticate'].startswith('Basic')


def test_default_mind_is_the_one_that_lived_last(client):
    older, newer = _uid('older'), _uid('newer')
    _live(client, older, 1)
    _live(client, newer, 1, name='Newer')
    body = client.get('/studio/api/minds', auth=AUTH).json()
    assert body['default'] == newer
    first = body['minds'][0]
    assert first['name'] == 'Newer'
    assert first['episodes'] == 1


def test_one_mind_carries_its_whole_history(client, monkeypatch):
    char = _uid('whole')
    ep1 = _live(client, char, 1)
    client.post(f'/episodes/{ep1}/close', json={'outcome': {}})
    ep2 = _live(client, char, 2)
    _narrate(client, monkeypatch, ep2, 'The Dúnedain and his question.')

    session = SessionLocal()
    session.add(ForgottenMemory(
        id=f'mem_{uuid.uuid4().hex}', game_id='middle_earth',
        character_id=char, kind='episodic', desc='a hare', valence=0.0,
        importance=0.1, created_episode=1, forgotten_episode=2,
        last_strength=0.15,
    ))
    session.commit()
    session.close()

    r = client.get(f'/studio/api/minds/{char}', auth=AUTH)
    assert r.status_code == 200, r.text
    mind = r.json()

    assert mind['character']['name'] == 'Ilmare'
    assert mind['character']['foundational_phrase'] == 'She reads stars.'
    assert mind['character']['skills'] == {'lore': 7}

    states = {m['state'] for m in mind['memories']}
    assert states == {'alive', 'forgotten'}
    lost = next(m for m in mind['memories'] if m['state'] == 'forgotten')
    assert (lost['born_episode'], lost['forgotten_episode']) == (1, 2)

    assert [e['idx'] for e in mind['episodes']] == [1, 2]
    second = mind['episodes'][1]
    assert second['narrative'] == 'The Dúnedain and his question.'
    assert second['evoked'], second
    memory_lines = [
        line for line in second['lens']
        if (line['ref'] or {}).get('kind') == 'memory'
    ]
    assert memory_lines, second['lens']
    assert memory_lines[0]['ref']['id'] in second['evoked']
    assert memory_lines[0]['resonated'] is True


def test_unknown_mind_is_404(client):
    r = client.get(f'/studio/api/minds/{_uid("ghost")}', auth=AUTH)
    assert r.status_code == 404


def test_brain_without_episodes_is_listed_last(client):
    char = _uid('unlived')
    session = SessionLocal()
    session.add(Brain(
        game_id='middle_earth', character_id=char, mold_slug='default',
        theme_weights={}, wiring={}, mood={}, counters={},
    ))
    session.commit()
    session.close()
    minds = client.get('/studio/api/minds', auth=AUTH).json()['minds']
    assert minds[-1]['last_lived_at'] is None
    assert any(m['character_id'] == char for m in minds)
