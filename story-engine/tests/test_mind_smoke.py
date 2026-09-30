# ============================================================================
# MVP smoke suite — the four acceptance behaviours of A12
# ----------------------------------------------------------------------------
# 1. Differential memory: a brain weighted for meals consolidates a meal
#    memory at birth while a default brain lets it fade and die.
# 2. Determinism: identical events[] -> identical perceived_day.
# 3. Idempotency: open x2 and close x2 produce no duplicates.
# 4. Narrative eval: the lens-reference check echoes evoked memories; the
#    episode narrate prompt carries the mind section (LLM patched out).
# 5. Degradation: /narrate-day works with the mind session dead.
#
# These tests run against the real local Postgres (schema `mind`) — the
# characters/molds they create use unique ids per run.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
import app.narrate_day as narrate_module
from app.db import SessionLocal
from app.evals.narrative_checks import check_lens_reference
from app.mind.tables import BrainMold, Memory, MoldThemeWeight


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _open(client, character_id, ref, events, brain_profile=None):
    character = {'id': character_id}
    if brain_profile:
        character['brain_profile'] = brain_profile
    r = client.post('/episodes', json={
        'game_id': 'middle_earth',
        'character': character,
        'episode_ref': ref,
        'events': events,
        'day': {},
    })
    assert r.status_code == 200, r.text
    return r.json()


def _close(client, episode_id):
    r = client.post(f'/episodes/{episode_id}/close', json={})
    assert r.status_code == 200, r.text
    return r.json()


def _open_and_close(client, character_id, ref, events, brain_profile=None):
    opened = _open(client, character_id, ref, events, brain_profile)
    return opened, _close(client, opened['episode_id'])


MEAL_EVENT = {
    'type': 'meal',
    'when': {'episode': 1, 'date': '1950-01-19', 'phase': 'night'},
    'data': {'food': 'lembas', 'valence': 0.6},
}

QUIET_TRAVEL = {
    'type': 'travel',
    'when': {'episode': 0, 'date': '1950-01-19'},
    'data': {'distance_km': 10.0},
}


def _quiet_event(ep):
    return {**QUIET_TRAVEL, 'when': {**QUIET_TRAVEL['when'], 'episode': ep}}


def test_differential_memory(client):
    """Character B (epicurean mold, heavy type:meal weight) consolidates the
    meal at birth; character A (default) holds it volatile and forgets it
    over a run of unrelated episodes."""
    session = SessionLocal()
    slug = _uid('epicurean')
    mold = BrainMold(game_id='middle_earth', slug=slug, name='Epicurean')
    session.add(mold)
    session.flush()
    session.add(MoldThemeWeight(mold_id=mold.id, key='type:meal', weight=4.0))
    session.commit()
    session.close()

    char_a = _uid('a')
    char_b = _uid('b')
    _, close_a = _open_and_close(client, char_a, 'd1', [MEAL_EVENT])
    _, close_b = _open_and_close(
        client, char_b, 'd1', [MEAL_EVENT], brain_profile=slug
    )
    assert close_a['encoded'] == 1 and close_b['encoded'] == 1
    # B's meal was so important it fixed at birth; A's is just volatile.
    assert close_b['consolidated'] == 1 and close_a['consolidated'] == 0

    session = SessionLocal()
    mem_a = session.query(Memory).filter_by(character_id=char_a).one()
    mem_b = session.query(Memory).filter_by(character_id=char_b).one()
    assert mem_b.consolidated is True
    assert mem_a.consolidated is False
    assert mem_b.importance > mem_a.importance
    session.close()

    # A string of unrelated travel episodes: the meal is never relevant
    # enough to stir (below the retrieval floor), so it decays and dies.
    for i in range(2, 9):
        _open_and_close(client, char_a, f'd{i}', [_quiet_event(i)])
        _open_and_close(client, char_b, f'd{i}', [_quiet_event(i)])

    session = SessionLocal()
    gone = session.query(Memory).filter_by(character_id=char_a).all()
    stays = session.query(Memory).filter_by(character_id=char_b).all()
    session.close()
    assert all(m.desc != 'food: lembas' for m in gone), 'A should forget the meal'
    assert any(m.consolidated for m in stays), 'B keeps the meal fixed'


def test_determinism(client):
    """Same events[] for two fresh default brains -> identical perceived_day."""
    events = [{
        'type': 'climate',
        'when': {'episode': 1, 'date': '1950-01-19', 'phase': 'morning'},
        'where': {'region': 'eriador'},
        'data': {
            'temperature_2m': 4.2, 'cloud_cover': 80,
            'wind_speed_10m': 22, 'precipitation': 1.2,
        },
    }]
    a = _open(client, _uid('det-a'), 'd1', events)['psyche_packet']
    b = _open(client, _uid('det-b'), 'd1', events)['psyche_packet']
    assert a['perceived_day'] == b['perceived_day']


def test_idempotent_open_and_close(client):
    char = _uid('idem')
    first = _open(client, char, 'd1', [MEAL_EVENT])
    second = _open(client, char, 'd1', [MEAL_EVENT])
    assert second['episode_id'] == first['episode_id']
    assert (
        second['psyche_packet']['perceived_day']
        == first['psyche_packet']['perceived_day']
    )

    ep_id = first['episode_id']
    close1 = _close(client, ep_id)
    close2 = _close(client, ep_id)
    assert close1['encoded'] == 1
    assert close2['encoded'] == 0 and close2['already_closed'] is True

    session = SessionLocal()
    count = session.query(Memory).filter_by(character_id=char).count()
    session.close()
    assert count == 1


def test_lens_reference_check():
    """The eval: a narrative echoing an evoked memory passes; silence fails;
    no impressions -> skipped as ok."""
    ok = check_lens_reference(
        'The smell of lembas still clung to their hands.', ['food: lembas']
    )
    assert ok['ok'] is True
    missing = check_lens_reference(
        'The road went ever on through the grey rain.', ['food: lembas']
    )
    assert missing['ok'] is False
    skipped = check_lens_reference('anything', [])
    assert skipped['ok'] is True


def test_narrate_episode_injects_mind(client, monkeypatch):
    """Prompt-level eval: the mind section reaches the narrator prompt; the
    LLM itself is patched out so the suite stays offline."""
    fake = {
        'text': 'Lembas again. The taste brought the night back.',
        'ia_provider': 'test', 'temperature': 0.7,
        'frequency_penalty': 0.0, 'presence_penalty': 0.0, 'top_p': 1.0,
    }
    monkeypatch.setattr(
        narrate_module, 'generate_narrative', lambda *a, **k: fake
    )

    char = _uid('narr')
    opened = _open(client, char, 'd1', [MEAL_EVENT])
    r = client.post(f"/episodes/{opened['episode_id']}/narrate", json={})
    assert r.status_code == 422  # day: {} -> no narratable day

    payload = {
        'game_id': 'middle_earth', 'character': {'id': char, 'name': 'Tester'},
        'episode_ref': 'd3',
        'events': [MEAL_EVENT],
        'day': {'day_number': 3, 'date': '1950-01-21'},
        'trip_name': 'T',
        'language': 'english',
    }
    r = client.post('/episodes', json=payload)
    assert r.status_code == 200, r.text
    ep_id = r.json()['episode_id']
    rn = client.post(f'/episodes/{ep_id}/narrate', json={})
    assert rn.status_code == 200, rn.text
    body = rn.json()
    # The mind rides inside the narrator's lens (C17) — no standalone
    # 'THE MIND OF' block, its content fused with the personality.
    assert '=== THE MIND OF' not in body['prompt']['user']
    assert "NARRATOR'S LENS FOR TESTER" in body['prompt']['user']
    assert 'Tester today — mood:' in body['prompt']['user']
    assert body['generation']['text'] == fake['text']
    # lens eval sees the echoed impression
    echoed = check_lens_reference(fake['text'], ['food: lembas'])
    assert echoed['ok'] is True


def test_narrate_day_degrades_when_mind_down(client, monkeypatch):
    """Mind persistence dead -> /narrate-day still answers. The session
    factory raising must not kill the stateless path."""
    fake = {
        'text': 'A quiet day on the road.', 'ia_provider': 'test',
        'temperature': 0.7, 'frequency_penalty': 0.0,
        'presence_penalty': 0.0, 'top_p': 1.0,
    }
    monkeypatch.setattr(
        narrate_module, 'generate_narrative', lambda *a, **k: fake
    )

    def _dead_session():
        raise RuntimeError('db down')

    monkeypatch.setattr(main_module, 'SessionLocal', _dead_session)
    r = client.post('/narrate-day', json={
        'game_id': 'middle_earth',
        'day': {'day_number': 1, 'date': '1950-01-19'},
        'character': {'name': 'Tester'},
    })
    assert r.status_code == 200, r.text
    assert r.json()['generation']['text'] == fake['text']
