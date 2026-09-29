# ============================================================================
# C14 — temporal beliefs (horizon: enduring | transient)
# ----------------------------------------------------------------------------
# A belief can bind to the world's nature (enduring — 'the Dunedain are
# thieves') or to current circumstances (transient — 'this ford is
# dangerous these days'). Transient beliefs fade each closed episode they
# are not refreshed — time, not just reflection, dissolves them; below
# belief_weaken_below they go quiet. Enduring beliefs ignore the
# calendar and only decay when a reflection ignores them.
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
    session = SessionLocal()
    slug = _uid('horizon')
    mold = BrainMold(game_id='middle_earth', slug=slug, name='Horizon')
    session.add(mold)
    session.flush()
    for key, value in {'reflection_every': 1, **wiring_overrides}.items():
        session.add(MoldWiring(mold_id=mold.id, key=key, value=value))
    session.commit()
    session.close()
    return slug


def _quiet_mold():
    """A mold that never reflects inside a test — the calendar fade must
    be measured without the LLM voting."""
    return _reflective_mold(reflection_every=999)


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


def _seed_belief(char, horizon, confidence):
    session = SessionLocal()
    session.add(Belief(
        game_id='middle_earth', character_id=char, kind='world',
        horizon=horizon, statement=f'{horizon} truth of {char}',
        confidence=confidence, tags=[], evidence=[],
        origin='seed', status='active',
        formed_episode=0, updated_episode=0,
    ))
    session.commit()
    session.close()


def _belief(char):
    session = SessionLocal()
    b = session.query(Belief).filter_by(character_id=char).one()
    session.expunge(b)
    session.close()
    return b


def test_transient_belief_fades_with_the_days(client):
    """'This ford is dangerous these days' — close five quiet episodes
    and the circumstance stops being a belief: 0.5 * 0.9^5 < 0.3."""
    char = _uid('transient')
    slug = _quiet_mold()
    _seed_belief(char, 'transient', 0.5)
    last = None
    for ep in range(1, 6):
        opened = _open(client, char, f'd{ep}', [_meal(ep)], brain_profile=slug)
        last = _close(client, opened['episode_id'])
    assert last['beliefs_faded'] == 1
    b = _belief(char)
    assert b.confidence == pytest.approx(0.5 * 0.9 ** 5)
    assert b.status == 'weakened'


def test_enduring_belief_ignores_the_calendar(client):
    """'The Dunedain are thieves' is about people, not days — five quiet
    closes leave it exactly where the seed put it."""
    char = _uid('enduring')
    slug = _quiet_mold()
    _seed_belief(char, 'enduring', 0.5)
    last = None
    for ep in range(1, 6):
        opened = _open(client, char, f'd{ep}', [_meal(ep)], brain_profile=slug)
        last = _close(client, opened['episode_id'])
    assert last['beliefs_faded'] == 0
    b = _belief(char)
    assert b.confidence == pytest.approx(0.5)
    assert b.status == 'active'


def test_reflection_reads_the_horizon(client, monkeypatch):
    """The LLM declares horizon on create; absent or bogus values fall
    back to 'enduring' — never silently transient."""
    def fake_llm(prompt, day_number=None):
        mem_ids = re.findall(r'id=(mem_\w+)', prompt['user'])
        return {'text': json.dumps({'reflections': [
            {'op': 'create', 'kind': 'world', 'horizon': 'transient',
             'statement': 'This stretch of road is watched these days',
             'confidence': 0.6, 'evidence': mem_ids[:1]},
            {'op': 'create', 'kind': 'other', 'horizon': 'bogus',
             'statement': 'The innkeeper waters the ale',
             'confidence': 0.6, 'evidence': mem_ids[:1]},
        ]})}
    monkeypatch.setattr(reflection_module, 'generate_narrative', fake_llm)

    char = _uid('parsed')
    slug = _reflective_mold()
    opened = _open(client, char, 'd1', [_meal(1)], brain_profile=slug)
    _close(client, opened['episode_id'])

    session = SessionLocal()
    horizons = {
        b.statement: b.horizon
        for b in session.query(Belief).filter_by(character_id=char)
    }
    session.close()
    assert horizons == {
        'This stretch of road is watched these days': 'transient',
        'The innkeeper waters the ale': 'enduring',
    }


def test_reflection_ignores_transient_harder(client, monkeypatch):
    """A transient belief a reflection does not touch decays at the
    transient rate (x0.8) on top of the episode fade — circumstances
    unstated are circumstances gone."""
    monkeypatch.setattr(
        reflection_module, 'generate_narrative',
        lambda *a, **k: {'text': json.dumps({'reflections': []})},
    )
    char = _uid('ignored')
    _seed_belief(char, 'transient', 0.4)
    slug = _reflective_mold()
    opened = _open(client, char, 'd1', [_meal(1)], brain_profile=slug)
    _close(client, opened['episode_id'])

    b = _belief(char)
    # 0.4 * 0.9 (episode fade) * 0.8 (ignored at reflection) = 0.288
    assert b.confidence == pytest.approx(0.4 * 0.9 * 0.8)
    assert b.status == 'weakened'
