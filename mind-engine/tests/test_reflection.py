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
from app.mind.tables import Memory, Mind, MindPreset, PresetWiring


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _reflective_mold(personality=None, **wiring_overrides):
    """A preset that reflects every episode (plus any extra wiring)."""
    session = SessionLocal()
    slug = _uid('reflective')
    preset = MindPreset(
        game_id='middle_earth', slug=slug, name='Reflective',
        personality=personality,
    )
    session.add(preset)
    session.flush()
    for key, value in {'reflection_every': 1, **wiring_overrides}.items():
        session.add(PresetWiring(preset_id=preset.id, key=key, value=value))
    session.commit()
    session.close()
    return slug


def _open(client, char, ref, events, preset=None):
    character = {'id': char}
    if preset:
        character['preset'] = preset
    r = client.post('/episodes', json={
        'game_id': 'middle_earth', 'character': character,
        'episode_ref': ref, 'events': events,
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
        'when': {},
        'data': {'food': 'lembas', 'tags': ['given']},
    }


def _beliefs(character_id):
    """The character's conviction-tier memory rows (#168) — beliefs fold
    into Memory with a `conviction` facet."""
    session = SessionLocal()
    rows = (
        session.query(Memory)
        .filter_by(character_id=character_id, kind='conviction')
        .all()
    )
    session.close()
    return rows


def _belief_ids(prompt):
    """Belief ids inside the reflection prompt — conviction rows list as
    'id=<mem_*> kind=<...>' next to the evidence's bare 'id=' lines."""
    return re.findall(r'id=(mem_\w+) kind=', prompt['user'])


def test_reflection_creates_belief_with_real_evidence(client, monkeypatch):
    """The LLM proposes a belief citing a lived memory; the hallucinated
    sibling op (fake evidence id) never touches the DB."""
    def fake_llm(prompt, day_number=None):
        mem_ids = re.findall(r'id=(mem_\w+)', prompt['user'])
        return {'text': json.dumps({'reflections': [
            {'op': 'create', 'kind': 'world',
             'statement': 'The road provides for those who walk it',
             'strength': 3, 'evidence': mem_ids[:1]},
            {'op': 'create', 'kind': 'self',
             'statement': 'I remember things that never happened',
             'strength': 4.5, 'evidence': ['mem_does_not_exist']},
        ]})}
    monkeypatch.setattr(reflection_module, 'generate_narrative', fake_llm)

    char = _uid('reflect')
    slug = _reflective_mold()
    opened = _open(client, char, 'd1', [_meal(1)], preset=slug)
    close = _close(client, opened['episode_id'])

    assert close['reflection']['reflected'] is True
    assert close['reflection']['formed'] == 1
    beliefs = _beliefs(char)
    assert len(beliefs) == 1
    b = beliefs[0]
    assert b.origin == 'reflected' and b.conviction['status'] == 'active'
    assert all(e.startswith('mem_') for e in b.conviction['evidence'])


def test_no_trigger_without_schedule(client, monkeypatch):
    called = []
    monkeypatch.setattr(
        reflection_module, 'generate_narrative',
        lambda *a, **k: called.append(1) or {'text': '{}'},
    )
    char = _uid('calm')
    opened = _open(client, char, 'd1', [_meal(1)])  # default preset: every=5
    close = _close(client, opened['episode_id'])
    assert close['reflection'] is None
    assert called == []


def test_reinforce_and_decay_of_the_untouched(client, monkeypatch):
    """Reinforced belief gains strength; an untouched seed loses it."""
    def fake_llm(prompt, day_number=None):
        beliefs = _belief_ids(prompt)
        mems = re.findall(r'id=(mem_\w+)', prompt['user'])
        if not beliefs:
            return {'text': json.dumps({'reflections': [
                {'op': 'create', 'kind': 'world',
                 'statement': 'Orcs keep finding the road',
                 'strength': 3, 'evidence': mems[:1]},
            ]})}
        return {'text': json.dumps({'reflections': [
            {'op': 'reinforce', 'belief_id': beliefs[0], 'evidence': mems[:1]},
        ]})}
    monkeypatch.setattr(reflection_module, 'generate_narrative', fake_llm)

    char = _uid('reinforce')
    slug = _reflective_mold()
    for ep in (1, 2):
        opened = _open(client, char, f'd{ep}', [_meal(ep)], preset=slug)
        _close(client, opened['episode_id'])

    beliefs = _beliefs(char)
    assert len(beliefs) == 1
    assert beliefs[0].conviction['strength'] == pytest.approx(3.5)  # 3 + .5


def test_inversion_grows_the_opposite_belief(client, monkeypatch):
    calls = {'n': 0}

    def fake_llm(prompt, day_number=None):
        calls['n'] += 1
        beliefs = _belief_ids(prompt)
        mems = re.findall(r'id=(mem_\w+)', prompt['user'])
        if calls['n'] == 1:
            return {'text': json.dumps({'reflections': [
                {'op': 'create', 'kind': 'other',
                 'statement': 'Strangers mean trouble',
                 'strength': 2.5, 'evidence': mems[:1]},
            ]})}
        return {'text': json.dumps({'reflections': [
            {'op': 'invert', 'belief_id': beliefs[0],
             'statement': 'Strangers have proven kind',
             'strength': 3, 'evidence': mems[:1]},
        ]})}
    monkeypatch.setattr(reflection_module, 'generate_narrative', fake_llm)

    char = _uid('growth')
    slug = _reflective_mold()
    for ep in (1, 2):
        opened = _open(client, char, f'd{ep}', [_meal(ep)], preset=slug)
        _close(client, opened['episode_id'])

    beliefs = _beliefs(char)
    inverted = [b for b in beliefs if b.conviction['status'] == 'inverted']
    active = [b for b in beliefs if b.conviction['status'] == 'active']
    assert len(inverted) == 1 and len(active) == 1
    assert active[0].desc == 'Strangers have proven kind'


def test_ambient_memories_never_reach_the_prompt(client, monkeypatch):
    """Three days of drizzle is weather, not conviction: a memory with
    low importance AND flat valence never enters the reflection prompt —
    the LLM is not even called."""
    called = []
    monkeypatch.setattr(
        reflection_module, 'generate_narrative',
        lambda *a, **k: called.append(1) or {'text': '{}'},
    )
    char = _uid('ambient')
    slug = _reflective_mold()
    drizzle = {
        'type': 'climate',
        'when': {},
        'data': {'precipitation': 1.0},  # wet tag, salience ~0.05, v=0
    }
    opened = _open(client, char, 'd1', [drizzle], preset=slug)
    close = _close(client, opened['episode_id'])
    assert close['reflection']['reflected'] is False
    assert close['reflection']['reason'] == 'no_strong_evidence'
    assert called == []


def test_new_beliefs_cap_per_reflection(client, monkeypatch):
    """A worldview accretes slowly — the LLM proposing three fresh
    beliefs in one sitting gets the wiring's cap, not the flood."""
    def fake_llm(prompt, day_number=None):
        mem_ids = re.findall(r'id=(mem_\w+)', prompt['user'])
        return {'text': json.dumps({'reflections': [
            {'op': 'create', 'kind': 'world', 'statement': f'lesson {i}',
             'strength': 3.5, 'evidence': mem_ids[:1]}
            for i in range(3)
        ]})}
    monkeypatch.setattr(reflection_module, 'generate_narrative', fake_llm)

    char = _uid('prolific')
    slug = _reflective_mold()
    opened = _open(client, char, 'd1', [_meal(1)], preset=slug)
    close = _close(client, opened['episode_id'])
    assert close['reflection']['formed'] == 2
    assert len(_beliefs(char)) == 2


def test_llm_garbage_never_breaks_close(client, monkeypatch):
    monkeypatch.setattr(
        reflection_module, 'generate_narrative',
        lambda *a, **k: {'text': 'I feel things, deeply.'},
    )
    char = _uid('garbage')
    slug = _reflective_mold()
    opened = _open(client, char, 'd1', [_meal(1)], preset=slug)
    close = _close(client, opened['episode_id'])
    assert close['status'] == 'closed'
    assert close['reflection']['reflected'] is True
    assert _beliefs(char) == []


def _episodic_memories(character_id):
    session = SessionLocal()
    rows = (
        session.query(Memory)
        .filter_by(character_id=character_id)
        .filter(Memory.kind != 'conviction')
        .all()
    )
    session.close()
    return rows


def test_reword_matures_a_memory_desc(client, monkeypatch):
    """A reword op retells the memory in the mind's own words — desc
    only, the values never move."""
    def fake_llm(prompt, day_number=None):
        mem_ids = re.findall(r'id=(mem_\w+)', prompt['user'])
        return {'text': json.dumps({'reflections': [
            {'op': 'reword', 'memory_id': mem_ids[0],
             'desc': 'the lembas that tasted like kindness'},
            {'op': 'reword', 'memory_id': 'mem_does_not_exist',
             'desc': 'a memory that never happened'},
        ]})}
    monkeypatch.setattr(reflection_module, 'generate_narrative', fake_llm)

    char = _uid('reword')
    slug = _reflective_mold()
    opened = _open(client, char, 'd1', [_meal(1)], preset=slug)
    close = _close(client, opened['episode_id'])

    assert close['reflection']['reworded'] == 1
    mems = _episodic_memories(char)
    assert [m.desc for m in mems] == ['the lembas that tasted like kindness']
    assert mems[0].importance  # values untouched


def test_statement_rewrites_a_contradicted_belief(client, monkeypatch):
    """A belief contradicted by the evidence can be rewritten, not just
    weakened — the mind changes its opinion in words."""
    calls = {'n': 0}

    def fake_llm(prompt, day_number=None):
        calls['n'] += 1
        beliefs = _belief_ids(prompt)
        mems = re.findall(r'id=(mem_\w+)', prompt['user'])
        if calls['n'] == 1:
            return {'text': json.dumps({'reflections': [
                {'op': 'create', 'kind': 'world',
                 'statement': 'the East is still safe',
                 'strength': 3, 'evidence': mems[:1]},
            ]})}
        return {'text': json.dumps({'reflections': [
            {'op': 'contradict', 'belief_id': beliefs[0],
             'statement': 'the East is not what it was',
             'evidence': mems[:1]},
        ]})}
    monkeypatch.setattr(reflection_module, 'generate_narrative', fake_llm)

    char = _uid('reworded-belief')
    slug = _reflective_mold()
    for ep in (1, 2):
        opened = _open(client, char, f'd{ep}', [_meal(ep)], preset=slug)
        _close(client, opened['episode_id'])

    beliefs = _beliefs(char)
    assert len(beliefs) == 1
    assert beliefs[0].desc == 'the East is not what it was'
    assert beliefs[0].conviction['strength'] == pytest.approx(2.25)


def test_mood_prose_rewords_the_carried_cause(client, monkeypatch):
    """mood_prose lands on the carried cause; the lens line speaks the
    reflection's words while that cause rides."""
    monkeypatch.setattr(
        reflection_module, 'generate_narrative',
        lambda *a, **k: {'text': json.dumps({
            'reflections': [],
            'mood_prose': 'the grey weight of the empty land',
        })},
    )
    char = _uid('moody')
    slug = _reflective_mold()
    opened = _open(client, char, 'd1', [_meal(1)], preset=slug)

    session = SessionLocal()
    mind = session.query(Mind).filter_by(character_id=char).one()
    mind.mood = {
        **(mind.mood or {}), 'valence': -0.5,
        'cause': {'reading': 'the orc tracks at the ford',
                  'valence': -0.4, 'tags': []},
    }
    session.commit()
    session.close()

    close = _close(client, opened['episode_id'])
    assert close['reflection']['mood_reworded'] is True

    session = SessionLocal()
    mind = session.query(Mind).filter_by(character_id=char).one()
    cause = mind.mood['cause']
    assert cause['prose'] == 'the grey weight of the empty land'
    assert cause['reading'] == 'the orc tracks at the ford'  # anchor kept
    session.close()

    from app.mind.lens import _mood_line
    line = _mood_line(mind.mood)
    assert 'the grey weight of the empty land' in line


def test_mood_prose_dies_with_its_cause(client, monkeypatch):
    """A new deterministic cause rebuilds the dict — the old AI wording
    never outlives the cause it described."""
    monkeypatch.setattr(
        reflection_module, 'generate_narrative',
        lambda *a, **k: {'text': json.dumps({
            'reflections': [], 'mood_prose': 'worded once',
        })},
    )
    char = _uid('turned')
    slug = _reflective_mold()
    opened = _open(client, char, 'd1', [_meal(1)], preset=slug)

    session = SessionLocal()
    mind = session.query(Mind).filter_by(character_id=char).one()
    mind.mood = {
        **(mind.mood or {}), 'valence': -0.5,
        'cause': {'reading': 'the orc tracks', 'valence': -0.4,
                  'tags': []},
    }
    session.commit()
    session.close()
    _close(client, opened['episode_id'])

    # Next open carries a fresh cause — the prose must be gone.
    _open(client, char, 'd2', [{
        'type': 'encounter',
        'when': {},
        'data': {'entity': 'orcs', 'outcome': 'wounded'},
    }])
    session = SessionLocal()
    mind = session.query(Mind).filter_by(character_id=char).one()
    cause = (mind.mood or {}).get('cause')
    session.close()
    assert cause is None or 'prose' not in cause


def test_reflectiveness_bends_the_cadence(client, monkeypatch):
    """reflectiveness=1 gathers thoughts almost daily even under a slow
    wiring cadence."""
    monkeypatch.setattr(
        reflection_module, 'generate_narrative',
        lambda *a, **k: {'text': '{}'},
    )
    char = _uid('pensive')
    slug = _reflective_mold(
        personality={'reflectiveness': 1.0}, reflection_every=5,
    )
    opened = _open(client, char, 'd1', [_meal(1)], preset=slug)
    close = _close(client, opened['episode_id'])
    assert close['reflection'] is not None


def test_no_reflectiveness_no_cadence(client, monkeypatch):
    """reflectiveness=0: only the world can spike a reflection — a calm
    day under a fast cadence still does not call."""
    called = []
    monkeypatch.setattr(
        reflection_module, 'generate_narrative',
        lambda *a, **k: called.append(1) or {'text': '{}'},
    )
    char = _uid('unreflective')
    slug = _reflective_mold(
        personality={'reflectiveness': 0}, reflection_every=1,
    )
    opened = _open(client, char, 'd1', [_meal(1)], preset=slug)
    close = _close(client, opened['episode_id'])
    assert close['reflection'] is None
    assert called == []
