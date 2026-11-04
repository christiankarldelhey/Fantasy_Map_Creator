# ============================================================================
# C35 / ADR 0003 — English inner language, translation last
# ----------------------------------------------------------------------------
# The narration is always generated in English. Another reader language is
# a translation of the finished text, applied afterwards — never a second
# way of narrating. The Mind keeps and measures (Resonated) the English
# original; the translation is stored beside it for the reader.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
import app.narrate_day as narrate_module
from app.db import SessionLocal
from app.mind.tables import Episode, Memory
from app.narrate_day import narrate_day


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _narrate_day(monkeypatch, language, translation='texto narrado'):
    """narrate_day with the LLM calls stubbed: generation 'writes' a fixed
    English chapter; translate_text records what it was asked to render."""
    calls = []
    monkeypatch.setattr(
        narrate_module, 'generate_narrative',
        lambda *a, **k: {
            'text': 'The orc boots pressed into the wet road.',
            'ia_provider': 'test', 'temperature': 0.7,
            'frequency_penalty': 0.0, 'presence_penalty': 0.0, 'top_p': 1.0,
        },
    )
    monkeypatch.setattr(
        narrate_module, 'translate_text',
        lambda text, lang: calls.append((text, lang)) or translation,
    )
    result = narrate_day(
        day={'day_number': 1, 'date': '1950-06-01'},
        character={'name': 'Aranath'},
        language=language,
    )
    return result, calls


def test_english_request_never_translates(monkeypatch):
    result, calls = _narrate_day(monkeypatch, 'english')
    generation = result['generation']
    assert calls == []
    assert generation['text'] == generation['inner_text']
    assert generation['language'] == 'english'


def test_spanish_request_narrates_english_then_translates(monkeypatch):
    result, calls = _narrate_day(monkeypatch, 'spanish')
    generation = result['generation']
    # One translation call, on the finished English text.
    assert calls == [('The orc boots pressed into the wet road.', 'spanish')]
    assert generation['inner_text'] == 'The orc boots pressed into the wet road.'
    assert generation['text'] == 'texto narrado'
    assert generation['language'] == 'spanish'
    # The prompt itself carried no Spanish instruction (ADR 0003).
    assert 'in Spanish' not in result['prompt']['user']


def test_iso_code_resolves_to_a_language_name(monkeypatch):
    """A host sending 'es' must not reach the translator as 'Es' — bare
    codes read as Estonian to the model; it needs the language name."""
    _, calls = _narrate_day(monkeypatch, 'es')
    assert calls[0][1] == 'spanish'


def test_failed_translation_keeps_the_english_chapter(monkeypatch):
    result, _ = _narrate_day(monkeypatch, 'spanish', translation=None)
    generation = result['generation']
    assert generation['text'] == 'The orc boots pressed into the wet road.'
    assert generation['language'] == 'english'


def _open_with_memory(client):
    """An episode whose evoked memory has a distinctive English desc."""
    char = f'inner-{uuid.uuid4().hex[:8]}'
    first = client.post('/episodes', json={
        'game_id': 'middle_earth', 'character': {'id': char},
        'episode_ref': 'd1', 'day': {'day_number': 1, 'date': '1950-06-01'},
        'events': [{
            'type': 'encounter',
            'when': {'episode': 1, 'date': '1950-06-01'},
            'data': {'entity': 'dnedain', 'entity_name': 'Dúnedain',
                     'entity_type': 'humans', 'form': 'brief_exchange',
                     'substance': {'content': 'He asks about the north road.'}},
        }],
    }).json()
    client.post(f"/episodes/{first['episode_id']}/close", json={'outcome': {}})
    second = client.post('/episodes', json={
        'game_id': 'middle_earth', 'character': {'id': char},
        'episode_ref': 'd2', 'day': {'day_number': 2, 'date': '1950-06-02'},
        'events': [{
            'type': 'encounter',
            'when': {'episode': 2, 'date': '1950-06-02'},
            'data': {'entity': 'dnedain', 'entity_name': 'Dúnedain',
                     'entity_type': 'humans', 'form': 'brief_exchange',
                     'substance': {'content': 'The same ranger returns.'}},
        }],
    }).json()
    return second['episode_id']


def test_resonated_and_episode_narrative_use_the_english_text(
    client, monkeypatch
):
    ep_id = _open_with_memory(client)
    session = SessionLocal()
    ep = session.get(Episode, ep_id)
    evoked = [
        mem_id
        for item in ep.perceived_day
        for mem_id in (item.get('evoked') or [])
    ]
    desc = session.get(Memory, evoked[0]).desc
    session.close()
    token = next(
        w.strip('.,;!?¿¡"\'').lower()
        for w in desc.split()
        if len(w.strip('.,;!?¿¡"\'')) >= 5
    )

    english = f'Again the {token} would not leave her.'
    monkeypatch.setattr(
        narrate_module, 'generate_narrative',
        lambda *a, **k: {
            'text': english, 'ia_provider': 'test', 'temperature': 0.7,
            'frequency_penalty': 0.0, 'presence_penalty': 0.0, 'top_p': 1.0,
        },
    )
    # The translation deliberately drops the token — Resonated must still
    # see it, because it is measured on the inner-language text.
    monkeypatch.setattr(
        narrate_module, 'translate_text',
        lambda text, lang: 'Un día gris de camino.',
    )
    body = client.post(
        f'/episodes/{ep_id}/narrate', json={'language': 'spanish'}
    ).json()

    assert body['lens_eval']['voiced'] == evoked
    session = SessionLocal()
    ep = session.get(Episode, ep_id)
    assert ep.narrative == english
    assert ep.narrative_language == 'english'
    assert ep.narrative_translation == {
        'language': 'spanish', 'text': 'Un día gris de camino.',
    }
    session.close()
