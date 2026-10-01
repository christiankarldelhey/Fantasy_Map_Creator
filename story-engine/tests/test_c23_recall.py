# ============================================================================
# C23 — recall is refractory; dialogue consults memory directly
# ----------------------------------------------------------------------------
# Two rules from live narration review:
#  1. Refractory + honest recency (retrieve): a memory dwelt on yesterday
#     sits quiet today, and recency ages from when the event HAPPENED —
#     never from when it was last recalled. Otherwise the same trivial
#     sighting re-summons itself every day, ad infinitum.
#  2. Dialogue recall (dialogue_recall): a spoken encounter probes memory
#     on its own terms — what was asked embeds against what the brain
#     retained, so the traveller may answer from their own past.
# ============================================================================
import uuid

from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.db import SessionLocal
from app.mind.retrieval import dialogue_recall, retrieve
from app.mind.tables import Memory
from app.prompt.sections.encounters import _describe_encounter


@pytest.fixture()
def client():
    return TestClient(main_module.app)


GAME = 'middle_earth'


def _session_with_memories(*mems):
    character_id = f'c23-{uuid.uuid4().hex[:8]}'
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


def test_memory_dwelt_on_yesterday_sits_quiet_today():
    """Contact or not — a memory evoked last episode is refractory and
    cannot stir again this episode."""
    session, char = _session_with_memories({
        'desc': 'a ranger asked about the roads north',
        'tags': ['tag:entity_type:humans'],
        'importance': 0.8, 'strength': 0.6,
        'created_episode': 5, 'last_evoked_episode': 9,
    })
    evoked = retrieve(
        session, _brain(char), _episode(10),
        _day('tag:entity_type:humans'),
    )
    assert evoked == []
    session.rollback()
    session.close()


def test_recency_ages_from_the_event_not_the_recall():
    """Two same-weight memories: one old but recalled yesterday, one
    fresher and never recalled. The fresher wins — recalling the old
    one did not make its EVENT newer."""
    session, char = _session_with_memories(
        {   # seen 8 days ago, dwelt on just yesterday — should age as old
            'desc': 'a fox watching from the treeline',
            'tags': ['tag:entity_type:carnivores'],
            'importance': 0.5, 'strength': 0.6,
            'created_episode': 2, 'last_evoked_episode': 6,
        },
        {   # seen 2 days ago, never recalled — genuinely fresher
            'desc': 'a wolf shadowing the march',
            'tags': ['tag:entity_type:carnivores'],
            'importance': 0.5, 'strength': 0.6,
            'created_episode': 8,
        },
    )
    evoked = retrieve(
        session, _brain(char), _episode(10),
        _day('tag:entity_type:carnivores'),
    )
    assert [m.desc for m in evoked][0] == 'a wolf shadowing the march'
    session.rollback()
    session.close()


def _dialogue_item(topic='news', content=None, tension=None):
    return {
        'type': 'encounter', 'perception': 'noticed', 'salience': 0.5,
        'data': {
            'entity_name': 'A shepherd', 'entity': 'shepherd_1',
            'topic': topic,
            'substance': {'content': content, 'tension': tension},
        },
        'evoked': [],
    }


def test_dialogue_recall_finds_the_memory_that_answers():
    """'Seen any wolves on the south road?' stirs the wolf sighting —
    the traveller can answer from what actually happened."""
    session, char = _session_with_memories({
        'desc': 'wolves crossing the south road at dusk',
        'tags': ['tag:entity_type:carnivores'],
        'importance': 0.5, 'strength': 0.5, 'created_episode': 4,
    })
    item = _dialogue_item(
        topic='wolves',
        content='asks if the traveller has seen wolves on the south road',
    )
    mem = dialogue_recall(session, _brain(char), item, 10)
    assert mem is not None
    assert 'wolves' in mem.desc
    session.rollback()
    session.close()


def test_dialogue_recall_stays_silent_without_a_match():
    """A question about bread prices must not dredge up the warg."""
    session, char = _session_with_memories({
        'desc': 'the warg attack left a scar on the forearm',
        'tags': ['tag:entity_type:carnivores'],
        'importance': 0.9, 'strength': 0.9, 'created_episode': 4,
    })
    item = _dialogue_item(
        topic='bread_prices',
        content='asks whether bread is still dear in the valley towns',
    )
    assert dialogue_recall(session, _brain(char), item, 10) is None
    session.rollback()
    session.close()


def test_dialogue_recall_respects_refractory():
    """The wolf memory consulted yesterday cannot answer again today."""
    session, char = _session_with_memories({
        'desc': 'wolves crossing the south road at dusk',
        'tags': ['tag:entity_type:carnivores'],
        'importance': 0.5, 'strength': 0.5,
        'created_episode': 4, 'last_evoked_episode': 9,
    })
    item = _dialogue_item(
        topic='wolves',
        content='asks if the traveller has seen wolves on the south road',
    )
    assert dialogue_recall(session, _brain(char), item, 10) is None
    session.rollback()
    session.close()


def test_recalls_label_speaks_to_the_answer_when_dialogue():
    """A spoken encounter's recall is framed as usable for the reply;
    a silent encounter's stays a beat of recollection."""
    base = {
        'entity': {'name': 'Shepherd', 'type': 'people'},
        'region': 'Nan Anduin',
        'echo': 'Yesterday — wolves crossing the south road at dusk',
        'interaction': {'form': 'talks', 'prose_hint': 'a brief exchange'},
    }
    spoken = dict(base)
    spoken['interaction'] = {
        **base['interaction'],
        'dialogue_content': {'topic': 'wolves'},
    }
    silent = dict(base)

    assert 'may inform what the traveller answers' in _describe_encounter(spoken)
    assert 'brief beat of recollection' in _describe_encounter(silent)
