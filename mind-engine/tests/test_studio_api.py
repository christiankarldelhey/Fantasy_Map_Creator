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
from app.mind.provisioning import DEFAULT_WIRING
from app.mind.tables import Mind, Character, Episode, ForgottenMemory

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


def test_mind_without_episodes_is_listed_last(client):
    char = _uid('unlived')
    session = SessionLocal()
    session.add(Mind(
        game_id='middle_earth', character_id=char, preset_slug='default',
        theme_weights={}, wiring={}, mood={}, counters={},
    ))
    session.commit()
    session.close()
    minds = client.get('/studio/api/minds', auth=AUTH).json()['minds']
    assert minds[-1]['last_lived_at'] is None
    assert any(m['character_id'] == char for m in minds)


def test_card_edit_writes_the_minds_copy(client):
    char = _uid('edit')
    _live(client, char, 1)  # first open adopts the card

    r = client.patch(
        f'/studio/api/minds/{char}/card', auth=AUTH,
        json={
            'foundational_phrase': 'A new way of seeing.',
            'skills': {'lore': 11, 'tracking': 4},
        },
    )
    assert r.status_code == 200, r.text
    card = r.json()
    assert card['foundational_phrase'] == 'A new way of seeing.'
    assert card['skills'] == {'lore': 10, 'tracking': 4}  # 0-10 band

    # …and the next open narrates from the edited copy, not the wire.
    client.post('/episodes', json={
        'game_id': 'middle_earth',
        'character': {'id': char, 'system_prompt': 'Wire says otherwise.'},
        'episode_ref': 'd2', 'events': [], 'day': {},
    })
    session = SessionLocal()
    ep = (
        session.query(Episode)
        .filter_by(character_id=char, episode_ref='d2')
        .one()
    )
    assert ep.narrator_payload['character']['system_prompt'] == (
        'A new way of seeing.'
    )
    session.close()


def test_original_cards_refuse_edits(client):
    char = _uid('orig')
    session = SessionLocal()
    session.add(Character(
        game_id='middle_earth', character_id=char, kind='original',
        name='Authored', skills={},
    ))
    session.commit()
    session.close()

    r = client.patch(
        f'/studio/api/minds/{char}/card', auth=AUTH, json={'name': 'X'},
    )
    assert r.status_code == 409


def test_trait_dial_writes_its_knobs(client):
    char = _uid('traits')
    _live(client, char, 1)

    r = client.patch(
        f'/studio/api/minds/{char}/traits', auth=AUTH,
        json={'traits': {'curiosidad': 1.0, 'rumia': 0.0}},
    )
    assert r.status_code == 200, r.text

    session = SessionLocal()
    mind = session.query(Mind).filter_by(character_id=char).one()
    # curiosidad at full: the new weighs heavy, themes pull, talk sticks.
    assert mind.wiring['w_novelty'] == pytest.approx(0.45)
    assert mind.wiring['w_theme'] == pytest.approx(0.30)
    # rumia at zero: the present wins — recency decays fast, few evoked.
    assert mind.wiring['lambda_recency'] == pytest.approx(0.60)
    assert mind.wiring['retrieval_top_k'] == 2
    session.close()

    # …and the dials read back the extremes honestly.
    mind = client.get(f'/studio/api/minds/{char}', auth=AUTH).json()
    assert mind['traits']['curiosidad']['value'] == pytest.approx(1.0)
    assert mind['traits']['rumia']['value'] == pytest.approx(0.0)
    assert mind['traits']['curiosidad']['label'] == 'Curiosidad'


def test_dormant_trait_stores_its_value(client):
    """The action dials (#62) carry no knobs — the PATCH stores their
    value in wiring and the read-back is honest, nothing else moves."""
    char = _uid('traits')
    _live(client, char, 1)

    r = client.patch(
        f'/studio/api/minds/{char}/traits', auth=AUTH,
        json={'traits': {'integridad': 0.9, 'coraje': 0.1}},
    )
    assert r.status_code == 200, r.text

    session = SessionLocal()
    mind = session.query(Mind).filter_by(character_id=char).one()
    assert mind.wiring['trait_integridad'] == pytest.approx(0.9)
    assert mind.wiring['trait_coraje'] == pytest.approx(0.1)
    # Nothing mechanical woke up — the dormant dial is data only.
    assert mind.wiring.get('w_novelty') == pytest.approx(
        DEFAULT_WIRING['w_novelty']
    )
    assert mind.wiring.get('decay') == pytest.approx(
        DEFAULT_WIRING['decay']
    )
    session.close()

    mind = client.get(f'/studio/api/minds/{char}', auth=AUTH).json()
    assert mind['traits']['integridad']['value'] == pytest.approx(0.9)
    assert mind['traits']['integridad']['dormant'] is True
    assert mind['traits']['corruptibilidad']['value'] == pytest.approx(0.5)


def test_unknown_trait_is_422(client):
    char = _uid('traits')
    _live(client, char, 1)
    r = client.patch(
        f'/studio/api/minds/{char}/traits', auth=AUTH,
        json={'traits': {'fortaleza': 0.9}},
    )
    assert r.status_code == 422


def test_concerns_set_and_remove(client):
    char = _uid('concern')
    _live(client, char, 1)

    r = client.patch(
        f'/studio/api/minds/{char}/concerns', auth=AUTH,
        json={'weights': {'tag:entity_type:undead': 0.9}},
    )
    assert r.status_code == 200
    assert r.json()['tag:entity_type:undead'] == 0.9

    mind = client.get(f'/studio/api/minds/{char}', auth=AUTH).json()
    assert mind['concerns']['tag:entity_type:undead'] == 0.9

    r = client.patch(
        f'/studio/api/minds/{char}/concerns', auth=AUTH,
        json={'weights': {'tag:entity_type:undead': None}},
    )
    assert 'tag:entity_type:undead' not in r.json()


def test_mood_patch_sets_weather_and_recomputes_dominant(client):
    char = _uid('mood')
    _live(client, char, 1)

    r = client.patch(
        f'/studio/api/minds/{char}/mood', auth=AUTH,
        json={'valence': -0.8, 'arousal': 0.6},
    )
    assert r.status_code == 200, r.text
    mood = r.json()
    assert mood['valence'] == -0.8
    assert mood['arousal'] == 0.6
    assert mood['dominant'] != 'neutral'

    # …and the detail reads the same weather back.
    mind = client.get(f'/studio/api/minds/{char}', auth=AUTH).json()
    assert mind['mood']['valence'] == -0.8


def test_mood_patch_clamps_and_drops_cause_near_neutral(client):
    char = _uid('mood')
    _live(client, char, 1)
    session = SessionLocal()
    mind = session.query(Mind).filter_by(character_id=char).one()
    mind.mood = {
        'valence': -0.7, 'arousal': 0.5, 'dominant': 'heavy',
        'cause': {'reading': 'the wolves', 'valence': -0.6, 'tags': []},
    }
    session.commit()
    session.close()

    r = client.patch(
        f'/studio/api/minds/{char}/mood', auth=AUTH,
        json={'valence': 0.02},
    )
    mood = r.json()
    assert mood['valence'] == 0.02
    assert mood['cause'] is None  # near neutral: nothing weighs any more

    # Out-of-band values clamp.
    r = client.patch(
        f'/studio/api/minds/{char}/mood', auth=AUTH,
        json={'valence': -3, 'arousal': 4},
    )
    assert r.json()['valence'] == -1.0
    assert r.json()['arousal'] == 1.0
