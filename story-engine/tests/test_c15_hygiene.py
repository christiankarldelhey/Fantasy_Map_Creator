# ============================================================================
# C15 — hygiene pass from the Celebrian live dump
# ----------------------------------------------------------------------------
# Three real defects seen in play:
#  1. An open need at urgency 1.0 carries salience 1.0 into perceived_day,
#     which tripped the reflection's high-salience trigger EVERY close —
#     a second LLM call per day. Mind-made items (need, recurrence) are
#     bookkeeping; only the world may spike a reflection.
#  2. A need encoded a fresh identical memory each day — 'the hunger'
#     must be one memory that gains days, not a copy per dawn.
#  3. Sentinel tags from older episodes ('tag:wounded:none') could streak
#     and break — 'no none today' is not a lived event.
#  4. Need memories sat at importance 1.0 atop the reflection evidence,
#     minting beliefs that re-say the need ('I need shelter').
# ============================================================================
import json
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
import app.mind.reflection as reflection_module
from app.db import SessionLocal
from app.mind.tables import BrainMold, Memory, MoldWiring


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _mold(**wiring):
    session = SessionLocal()
    slug = _uid('hygiene')
    mold = BrainMold(game_id='middle_earth', slug=slug, name='Hygiene')
    session.add(mold)
    session.flush()
    for key, value in wiring.items():
        session.add(MoldWiring(mold_id=mold.id, key=key, value=value))
    session.commit()
    session.close()
    return slug


def _open(client, char, ref, events, brain_profile=None):
    character = {'id': char}
    if brain_profile:
        character['brain_profile'] = brain_profile
    r = client.post('/episodes', json={
        'game_id': 'middle_earth', 'character': character,
        'episode_ref': ref, 'events': events, 'day': {},
    })
    assert r.status_code == 200, r.text
    return r.json()


def _close(client, episode_id):
    r = client.post(f'/episodes/{episode_id}/close', json={})
    assert r.status_code == 200, r.text
    return r.json()


def _hungry_body(ep):
    return {
        'type': 'body',
        'when': {'episode': ep, 'date': f'1950-05-0{ep}'},
        'data': {'energy': 0.8, 'days_without_food': 2,
                 'days_without_water': 0},
    }


def test_open_need_never_spikes_reflection(client, monkeypatch):
    """Urgency 1.0 -> salience 1.0 -> the old trigger fired the LLM at
    every close. A body complaint is not world news."""
    called = []
    monkeypatch.setattr(
        reflection_module, 'generate_narrative',
        lambda *a, **k: called.append(1) or {'text': '{}'},
    )
    char = _uid('quiet-need')
    # Cadence far away AND nothing else in the day — only the need's
    # salience could have fired the trigger.
    slug = _mold(reflection_every=99)
    opened = _open(client, char, 'd1', [_hungry_body(1)], brain_profile=slug)
    close = _close(client, opened['episode_id'])
    assert close['reflection'] is None
    assert called == []


def test_a_need_is_one_memory_not_one_per_day(client):
    """Two hungry days, one hunger memory — episode_ids accrete."""
    char = _uid('hunger-arc')
    slug = _mold(reflection_every=99)
    for ep in (1, 2):
        opened = _open(
            client, char, f'd{ep}', [_hungry_body(ep)], brain_profile=slug,
        )
        _close(client, opened['episode_id'])

    session = SessionLocal()
    hunger = [
        m for m in session.query(Memory)
        .filter_by(character_id=char)
        if any(t == 'need:hunger' for t in (m.tags or []))
    ]
    session.close()
    assert len(hunger) == 1
    assert len(hunger[0].episode_ids) == 2


def test_sentinel_tags_never_streak_or_break(client):
    """tag:wounded:none in history must not resurface as 'no none
    today' — absence is not a theme."""
    char = _uid('sentinel')
    slug = _mold(reflection_every=99, repetition_min_streak=2)
    body = lambda ep: {  # noqa: E731
        'type': 'body',
        'when': {'episode': ep, 'date': f'1950-05-0{ep}'},
        'data': {'energy': 0.8, 'wounded': 'none',
                 'days_without_food': 0, 'days_without_water': 0},
    }
    for ep in (1, 2, 3):
        opened = _open(client, char, f'd{ep}', [body(ep)], brain_profile=slug)
        packet = opened['psyche_packet']
        assert not any(
            'none' in (i.get('reading') or '')
            for i in packet['perceived_day']
            if i.get('type') == 'recurrence'
        )
        _close(client, opened['episode_id'])


def test_need_memories_never_reach_the_reflection_prompt(
    client, monkeypatch,
):
    """The body's complaints are felt via mood/lens — the reflection
    prompt must list world events, not 'I need shelter' reruns."""
    seen = {}
    monkeypatch.setattr(
        reflection_module, 'generate_narrative',
        lambda prompt, **k: (
            seen.__setitem__('user', prompt['user'])
            or {'text': json.dumps({'reflections': []})}
        ),
    )
    char = _uid('evidence')
    slug = _mold(reflection_every=1)
    meal = {
        'type': 'meal',
        'when': {'episode': 1, 'date': '1950-05-01'},
        'data': {'food': 'lembas', 'valence': 0.4},
    }
    opened = _open(
        client, char, 'd1', [_hungry_body(1), meal], brain_profile=slug,
    )
    _close(client, opened['episode_id'])

    session = SessionLocal()
    need_descs = [
        m.desc for m in session.query(Memory).filter_by(character_id=char)
        if any(t.startswith('need:') for t in (m.tags or []))
    ]
    session.close()
    assert need_descs  # the need DID encode — it just never reaches the prompt
    prompt = seen['user']
    assert not any(d in prompt for d in need_descs)
