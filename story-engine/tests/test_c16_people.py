# ============================================================================
# C16 — people weigh, bookkeeping expires
# ----------------------------------------------------------------------------
# The live dump's retention was inverted: weather and need bookkeeping were
# born consolidated (immortal) while people encoded volatile and died in
# days. The fixes:
#
#  1. Encounters carry substance — the memory of contact is what passed
#     between them, not a bare name; slugs humanize ('large_patrol').
#  2. 'salience_min.<tag>' floors — thinking company is never background.
#  3. Contact forms wake the sleeper — the world already decided the
#     exchange happened.
#  4. Intensity sticks: high-|valence|/importance decays slower; trivia
#     never consolidates; consolidated rows still fade at a crawl.
#  5. Limpieza: resolved needs release their memory to the volatile
#     pool; duplicate rows fold into one every close.
# ============================================================================
import uuid
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.db import SessionLocal
from app.mind.lens import render_lens
from app.mind.memory import (
    _compact_duplicates,
    _release_resolved_needs,
    decay_pass,
)
from app.mind.tables import Brain, Memory, Need


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _open(client, char, ref, events, skills=None):
    r = client.post('/episodes', json={
        'game_id': 'middle_earth',
        'character': {'id': char, 'skills': skills or {}},
        'episode_ref': ref, 'events': events, 'day': {},
    })
    assert r.status_code == 200, r.text
    return r.json()


def _close(client, episode_id, outcome=None):
    r = client.post(
        f'/episodes/{episode_id}/close', json={'outcome': outcome or {}}
    )
    assert r.status_code == 200, r.text
    return r.json()


def _encounter(ep, **data):
    return {
        'type': 'encounter',
        'when': {'episode': ep, 'date': f'1950-05-0{ep}'},
        'where': {'region': 'minhiriath'},
        'data': data,
    }


def _memories(char):
    session = SessionLocal()
    rows = session.query(Memory).filter_by(character_id=char).all()
    session.close()
    return rows


def _brain(char):
    session = SessionLocal()
    brain = Brain(
        game_id='middle_earth', character_id=char, mold_slug='default',
        theme_weights={}, wiring={}, mood={}, counters={},
    )
    session.add(brain)
    session.commit()
    session.close()
    return char


def _session_brain(char):
    session = SessionLocal()
    return session, session.query(Brain).filter_by(
        game_id='middle_earth', character_id=char
    ).one()


# --- A) substance: the memory of contact is a happening, not a noun --------

def test_encounter_memory_carries_the_exchange(client):
    """The Dúnedain was stored as the bare name 'Dúnedain' — a census
    entry. Now the resolved substance is the memory."""
    char = _uid('ranger-talk')
    opened = _open(client, char, 'd1', [_encounter(
        1,
        entity='dnedain', entity_name='Dúnedain',
        entity_type='humans', form='brief_exchange',
        substance={
            'content': 'He asks whether she has seen movement north.',
            'stance': 'Answers what she knows. Does not say so.',
        },
    )])
    _close(client, opened['episode_id'])

    descs = [m.desc for m in _memories(char)]
    assert any('Dúnedain' in d for d in descs)
    assert any('movement north' in d for d in descs)
    assert any('Does not say so' in d for d in descs)


def test_encounter_reading_falls_back_to_prose_hint(client):
    """Contact without dialogue still reads as a happening — the form's
    prose seed is the detail."""
    char = _uid('lions')
    opened = _open(client, char, 'd1', [_encounter(
        1,
        entity='lions', entity_name='Spotted Lions',
        entity_type='carnivores', form='attacks', danger=3,
        prose_hint='erupt from the reeds in a rush of claws',
    )])
    _close(client, opened['episode_id'])

    descs = [m.desc for m in _memories(char)]
    assert descs == ['Spotted Lions — erupt from the reeds in a rush of claws']


def test_slug_subject_is_humanized(client):
    """'large_patrol' reached a memory verbatim — a slug is a key,
    never a name."""
    char = _uid('patrol')
    opened = _open(client, char, 'd1', [_encounter(
        1,
        entity='large_patrol', form='sign_only',
        prose_hint='boot-prints too many to count, heading north',
    )])
    _close(client, opened['episode_id'])

    descs = [m.desc for m in _memories(char)]
    assert descs and all('large_patrol' not in d for d in descs)
    assert any('large patrol' in d for d in descs)


# --- B) people weight ------------------------------------------------------

def test_people_exchange_beats_the_drizzle(client):
    """A noticed brief_exchange with thinking company clears the form
    floor — it can never sink to the 0.08 a conversation used to get."""
    char = _uid('people-weight')
    opened = _open(client, char, 'd1', [_encounter(
        1,
        entity='dnedain', entity_name='Dúnedain',
        entity_type='humans', form='brief_exchange',
    )])
    item = opened['psyche_packet']['perceived_day'][0]
    assert item['perception'] == 'noticed'
    assert item['salience'] >= 0.45


def test_salience_floor_only_lifts_what_registered(client):
    """An unnoticed thing keeps its dampened difuso — floors raise the
    perceived, never the missed."""
    char = _uid('missed')
    opened = _open(client, char, 'd1', [_encounter(
        1,
        entity='elves', entity_name='Elves', entity_type='elves',
        form='sign_only', check={'skill': 'tracking', 'difficulty': 30},
    )])
    item = opened['psyche_packet']['perceived_day'][0]
    assert item['perception'] == 'unnoticed'
    assert item['salience'] < 0.45


# --- F) contact wakes ------------------------------------------------------

def test_night_brief_exchange_wakes_the_mind(client):
    """20:30 'a wary exchange at the fire' used to pass ASLEEP — but the
    exchange already happened in the world. The roll runs now."""
    char = _uid('woken-talk')
    event = _encounter(
        1,
        entity='common_folk', entity_name='Common Folk',
        entity_type='humans', form='brief_exchange',
        check={'skill': 'tracking', 'difficulty': 3},
    )
    event['when']['phase'] = 'night'
    # Waking is not auto-noticing: the roll still runs, so a tracked
    # mind (tracking 9 + min roll > difficulty 3) always registers it.
    item = _open(client, char, 'd1', [event], skills={'tracking': 9})[
        'psyche_packet'
    ]['perceived_day'][0]
    assert item['perception'] == 'noticed'
    assert 'asleep' not in item['check']
    assert item['check']['attempted'] is True


# --- C/D) intensity sticks, trivia never fixes, nothing is immortal --------

def test_trivia_evoked_daily_never_consolidates():
    """The road-bread memory fixed at importance 0.06 because every meal
    re-evoked it. Recall without mattering no longer fixes."""
    char = _brain(_uid('trivia'))
    session, brain = _session_brain(char)
    session.add(Memory(
        game_id='middle_earth', character_id=char, episode_ids=[],
        kind='episodic', tags=['type:meal'], desc='the daily bread',
        importance=0.06, strength=0.5, evocations=18,
        consolidated=False, origin='experience', created_episode=1,
    ))
    session.commit()
    decay_pass(session, brain, current_episode_index=5)
    mem = session.query(Memory).filter_by(character_id=char).one()
    assert mem.consolidated is False
    session.close()


def test_intense_memory_outlives_trivia():
    """A frightening memory decays at the sticky rate — the corpse
    candles should still haunt her when the hare is long gone."""
    char = _brain(_uid('sticky'))
    session, brain = _session_brain(char)
    session.add_all([
        Memory(
            game_id='middle_earth', character_id=char, episode_ids=[],
            kind='episodic', tags=['entity:corpse_candles'],
            desc='the lights on the barrow', valence=-0.7,
            importance=0.5, strength=0.5, evocations=0,
            consolidated=False, origin='experience', created_episode=1,
        ),
        Memory(
            game_id='middle_earth', character_id=char, episode_ids=[],
            kind='episodic', tags=['entity:hares'], desc='a hare',
            valence=0.05, importance=0.45, strength=0.5, evocations=0,
            consolidated=False, origin='experience', created_episode=1,
        ),
    ])
    session.commit()
    decay_pass(session, brain, current_episode_index=5)
    by_desc = {
        m.desc: m.strength
        for m in session.query(Memory).filter_by(character_id=char)
    }
    assert by_desc['the lights on the barrow'] == pytest.approx(0.5 * 0.95)
    assert by_desc['a hare'] == pytest.approx(0.5 * 0.85)
    session.close()


def test_consolidated_still_fades_at_a_crawl():
    """Nothing is immortal — a fixed memory nobody ever stirs again
    thins at consolidated_decay and eventually goes."""
    char = _brain(_uid('slow-fade'))
    session, brain = _session_brain(char)
    session.add(Memory(
        game_id='middle_earth', character_id=char, episode_ids=[],
        kind='episodic', tags=[], desc='an old fixed thing',
        importance=0.9, strength=0.25, evocations=0,
        consolidated=True, origin='experience', created_episode=1,
    ))
    session.commit()
    decay_pass(session, brain, current_episode_index=5)
    mem = session.query(Memory).filter_by(character_id=char).one()
    assert mem.strength == pytest.approx(0.25 * 0.98)
    for ep in range(6, 30):
        decay_pass(session, brain, current_episode_index=ep)
    assert session.query(Memory).filter_by(character_id=char).count() == 0
    session.close()


# --- E) limpieza -----------------------------------------------------------

def test_resolved_need_releases_its_memory():
    """'The hunger' resolved is a closed chapter: its bookkeeping memory
    rejoins the volatile pool and wears away."""
    char = _brain(_uid('closed-chapter'))
    session, brain = _session_brain(char)
    session.add(Need(
        game_id='middle_earth', character_id=char, key='hunger',
        type='physiological', description='the hunger', urgency=0.0,
        status='resolved',
    ))
    session.add(Memory(
        game_id='middle_earth', character_id=char, episode_ids=['e1'],
        kind='episodic', tags=['need:hunger'], desc='the hunger',
        importance=1.0, strength=1.0, evocations=0,
        consolidated=True, origin='experience', created_episode=1,
    ))
    session.commit()
    assert _release_resolved_needs(session, brain) == 1
    mem = session.query(Memory).filter_by(character_id=char).one()
    assert mem.consolidated is False
    session.close()


def test_open_need_keeps_its_fixed_memory():
    """An open need's arc is still live — the release leaves it alone."""
    char = _brain(_uid('open-chapter'))
    session, brain = _session_brain(char)
    session.add(Need(
        game_id='middle_earth', character_id=char, key='hunger',
        type='physiological', description='the hunger', urgency=0.5,
        status='open',
    ))
    session.add(Memory(
        game_id='middle_earth', character_id=char, episode_ids=['e1'],
        kind='episodic', tags=['need:hunger'], desc='the hunger',
        importance=1.0, strength=1.0, evocations=0,
        consolidated=True, origin='experience', created_episode=1,
    ))
    session.commit()
    assert _release_resolved_needs(session, brain) == 0
    session.close()


def test_duplicate_memories_compact_every_close():
    """Legacy brains carry three identical exposure rows — limpieza
    folds them into one with the union of episodes and recall."""
    char = _brain(_uid('compact'))
    session, brain = _session_brain(char)
    for i, ep in enumerate((1, 2, 3)):
        session.add(Memory(
            game_id='middle_earth', character_id=char,
            episode_ids=[f'e{ep}'], kind='episodic',
            tags=['need:exposure'],
            desc='day upon day of hostile weather has worn the spirit thin',
            importance=1.0, strength=1.0, evocations=i + 1,
            consolidated=True, origin='experience', created_episode=ep,
        ))
    session.commit()
    assert _compact_duplicates(session, brain) == 2
    survivors = session.query(Memory).filter_by(character_id=char).all()
    assert len(survivors) == 1
    keep = survivors[0]
    assert sorted(keep.episode_ids) == ['e1', 'e2', 'e3']
    assert keep.evocations == 6
    session.close()


# --- G) the lens reads one impression, not three copies --------------------

def test_lens_dedupes_identical_impressions():
    mems = [
        SimpleNamespace(desc='day upon day of hostile weather'),
        SimpleNamespace(desc='day upon day of hostile weather'),
        SimpleNamespace(desc='the ranger at the roadside'),
    ]
    lens = render_lens('Celebrian', {'dominant': 'worn'}, [], mems)
    assert lens.count('day upon day of hostile weather') == 1
    assert 'the ranger at the roadside' in lens
