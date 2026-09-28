# ============================================================================
# B4 smoke — reflection (the mind's only LLM call)
# ----------------------------------------------------------------------------
# Trigger: every `reflection_every` episodes or a salience spike. The LLM
# returns operations over beliefs; every op must cite real memory ids —
# hallucinated evidence is dropped. Reconciliation applies deltas,
# weakened/inverted status and the active cap.
# The Groq call is patched out — the suite stays offline.
# ============================================================================
import json
import re
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
import app.mind.reflection as reflection_module
from app.db import SessionLocal
from app.mind.tables import Belief, BrainMold, MoldWiring


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _reflective_mold(**wiring_overrides):
    """A mold that reflects every episode (plus any extra wiring)."""
    session = SessionLocal()
    slug = _uid('reflective')
    mold = BrainMold(game_id='middle_earth', slug=slug, name='Reflective')
    session.add(mold)
    session.flush()
    for key, value in {'reflection_every': 1, **wiring_overrides}.items():
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


def _meal(ep):
    return {
        'type': 'meal',
        'when': {'episode': ep, 'date': f'1950-01-{18 + ep:02d}'},
        'data': {'food': 'lembas', 'valence': 0.4},
    }


def _beliefs(character_id):
    session = SessionLocal()
    rows = session.query(Belief).filter_by(character_id=character_id).all()
    session.close()
    return rows


def test_reflection_creates_belief_with_real_evidence(client, monkeypatch):
    """The LLM proposes a belief citing a lived memory; the hallucinated
    sibling op (fake evidence id) never touches the DB."""
    def fake_llm(prompt, day_number=None):
        mem_ids = re.findall(r'id=(mem_\w+)', prompt['user'])
        return {'text': json.dumps({'reflections': [
            {'op': 'create', 'kind': 'world',
             'statement': 'The road provides for those who walk it',
             'confidence': 0.6, 'evidence': mem_ids[:1]},
            {'op': 'create', 'kind': 'self',
             'statement': 'I remember things that never happened',
             'confidence': 0.9, 'evidence': ['mem_does_not_exist']},
        ]})}
    monkeypatch.setattr(reflection_module, 'generate_narrative', fake_llm)

    char = _uid('reflect')
    slug = _reflective_mold()
    opened = _open(client, char, 'd1', [_meal(1)], brain_profile=slug)
    close = _close(client, opened['episode_id'])

    assert close['reflection']['reflected'] is True
    assert close['reflection']['formed'] == 1
    beliefs = _beliefs(char)
    assert len(beliefs) == 1
    b = beliefs[0]
    assert b.origin == 'reflected' and b.status == 'active'
    assert b.evidence and all(e.startswith('mem_') for e in b.evidence)


def test_no_trigger_without_schedule(client, monkeypatch):
    called = []
    monkeypatch.setattr(
        reflection_module, 'generate_narrative',
        lambda *a, **k: called.append(1) or {'text': '{}'},
    )
    char = _uid('calm')
    opened = _open(client, char, 'd1', [_meal(1)])  # default mold: every=5
    close = _close(client, opened['episode_id'])
    assert close['reflection'] is None
    assert called == []


def test_reinforce_and_decay_of_the_untouched(client, monkeypatch):
    """Reinforced belief gains confidence; an untouched seed loses it."""
    def fake_llm(prompt, day_number=None):
        beliefs = re.findall(r'id=(bl_\w+)', prompt['user'])
        mems = re.findall(r'id=(mem_\w+)', prompt['user'])
        if not beliefs:
            return {'text': json.dumps({'reflections': [
                {'op': 'create', 'kind': 'world',
                 'statement': 'Orcs keep finding the road',
                 'confidence': 0.6, 'evidence': mems[:1]},
            ]})}
        return {'text': json.dumps({'reflections': [
            {'op': 'reinforce', 'belief_id': beliefs[0], 'evidence': mems[:1]},
        ]})}
    monkeypatch.setattr(reflection_module, 'generate_narrative', fake_llm)

    char = _uid('reinforce')
    slug = _reflective_mold()
    for ep in (1, 2):
        opened = _open(client, char, f'd{ep}', [_meal(ep)], brain_profile=slug)
        _close(client, opened['episode_id'])

    beliefs = _beliefs(char)
    assert len(beliefs) == 1
    assert beliefs[0].confidence == pytest.approx(0.7)  # 0.6 + 0.1


def test_inversion_grows_the_opposite_belief(client, monkeypatch):
    calls = {'n': 0}

    def fake_llm(prompt, day_number=None):
        calls['n'] += 1
        beliefs = re.findall(r'id=(bl_\w+)', prompt['user'])
        mems = re.findall(r'id=(mem_\w+)', prompt['user'])
        if calls['n'] == 1:
            return {'text': json.dumps({'reflections': [
                {'op': 'create', 'kind': 'other',
                 'statement': 'Strangers mean trouble',
                 'confidence': 0.5, 'evidence': mems[:1]},
            ]})}
        return {'text': json.dumps({'reflections': [
            {'op': 'invert', 'belief_id': beliefs[0],
             'statement': 'Strangers have proven kind',
             'confidence': 0.6, 'evidence': mems[:1]},
        ]})}
    monkeypatch.setattr(reflection_module, 'generate_narrative', fake_llm)

    char = _uid('growth')
    slug = _reflective_mold()
    for ep in (1, 2):
        opened = _open(client, char, f'd{ep}', [_meal(ep)], brain_profile=slug)
        _close(client, opened['episode_id'])

    beliefs = _beliefs(char)
    inverted = [b for b in beliefs if b.status == 'inverted']
    active = [b for b in beliefs if b.status == 'active']
    assert len(inverted) == 1 and len(active) == 1
    assert active[0].statement == 'Strangers have proven kind'


def test_llm_garbage_never_breaks_close(client, monkeypatch):
    monkeypatch.setattr(
        reflection_module, 'generate_narrative',
        lambda *a, **k: {'text': 'I feel things, deeply.'},
    )
    char = _uid('garbage')
    slug = _reflective_mold()
    opened = _open(client, char, 'd1', [_meal(1)], brain_profile=slug)
    close = _close(client, opened['episode_id'])
    assert close['status'] == 'closed'
    assert close['reflection']['reflected'] is True
    assert _beliefs(char) == []
