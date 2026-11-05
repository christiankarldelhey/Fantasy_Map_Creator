# ============================================================================
# Translation chain — DeepL first, Groq fallback
# ----------------------------------------------------------------------------
# translate_text prefers DeepL (dedicated MT: deterministic, literary
# register, separate quota) and falls back to the Groq model chain for
# unsupported languages or when the key/quota fails. Also covers the
# truncation guard: a finish_reason=length completion is a failed attempt,
# never a persistable chapter.
# ============================================================================
import json
from types import SimpleNamespace

import app.ai as ai


class _Choice:
    def __init__(self, content, finish_reason):
        self.message = SimpleNamespace(content=content)
        self.finish_reason = finish_reason


def _client_for(choice, capture=None):
    class _Completions:
        def create(self, **kwargs):
            if capture is not None:
                capture.update(kwargs)
            return SimpleNamespace(choices=[choice])

    return SimpleNamespace(chat=SimpleNamespace(completions=_Completions()))


def _attempt(model, choice, run=None, capture=None):
    return {
        'provider': 'groq', 'model': model,
        'get_client': lambda: _client_for(choice, capture),
        'run': run or ai._try_generate_groq,
    }


class _DeeplResponse:
    def __init__(self, text):
        self._body = json.dumps({'translations': [{'text': text}]}).encode()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self):
        return self._body


def test_deepl_translates_when_configured(monkeypatch):
    monkeypatch.setenv('DEEPL_API_KEY', 'testkey:fx')
    captured = {}

    def fake_urlopen(request, timeout=None):
        captured['url'] = request.full_url
        captured['body'] = json.loads(request.data)
        captured['auth'] = request.headers['Authorization']
        return _DeeplResponse('El camino gris se extendía.')

    monkeypatch.setattr(ai, 'urlopen', fake_urlopen)
    monkeypatch.setattr(ai, '_build_attempt_order', lambda: [])

    result = ai.translate_text('The grey road stretched on.', 'spanish')

    assert result == 'El camino gris se extendía.'
    assert captured['url'] == 'https://api-free.deepl.com/v2/translate'
    assert captured['auth'] == 'DeepL-Auth-Key testkey:fx'
    assert captured['body']['source_lang'] == 'EN'
    assert captured['body']['target_lang'] == 'ES'
    assert captured['body']['text'] == ['The grey road stretched on.']
    assert 'literary fantasy fiction, third-person narrator' in captured['body']['context']


def test_deepl_failure_falls_back_to_groq(monkeypatch):
    monkeypatch.setenv('DEEPL_API_KEY', 'testkey:fx')

    def down(*args, **kwargs):
        raise OSError('service unavailable')

    monkeypatch.setattr(ai, 'urlopen', down)
    monkeypatch.setattr(ai, '_build_attempt_order', lambda: [
        _attempt('m1', _Choice('traducción de respaldo', 'stop')),
    ])

    assert ai.translate_text('The grey road stretched on.', 'spanish') == 'traducción de respaldo'


def test_unsupported_language_goes_straight_to_groq(monkeypatch):
    """DeepL has no Catalan — the LLM chain stays the safety net."""
    monkeypatch.setenv('DEEPL_API_KEY', 'testkey:fx')

    def no_http(*args, **kwargs):
        raise AssertionError('no HTTP call should be made')

    monkeypatch.setattr(ai, 'urlopen', no_http)
    monkeypatch.setattr(ai, '_build_attempt_order', lambda: [
        _attempt('m1', _Choice('traducció groq', 'stop')),
    ])

    assert ai.translate_text('The grey road stretched on.', 'catalan') == 'traducció groq'


def test_no_key_uses_the_groq_chain(monkeypatch):
    monkeypatch.delenv('DEEPL_API_KEY', raising=False)
    monkeypatch.setattr(ai, '_build_attempt_order', lambda: [
        _attempt('m1', _Choice('sin key, cae a la cadena groq', 'stop')),
    ])

    assert ai.translate_text('The grey road stretched on.', 'spanish') == 'sin key, cae a la cadena groq'


def test_truncated_completion_falls_to_next_model(monkeypatch):
    """finish_reason=length used to persist a half-sentence translation
    (a reasoning model burned its budget thinking). It now counts as a
    failed attempt and the chain moves on."""
    monkeypatch.delenv('DEEPL_API_KEY', raising=False)
    monkeypatch.setattr(ai, '_build_attempt_order', lambda: [
        _attempt('openai/gpt-oss-120b', _Choice('La tarde había caído sobre', 'length')),
        _attempt('llama-3.3-70b-versatile', _Choice('La tarde entera, completa.', 'stop')),
    ])

    assert ai.translate_text('The evening had fallen.', 'spanish') == 'La tarde entera, completa.'


def test_short_translation_falls_to_next_model(monkeypatch):
    """finish=stop but half the chapter missing: a well-formed cut still
    counts as a failed attempt. Spanish runs ~10-20% longer than the
    English source, so under half its length is a mutilation."""
    monkeypatch.delenv('DEEPL_API_KEY', raising=False)
    full = 'El camino gris se extendía ante ellos, completo. ' * 5
    monkeypatch.setattr(ai, '_build_attempt_order', lambda: [
        _attempt('m1', _Choice('Corta.', 'stop')),
        _attempt('m2', _Choice(full, 'stop')),
    ])

    source = 'The grey road stretched on before them, ' * 8
    assert ai.translate_text(source, 'spanish') == full.strip()


def test_translation_requests_a_larger_token_budget(monkeypatch):
    """Long chapters need room: the translation call gets 8192 output
    tokens while narration stays at 4096."""
    captured = {}
    monkeypatch.delenv('DEEPL_API_KEY', raising=False)
    monkeypatch.setattr(ai, '_build_attempt_order', lambda: [
        _attempt('m1', _Choice('x' * 400, 'stop'), capture=captured),
    ])
    ai.translate_text('x' * 200, 'spanish')
    assert captured['max_tokens'] == 8192


def test_gpt_oss_gets_low_reasoning_effort(monkeypatch):
    """Reasoning models must not spend the prose budget thinking —
    same guard complete_json already applies."""
    captured = {}
    sampling = {
        'temperature': 0.3, 'top_p': 0.9,
        'frequency_penalty': 0.0, 'presence_penalty': 0.0,
    }
    ai._try_generate_groq(
        _client_for(_Choice('ok', 'stop'), captured),
        [{'role': 'user', 'content': 'x'}],
        sampling,
        'openai/gpt-oss-120b',
    )
    assert captured['reasoning_effort'] == 'low'
