# ============================================================================
# C2 — evocation by depth: fresh channel, felt gate, lived recency
# ----------------------------------------------------------------------------
# Spec: docs/design/memory-depths.md §2-3. The three depths evoke by
# different doors:
#  * N1 fresh (volatile, ≤ fresh_episodes lived days): presents itself
#    on recency alone — yesterday's storm colours a clear today.
#  * N2/N3 (consolidated / conviction): needs contact, semantics, or
#    feeling-as-the-day — the felt gate opens when the day's pulls come
#    close enough to how the memory felt.
# Recency counts days LIVED (episode_idx), not calendar days — a month
# of rest between journeys is no age at all. Consolidated rows get no
# alpha share: they compete on connection alone.
# ============================================================================
import uuid

from types import SimpleNamespace

from app.db import SessionLocal
from app.mind.retrieval import retrieve
from app.mind.tables import Memory


GAME = 'middle_earth'


def _session_with_memories(*mems):
    character_id = f'c2-{uuid.uuid4().hex[:8]}'
    session = SessionLocal()
    for m in mems:
        session.add(Memory(
            game_id=GAME, character_id=character_id,
            **{k: v for k, v in m.items() if k != 'character_id'},
        ))
    session.flush()
    return session, character_id


def _brain(character_id, wiring=None):
    return SimpleNamespace(character_id=character_id, wiring=wiring)


def _episode(ep_idx):
    return SimpleNamespace(
        episode_idx=ep_idx,
        events=[{'when': {}}],
    )


def _day(*tags, reading='a quiet road under a pale sky', mood_pull=None):
    item = {
        'type': 'encounter', 'perception': 'noticed',
        'reading': reading, 'tags': list(tags), 'salience': 0.5,
    }
    if mood_pull:
        item['mood_pull'] = mood_pull
    return [item]


def test_fresh_memory_evokes_on_recency_alone():
    """The storm yesterday had ambient-only tags — under the old gate it
    could never speak. Inside the fresh window it presents itself
    anyway: what just happened is always at hand."""
    session, char = _session_with_memories({
        'desc': 'the storm tangled itself into my limbs',
        'tags': ['type:climate', 'tag:weather:wet'],
        'importance': 0.7, 'strength': 0.6,
        'consolidated': False, 'created_episode': 9,
    })
    evoked = retrieve(
        session, _brain(char), _episode(10),
        _day('entity:wolves'),
    )
    assert len(evoked) == 1
    session.rollback()
    session.close()


def test_past_the_fresh_window_needs_connection():
    """Three lived days out, the same all-ambient memory is back to
    needing the day to touch it — the window closed."""
    session, char = _session_with_memories({
        'desc': 'the storm tangled itself into my limbs',
        'tags': ['type:climate', 'tag:weather:wet'],
        'importance': 0.7, 'strength': 0.6,
        'consolidated': False, 'created_episode': 7,
    })
    evoked = retrieve(
        session, _brain(char), _episode(10),
        _day('entity:wolves'),
    )
    assert evoked == []
    session.rollback()
    session.close()


def test_consolidated_evokes_on_connection_regardless_of_age():
    """A consolidated memory competes on connection alone — nine lived
    days out it still stirs when the day touches its subject (the old
    calendar-decay made a seed's evocation mechanically impossible)."""
    session, char = _session_with_memories({
        'desc': 'an orc patrol at the ford did not see me',
        'tags': ['entity:orcs'],
        'importance': 0.7, 'strength': 0.6,
        'consolidated': True, 'created_episode': 1,
    })
    evoked = retrieve(
        session, _brain(char), _episode(10),
        _day('entity:orcs'),
    )
    assert len(evoked) == 1
    session.rollback()
    session.close()


def test_felt_gate_opens_for_consolidated_only():
    """Old grief surfaces on a grey day: nothing shared — no tag, no
    words — but the day felt like the memory felt."""
    session, char = _session_with_memories({
        'desc': 'I have waited centuries for a blow that never came',
        'tags': ['entity:angmar', 'type:encounter'],
        'importance': 0.7, 'strength': 0.6,
        'consolidated': True, 'created_episode': 1,
        'felt': [{'target': {'valence': -0.8, 'arousal': -0.3,
                             'dominance': -0.5}}],
    })
    evoked = retrieve(
        session, _brain(char), _episode(10),
        _day('entity:wolves', mood_pull=[{
            'target': {'valence': -0.7, 'arousal': -0.3,
                       'dominance': -0.5},
        }]),
    )
    assert len(evoked) == 1
    session.rollback()
    session.close()


def test_felt_gate_does_not_open_for_volatiles():
    """The felt channel belongs to what was kept: a volatile memory
    past its fresh window with matching felt still needs contact."""
    session, char = _session_with_memories({
        'desc': 'a cold camp with no fire',
        'tags': ['place:nowhere', 'type:rest'],
        'importance': 0.7, 'strength': 0.6,
        'consolidated': False, 'created_episode': 7,
        'felt': [{'target': {'valence': -0.8, 'arousal': -0.3,
                             'dominance': -0.5}}],
    })
    evoked = retrieve(
        session, _brain(char), _episode(10),
        _day('entity:wolves', mood_pull=[{
            'target': {'valence': -0.8, 'arousal': -0.3,
                       'dominance': -0.5},
        }]),
    )
    assert evoked == []
    session.rollback()
    session.close()
