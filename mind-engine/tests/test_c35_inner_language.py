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


def test_episode_narrative_keeps_the_english_text(client, monkeypatch):
    """A spanish request stores the English original plus its translation."""
    char = f'inner-{uuid.uuid4().hex[:8]}'
    ep = client.post('/episodes', json={
        'game_id': 'middle_earth', 'character': {'id': char},
        'episode_ref': 'd1', 'episode': {'index': 1, 'at': '1950-06-01'},
        'events': [{
            'type': 'encounter',
            'when': {},
            'data': {'entity': 'dnedain', 'entity_name': 'Dúnedain',
                     'entity_type': 'humans', 'form': 'brief_exchange',
                     'substance': {'content': 'He asks about the north road.'}},
        }],
    }).json()
    ep_id = ep['episode_id']

    english = 'The orc boots pressed into the wet road.'
    monkeypatch.setattr(
        narrate_module, 'generate_narrative',
        lambda *a, **k: {
            'text': english, 'ia_provider': 'test', 'temperature': 0.7,
            'frequency_penalty': 0.0, 'presence_penalty': 0.0, 'top_p': 1.0,
        },
    )
    monkeypatch.setattr(
        narrate_module, 'translate_text',
        lambda text, lang: 'Un día gris de camino.',
    )
    client.post(f'/episodes/{ep_id}/narrate', json={'language': 'spanish'})

    session = SessionLocal()
    row = session.get(Episode, ep_id)
    assert row.narrative == english
    assert row.narrative_language == 'english'
    assert row.narrative_translation == {
        'language': 'spanish', 'text': 'Un día gris de camino.',
    }
    session.close()
