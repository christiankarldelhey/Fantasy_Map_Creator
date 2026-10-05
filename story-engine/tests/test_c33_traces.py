# ============================================================================
# C33 — the Mind keeps its history
# ----------------------------------------------------------------------------
# A forgotten memory still dies from mind.memories (nothing may evoke it),
# but leaves a ForgottenMemory trace with the Episode it was lost on. And
# the last narration of an Episode is kept beside the Lens that shaped it.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
import app.narrate_day as narrate_module
from app.db import SessionLocal
from app.mind.memory import decay_pass
from app.mind.tables import Brain, Episode, ForgottenMemory, Memory


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _brain_with_fading_memory():
    char = _uid('trace')
    session = SessionLocal()
    session.add(Brain(
        game_id='middle_earth', character_id=char, mold_slug='default',
        theme_weights={}, wiring={}, mood={}, counters={},
    ))
    mem = Memory(
        game_id='middle_earth', character_id=char, episode_ids=['ep_x'],
        kind='episodic', tags=['entity:hares'], desc='a hare in the ferns',
        valence=0.05, importance=0.2, strength=0.21, evocations=1,
        consolidated=False, origin='experience', created_episode=2,
    )
    session.add(mem)
    session.commit()
    mem_id = mem.id
    session.close()
    return char, mem_id


def test_forgetting_leaves_a_trace_with_the_episode_it_was_lost():
    char, mem_id = _brain_with_fading_memory()
    session = SessionLocal()
    brain = session.query(Brain).filter_by(character_id=char).one()
    out = decay_pass(session, brain, current_episode_index=5)
    session.commit()

    assert out['forgotten'] == 1
    assert session.get(Memory, mem_id) is None
    trace = session.get(ForgottenMemory, mem_id)
    assert trace.desc == 'a hare in the ferns'
    assert trace.created_episode == 2
    assert trace.forgotten_episode == 5
    assert trace.last_strength == pytest.approx(0.21 * 0.85)
    assert trace.evocations == 1
    session.close()


def test_reset_wipes_the_traces_too(client):
    char, _ = _brain_with_fading_memory()
    session = SessionLocal()
    brain = session.query(Brain).filter_by(character_id=char).one()
    decay_pass(session, brain, current_episode_index=5)
    session.commit()
    session.close()

    r = client.post(f'/mind/brains/{char}/reset',
                    json={'game_id': 'middle_earth'})
    assert r.status_code == 200, r.text
    assert r.json()['deleted']['forgotten'] == 1
    session = SessionLocal()
    assert session.query(ForgottenMemory).filter_by(
        character_id=char).count() == 0
    session.close()


def test_narrate_keeps_the_last_narration(client, monkeypatch):
    char = _uid('prose')
    r = client.post('/episodes', json={
        'game_id': 'middle_earth', 'character': {'id': char},
        'episode_ref': 'd1', 'events': [{
            'type': 'travel',
            'when': {'episode': 1, 'date': '1950-06-01'},
            'data': {},
        }],
        'day': {'day_number': 1, 'date': '1950-06-01'},
        'trip_name': 'T', 'language': 'english',
    })
    assert r.status_code == 200, r.text
    ep_id = r.json()['episode_id']

    for text in ('First telling.', 'Second telling.'):
        monkeypatch.setattr(
            narrate_module, 'generate_narrative',
            lambda *a, _t=text, **k: {
                'text': _t, 'ia_provider': 'test', 'temperature': 0.7,
                'frequency_penalty': 0.0, 'presence_penalty': 0.0,
                'top_p': 1.0,
            },
        )
        r = client.post(f'/episodes/{ep_id}/narrate',
                        json={'language': 'spanish'})
        assert r.status_code == 200, r.text

    session = SessionLocal()
    ep = session.get(Episode, ep_id)
    assert ep.narrative == 'Second telling.'
    assert ep.narrative_language == 'spanish'
    session.close()
