# ============================================================================
# C20 — evocation must touch the day; the past reads as past
# ----------------------------------------------------------------------------
# Two rules from the lens review:
#  1. Contact gate (retrieve): freshness alone never evokes. A memory
#     needs a shared tag with today's PERCEIVED items (beliefs soften the
#     score but do not make contact) or semantic similarity above
#     retrieval_semantic_min. A day that touches nothing evokes nothing.
#  2. Age marking (render_lens): an evoked memory is prefixed with how
#     long ago it was lived — 'Yesterday — …', '5 days ago — …' — so the
#     narrator can never mistake yesterday's encounter for today's event.
# ============================================================================
import uuid

from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.db import SessionLocal
from app.mind.lens import _age_phrase, render_lens
from app.mind.retrieval import retrieve
from app.mind.tables import Memory


@pytest.fixture()
def client():
    return TestClient(main_module.app)


GAME = 'middle_earth'


def _session_with_memories(*mems):
    character_id = f'c20-{uuid.uuid4().hex[:8]}'
    session = SessionLocal()
    for m in mems:
        session.add(Memory(
            game_id=GAME, character_id=character_id,
            **{k: v for k, v in m.items() if k != 'character_id'},
        ))
    session.flush()
    return session, character_id


def _brain(character_id):
    return SimpleNamespace(character_id=character_id, wiring=None)


def _episode(ep_idx):
    return SimpleNamespace(
        events=[{'when': {'episode': ep_idx, 'date': '1950-01-20'}}],
    )


def _day(*tags, reading='wolf-prints crossing the path'):
    return [{
        'type': 'encounter', 'perception': 'noticed',
        'reading': reading, 'tags': list(tags), 'salience': 0.5,
    }]


def test_fresh_and_important_memory_without_contact_stays_unevoked():
    """Yesterday's Dúnedain on a wolf-sign day: recency and importance
    alone do not summon it — it must touch today's story."""
    session, char = _session_with_memories({
        'desc': 'a ranger asked about the roads north',
        'tags': ['tag:entity_type:humans'],
        'importance': 0.8, 'strength': 0.6, 'created_episode': 9,
    })
    evoked = retrieve(
        session, _brain(char), _episode(10),
        _day('tag:entity_type:carnivores'),
    )
    assert evoked == []
    session.rollback()
    session.close()


def test_memory_sharing_a_tag_with_today_evokes():
    session, char = _session_with_memories({
        'desc': 'a ranger asked about the roads north',
        'tags': ['tag:entity_type:humans'],
        'importance': 0.8, 'strength': 0.6, 'created_episode': 9,
    })
    evoked = retrieve(
        session, _brain(char), _episode(10),
        _day('tag:entity_type:humans', 'entity:42'),
    )
    assert [m.desc for m in evoked] == [
        'a ranger asked about the roads north']
    session.rollback()
    session.close()


def test_semantic_overlap_evokes_even_without_shared_tags():
    """B8 is the second door: same words, different tags — the mind
    still makes contact."""
    desc = 'the rain soaked the cloak by the marsh'
    session, char = _session_with_memories({
        'desc': desc, 'tags': ['tag:entity_type:humans'],
        'importance': 0.8, 'strength': 0.6, 'created_episode': 9,
    })
    evoked = retrieve(
        session, _brain(char), _episode(10),
        _day('tag:weather:wet', reading=desc),
    )
    assert len(evoked) == 1
    session.rollback()
    session.close()


def test_purely_ambient_memories_never_evoke():
    """Meal, weather, mileage and vitals are ambience — the recurrence
    channel owns their repetition. All-ambient tags means no door at
    all, not even the semantic one."""
    session, char = _session_with_memories(
        {   # the eternal road-bread: identical desc to today's reading
            'desc': 'a ration of road-bread and dried fruit, water from the skin',
            'tags': ['type:meal', 'tag:food:a ration of road-bread',
                     'tag:drink:waterskin', 'region:South Arthedain'],
            'importance': 0.8, 'strength': 0.6, 'created_episode': 9,
        },
        {   # a wet day on a wet day — same sky is not a story
            'desc': 'cool, partly cloudy, a passing shower',
            'tags': ['type:climate', 'tag:weather:wet', 'region:X'],
            'importance': 0.8, 'strength': 0.6, 'created_episode': 9,
        },
        {   # vitals are the body's channel
            'desc': 'a body', 'tags': ['type:body'],
            'importance': 0.8, 'strength': 0.6, 'created_episode': 9,
        },
    )
    evoked = retrieve(
        session, _brain(char), _episode(10),
        _day('tag:weather:wet', 'type:meal',
             reading='a ration of road-bread and dried fruit, water from the skin'),
    )
    assert evoked == []
    session.rollback()
    session.close()


def test_unwordable_items_never_encode():
    """'body'/'travel' resolve no reading by design — without words
    there is no impression, so no 'a body' row is ever written."""
    from app.mind.memory import encode_episode
    session = SessionLocal()
    char = f'c20-{uuid.uuid4().hex[:8]}'
    episode = SimpleNamespace(
        id=f'ep-{uuid.uuid4().hex[:8]}', game_id=GAME, character_id=char,
        events=[{'when': {'episode': 1, 'date': '1950-01-18'}}],
        perceived_day=[
            {'type': 'body', 'salience': 0.5, 'perception': 'noticed',
             'data': {'energy': 40, 'shadow': 30}, 'tags': ['type:body']},
            {'type': 'travel', 'salience': 0.5, 'perception': 'noticed',
             'data': {'distance_km': 10}, 'tags': ['type:travel']},
            {'type': 'encounter', 'salience': 0.5, 'perception': 'noticed',
             'data': {'entity_name': 'Foxes'}, 'reading': 'Foxes — prints',
             'tags': ['type:encounter', 'entity:foxes']},
        ],
    )
    encode_episode(session, SimpleNamespace(wiring=None), episode)
    session.flush()
    mems = session.query(Memory).filter_by(
        game_id=GAME, character_id=char).all()
    assert [m.desc for m in mems] == ['Foxes — prints']
    session.rollback()
    session.close()


def test_region_alone_does_not_make_contact():
    """'Things happened here once' is geography, not story — the
    Dúnedain she met in this country stays quiet on a wolf-sign day."""
    session, char = _session_with_memories({
        'desc': 'Dúnedain — the settlement is real and occupied',
        'tags': ['type:encounter', 'entity:dunedain_3',
                 'tag:entity_type:humans', 'region:Rast Vorn'],
        'importance': 0.8, 'strength': 0.6, 'created_episode': 9,
    })
    evoked = retrieve(
        session, _brain(char), _episode(10),
        # Same region today — geography alone must not summon him.
        _day('tag:entity_type:carnivores', 'region:Rast Vorn'),
    )
    assert evoked == []
    session.rollback()
    session.close()

def test_lens_marks_the_past_as_past():
    assert _age_phrase(None, 2) == '2 days ago — '
    assert _age_phrase(None, 1) == 'Yesterday — '
    assert _age_phrase(None, 18) == 'A long while ago — '
    brief = {'focus': None, 'day': [], 'carried': [
        {'kind': 'memory', 'text': 'the warg attack', 'age': 'A long while ago — '},
    ]}
    lens = render_lens('Celebrian', brief)
    assert 'A long while ago — the warg attack' in lens
    # And the narrator is told what an 'ago' line is.
    assert 'never as events happening now' in lens
