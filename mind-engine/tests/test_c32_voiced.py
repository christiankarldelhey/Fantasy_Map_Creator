# ============================================================================
# C32 — voiced vs evoked: the lens' bleed rate, measured
# ----------------------------------------------------------------------------
# C17 wired evoked memories into the prompt but never observed whether the
# prose used them. Each narrate now measures which evoked memories the
# generated text echoed (same token rule as the lens_reference eval) and
# stores it: episodes.lens_eval = {evoked: [...], voiced: [...]}, plus a
# per-memory voiced counter — at most one bump per episode, so
# re-narration can't inflate it.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
import app.narrate_day as narrate_module
from app.db import SessionLocal
from app.mind.tables import Memory


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _event(when_episode):
    return {
        'type': 'encounter',
        'when': {'episode': when_episode, 'date': '1950-06-01'},
        'data': {
            'entity': 'dnedain', 'entity_name': 'Dúnedain',
            'entity_type': 'humans', 'form': 'brief_exchange',
            'substance': {
                'content': 'He asks whether she has seen movement north.',
                'stance': 'Answers what she knows.',
            },
        },
    }


def _open(client, char, ref, when_episode):
    r = client.post('/episodes', json={
        'game_id': 'middle_earth', 'character': {'id': char},
        'episode_ref': ref, 'events': [_event(when_episode)],
        'day': {'day_number': when_episode, 'date': '1950-06-01'},
        'trip_name': 'T', 'language': 'english',
    })
    assert r.status_code == 200, r.text
    return r.json()


def _close(client, episode_id):
    r = client.post(f'/episodes/{episode_id}/close', json={'outcome': {}})
    assert r.status_code == 200, r.text
    return r.json()


def _state(client, episode_id):
    r = client.get(f'/episodes/{episode_id}')
    assert r.status_code == 200, r.text
    return r.json()


def _narrate(client, monkeypatch, ep_id, text):
    fake = {
        'text': text, 'ia_provider': 'test', 'temperature': 0.7,
        'frequency_penalty': 0.0, 'presence_penalty': 0.0, 'top_p': 1.0,
    }
    monkeypatch.setattr(
        narrate_module, 'generate_narrative', lambda *a, **k: fake
    )
    r = client.post(f'/episodes/{ep_id}/narrate', json={})
    assert r.status_code == 200, r.text
    return r.json()


_STOPWORDS = {
    'the', 'a', 'an', 'of', 'and', 'or', 'in', 'on', 'at', 'to', 'with',
    'cold', 'hot', 'wet', 'dry', 'wind', 'road', 'day', 'night', 'camp',
}


def _echo_token(desc):
    """A distinctive token from the memory's desc — the same pick the
    lens_reference eval would look for in generated prose."""
    for t in desc.replace(':', ' ').split():
        w = t.strip('.,;!?¿¡"\'').lower()
        if len(w) >= 4 and w not in _STOPWORDS:
            return w
    raise AssertionError(f'no echoable token in desc: {desc!r}')


def _evoked_episode(client):
    """A brain with one encoded memory, then a second episode that
    evokes it — returns (episode_id, memory_id)."""
    char = _uid('voiced')
    first = _open(client, char, 'd1', 1)
    _close(client, first['episode_id'])
    second = _open(client, char, 'd2', 2)
    session = SessionLocal()
    mem = session.query(Memory).filter_by(
        character_id=char, kind='episodic'
    ).one()
    session.close()
    return second['episode_id'], mem.id, char


def test_narrate_records_which_evoked_memories_were_voiced(
    client, monkeypatch
):
    ep_id, mem_id, char = _evoked_episode(client)

    session = SessionLocal()
    desc = session.get(Memory, mem_id).desc
    session.close()
    body = _narrate(
        client, monkeypatch, ep_id,
        f'The thought of {_echo_token(desc)} returned.',
    )

    assert body['lens_eval'] == {'evoked': [mem_id], 'voiced': [mem_id]}
    assert _state(client, ep_id)['lens_eval']['voiced'] == [mem_id]
    session = SessionLocal()
    mem = session.get(Memory, mem_id)
    assert mem.voiced == 1
    assert mem.last_voiced_episode == 2
    session.close()


def test_unvoiced_memory_stays_visible_as_silence(client, monkeypatch):
    ep_id, mem_id, _ = _evoked_episode(client)
    body = _narrate(
        client, monkeypatch, ep_id, 'Quiet miles under a grey sky.'
    )
    assert body['lens_eval'] == {'evoked': [mem_id], 'voiced': []}
    session = SessionLocal()
    assert session.get(Memory, mem_id).voiced == 0
    session.close()


def test_renarration_remeasures_but_never_double_counts(
    client, monkeypatch
):
    ep_id, mem_id, _ = _evoked_episode(client)
    session = SessionLocal()
    desc = session.get(Memory, mem_id).desc
    session.close()
    token = _echo_token(desc)

    _narrate(client, monkeypatch, ep_id, f'Again the {token}.')
    _narrate(client, monkeypatch, ep_id, f'Still the {token}.')
    session = SessionLocal()
    mem = session.get(Memory, mem_id)
    assert mem.voiced == 1  # one episode voiced it, however many narrates
    session.close()

    # And the last observation wins: a silent re-narration clears voiced.
    body = _narrate(client, monkeypatch, ep_id, 'Nothing stirred in prose.')
    assert body['lens_eval']['voiced'] == []


def test_episode_without_evoked_memories_records_nothing(
    client, monkeypatch
):
    char = _uid('quiet')
    ep = _open(client, char, 'd1', 1)
    body = _narrate(
        client, monkeypatch, ep['episode_id'], 'A long grey road.'
    )
    assert body['lens_eval'] is None
