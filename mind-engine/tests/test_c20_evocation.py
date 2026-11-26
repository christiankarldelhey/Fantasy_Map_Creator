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
from app.mind.lens import _age_phrase, brief_beats
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
        episode_idx=ep_idx,
        events=[{'when': {}}],
    )


def _day(*tags, reading='wolf-prints crossing the path'):
    return [{
        'type': 'encounter', 'perception': 'noticed',
        'reading': reading, 'tags': list(tags), 'salience': 0.5,
    }]


def test_past_the_fresh_window_memory_without_contact_stays_unevoked():
    """A memory whose tags share neither a tag nor a coarse facet with
    today stays quiet once its fresh window closed (C2): inside it, the
    N1 channel lets recency present the memory alone — outside, it must
    touch today's story."""
    session, char = _session_with_memories({
        'desc': 'a ranger asked about the roads north',
        'tags': ['tag:form:brief_exchange'],
        'importance': 0.8, 'strength': 0.6, 'created_episode': 6,
    })
    evoked = retrieve(
        session, _brain(char), _episode(10),
        _day('tag:entity_type:carnivores'),
    )
    assert evoked == []
    session.rollback()
    session.close()


def test_shared_facet_evokes_as_a_weaker_contact():
    """ADR-0016: 'tag:form:attacks' meeting 'tag:form:confronts' is the
    same kind of contact — the facet carries a weaker link than an
    exact tag but still counts as touching today."""
    session, char = _session_with_memories({
        'desc': 'the warg leapt at them by the marsh',
        'tags': ['tag:form:attacks'],
        'importance': 0.8, 'strength': 0.6, 'created_episode': 9,
    })
    evoked = retrieve(
        session, _brain(char), _episode(10),
        _day('tag:form:confronts'),
    )
    assert [m.desc for m in evoked] == ['the warg leapt at them by the marsh']
    session.rollback()
    session.close()


def test_single_segment_tags_share_no_facet():
    """'entity:orcs' and 'entity:wolves' are different beings — 'some
    entity' is too broad to count as contact (ADR-0016)."""
    session, char = _session_with_memories({
        'desc': 'an orc patrol crossed the road east',
        'tags': ['entity:orcs'],
        'importance': 0.8, 'strength': 0.6, 'created_episode': 6,
    })
    evoked = retrieve(
        session, _brain(char), _episode(10),
        _day('entity:wolves'),
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
    """Weather and vitals are ambience — the recurrence channel owns
    their repetition. All-ambient tags means no door at all, not even
    the semantic one — past the fresh window, that is: inside it, the
    storm of yesterday speaks on recency alone (C2). (Food/drink became
    subjects under ADR 0017 — the bread's memory may evoke now; the
    rain's may not.)"""
    session, char = _session_with_memories(
        {   # a wet day on a wet day — same sky is not a story
            'desc': 'cool, partly cloudy, a passing shower',
            'tags': ['type:climate', 'tag:weather:wet', 'region:X'],
            'importance': 0.8, 'strength': 0.6, 'created_episode': 6,
        },
        {   # vitals are the body's channel
            'desc': 'a body', 'tags': ['type:body'],
            'importance': 0.8, 'strength': 0.6, 'created_episode': 6,
        },
    )
    evoked = retrieve(
        session, _brain(char), _episode(10),
        _day('tag:weather:wet', 'type:meal',
             reading='cool, partly cloudy, a passing shower'),
    )
    assert evoked == []
    session.rollback()
    session.close()


def test_a_meal_memory_can_evoke_on_food():
    """Food is a subject now — the road-bread IS a thing you can think
    about, not mere ambience. Today's bread may stir yesterday's."""
    desc = 'a ration of road-bread and dried fruit, water from the skin'
    session, char = _session_with_memories({
        'desc': desc,
        'tags': ['type:meal', 'tag:food:road-bread',
                 'tag:drink:waterskin', 'region:South Arthedain'],
        'importance': 0.8, 'strength': 0.6, 'created_episode': 9,
    })
    evoked = retrieve(
        session, _brain(char), _episode(10),
        _day('tag:food:road-bread', 'type:meal', reading=desc),
    )
    assert len(evoked) == 1
    session.rollback()
    session.close()


def test_unwordable_items_never_encode():
    """Items without a reading or subject resolve no impression by
    design — without words there is no memory to write."""
    from app.mind.memory import encode_episode
    session = SessionLocal()
    char = f'c20-{uuid.uuid4().hex[:8]}'
    episode = SimpleNamespace(
        id=f'ep-{uuid.uuid4().hex[:8]}', game_id=GAME, character_id=char,
        events=[{'when': {}}],
        perceived_day=[
            {'type': 'condition', 'salience': 0.5, 'perception': 'noticed',
             'data': {'energy': 40, 'shadow': 30}, 'tags': ['type:condition']},
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
        # Only a region in common with today: the entity tag shares no
        # coarse facet either (single-segment tags have none, ADR-0016).
        'tags': ['type:encounter', 'entity:dunedain_3', 'region:Rast Vorn'],
        'importance': 0.8, 'strength': 0.6, 'created_episode': 6,
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
    assert _age_phrase(None, 2) == '(a memory, 2 days ago) '
    assert _age_phrase(None, 1) == '(a memory, yesterday) '
    assert _age_phrase(None, 18) == '(a memory, a long while ago) '
    # A memory that cannot be dated is still marked — never bare.
    assert _age_phrase(None, None) == '(a memory) '
    assert _age_phrase(None, 0) == '(a memory) '


def test_lens_says_why_the_memory_woke():
    """The via is the narrator's thread: 'another land crossed into' —
    the rhyme between the memory and the moment that stirred it."""
    assert _age_phrase(None, 4, 'tag:region_entered') == (
        '(a memory, 4 days ago — another land crossed into) ')
    assert _age_phrase(None, 2, 'entity:orc_trackers') == (
        '(a memory, 2 days ago — the same Orc Trackers) ')
    assert _age_phrase(None, 2, 'tag:entity_type:orcs') == (
        '(a memory, 2 days ago — the same orcs) ')
    assert _age_phrase(None, 1, 'place:talath_muil') == (
        '(a memory, yesterday — Talath Muil again) ')
    assert _age_phrase(None, 3, 'facet:tag:food') == (
        '(a memory, 3 days ago — something of the same kind) ')
    # No shared tag: the age still stands on its own.
    assert _age_phrase(None, 3, None) == '(a memory, 3 days ago) '
    brief = {'focus': None, 'day': [], 'carried': [
        {'kind': 'memory', 'text': 'the warg attack',
         'age': '(a memory, a long while ago) '},
    ]}
    carried = brief_beats(brief, {}, None)['carried']
    # The Lens does not list it — the marked line rides the 'carried'
    # channel to whatever event the day touches it at.
    assert '(a memory, a long while ago) the warg attack' in \
        carried[0]['line']


def test_the_felt_it_landed_encodes_with_the_memory():
    """How it felt through the personality is part of what a memory IS —
    word, refracted target and gain all travel, beside the world's
    suggestion (imprint stays the objective channel)."""
    from app.mind.memory import encode_episode
    session = SessionLocal()
    char = f'c20-{uuid.uuid4().hex[:8]}'
    episode = SimpleNamespace(
        id=f'ep-{uuid.uuid4().hex[:8]}', game_id=GAME, character_id=char,
        events=[{'when': {}}],
        perceived_day=[{
            'type': 'encounter', 'salience': 0.6, 'perception': 'noticed',
            'reading': 'Losrandír — the herd was driven',
            'tags': ['type:encounter', 'entity:losrandir'],
            'imprint': {'fear': 0.3},
            'mood_pull': [{'word': 'watchful', 'gain': 0.4,
                           'target': {'valence': -0.4, 'arousal': 0.6,
                                      'dominance': 0.1}}],
        }],
    )
    encode_episode(session, SimpleNamespace(wiring=None), episode)
    session.flush()
    mem = session.query(Memory).filter_by(
        game_id=GAME, character_id=char).one()
    assert mem.felt[0]['word'] == 'watchful'
    assert mem.felt[0]['target']['valence'] == -0.4
    assert mem.imprint == {'fear': 0.3}
    session.rollback()
    session.close()


def test_between_connected_memories_the_felt_rhyme_ranks_first():
    """Of the memories that touch today, the one that FELT like it
    leads — the more the mind keeps, the more felt proximity decides
    which of the connected is the right one."""
    day = _day('entity:wolves')
    day[0]['mood_pull'] = [{'word': 'afraid', 'gain': 0.6,
                            'target': {'valence': -0.8, 'arousal': 0.7,
                                       'dominance': -0.3}}]
    session, char = _session_with_memories(
        {'desc': 'wolves circling the camp in the dark',
         'tags': ['entity:wolves'], 'importance': 0.5, 'strength': 0.5,
         'created_episode': 5,
         'felt': [{'word': 'afraid', 'gain': 0.5,
                   'target': {'valence': -0.8, 'arousal': 0.7,
                              'dominance': -0.3}}]},
        {'desc': 'wolves spotted at noon, unbothered',
         'tags': ['entity:wolves'], 'importance': 0.5, 'strength': 0.5,
         'created_episode': 5,
         'felt': [{'word': 'content', 'gain': 0.3,
                   'target': {'valence': 0.8, 'arousal': -0.4,
                              'dominance': 0.3}}]},
    )
    evoked = retrieve(session, _brain(char), _episode(10), day)
    assert evoked[0].desc == 'wolves circling the camp in the dark'
    session.rollback()
    session.close()


def test_felt_proximity_never_opens_the_gate():
    """A memory that rhymes emotionally but shares nothing with today
    stays quiet — felt discriminates among the connected; it is not a
    reason of its own."""
    day = _day('entity:foxes')
    day[0]['mood_pull'] = [{'word': 'afraid', 'gain': 0.6,
                            'target': {'valence': -0.8, 'arousal': 0.7,
                                       'dominance': -0.3}}]
    session, char = _session_with_memories({
        'desc': 'a warm meal at the inn, fire and ale',
        'tags': ['tag:food:ale', 'entity:the_inn'],
        'importance': 0.8, 'strength': 0.6, 'created_episode': 5,
        'felt': [{'word': 'afraid', 'gain': 0.5,
                  'target': {'valence': -0.8, 'arousal': 0.7,
                             'dominance': -0.3}}],
    })
    evoked = retrieve(session, _brain(char), _episode(10), day)
    assert evoked == []
    session.rollback()
    session.close()


def test_the_evoked_line_carries_how_the_memory_felt():
    """The fact alone is a dossier — the narrator needs the charge too:
    the pull that actually landed rides the line as 'it left them X',
    the same construction the day's felt beats speak."""
    from app.mind.lens import line_text

    line = {
        'kind': 'memory', 'text': 'crossed into Talath Muil',
        'age': '(a memory, 4 days ago — another land crossed into) ',
        'felt': 'afraid',
    }
    assert line_text(line) == (
        '(a memory, 4 days ago — another land crossed into) '
        'crossed into Talath Muil — it left them afraid')

    # Legacy 'tense' stored on old pulls still reads 'afraid'.
    from app.mind.focus import _memory_felt_word
    assert _memory_felt_word(
        [{'word': 'tense', 'target': {}, 'gain': 0.4}]) == 'afraid'

    # The landed target outranks the authored word: a pull the world
    # suggested 'afraid' but this personality refracted toward the
    # alert sector narrates what was felt — 'watchful'.
    assert _memory_felt_word([{
        'word': 'afraid',
        'target': {'valence': 0.1, 'arousal': 0.34, 'dominance': 0.1},
        'gain': 0.4,
    }]) == 'watchful'

    # A memory with no felt says nothing extra.
    assert line_text({'kind': 'memory', 'text': 'a meal', 'age': ''}) == 'a meal'
