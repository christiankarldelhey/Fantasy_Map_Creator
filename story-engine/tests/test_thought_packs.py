# ============================================================================
# Thought packs — authored personality as seed beliefs
# ----------------------------------------------------------------------------
# Each thought is a belief (thought_packs.py): it clones with the mold
# (origin='seed'), speaks through the Lens when the day's own tags put it
# at stake, and — for the thoughts a person keeps for themselves — when
# nobody touched the mind at all ('context:solitude'). Seeds are nature:
# reflection may reinforce or contradict them deliberately but never
# decays or caps them out of neglect.
# ============================================================================
import uuid
from types import SimpleNamespace

import pytest

from app.db import SessionLocal
from app.mind.focus import _ENGINE_FRAME_TYPES, build_brief
from app.mind.nl_defaults import DEFAULT_PHRASE_LISTS
from app.mind.provisioning import get_or_create_brain
from app.mind.reflection import _apply_ops, reflection_beliefs
from app.mind.retrieval import _CONTACT_AMBIENT_PREFIXES, _context_tags
from app.mind.tables import Belief, BrainMold, Episode, MoldStarterBelief
from app.mind.thought_packs import (
    ARANATH_THOUGHTS, CELEBRIAN_THOUGHTS, LEGACY_REWRITES,
)


def _event(reading, salience, phase=None, tags=(), type_='encounter',
           perception='noticed'):
    return {
        'type': type_, 'reading': reading, 'salience': salience,
        'when': {'phase': phase} if phase else {}, 'tags': list(tags),
        'perception': perception,
    }


def _belief(statement, tags=(), confidence=0.6, id_='b1'):
    return SimpleNamespace(id=id_, statement=statement, tags=list(tags),
                           confidence=confidence)


QUIET = [_event('open moor under a grey sky', 0.3, 'morning', type_='travel'),
         _event('cold drizzle', 0.2, 'afternoon', type_='climate')]
FRIEND = [_event(
    'a trader shares her fire and news of the road', 0.6, 'night',
    ['type:encounter', 'entity:trader_ana', 'tag:entity_type:humans',
     'tag:form:brief_exchange'],
)]
ORC_SIGN = [_event(
    'orc boots, wide-spaced, a pursuit gait', 0.7, 'afternoon',
    ['type:encounter', 'entity:orc_trackers', 'tag:entity_type:orcs',
     'tag:form:sign_only'],
)]


def _belief_lines(brief):
    return [
        l for c in (brief['carried'], *(brief['day'].values() if isinstance(
            brief['day'], dict) else [brief['day']]))
        for l in (c if isinstance(c, list) else [c])
        if isinstance(l, dict) and l.get('kind') == 'belief'
    ]


def _all_lines(brief):
    out = list(brief['carried'])
    day = brief['day']
    if isinstance(day, dict):
        for ls in day.values():
            out.extend(ls)
    else:
        out.extend(day)
    return out


def _texts(brief):
    return [l['text'] for l in _all_lines(brief)]


# --- the pack itself ---------------------------------------------------------

def test_packs_are_well_formed():
    for pack in (CELEBRIAN_THOUGHTS, ARANATH_THOUGHTS):
        statements = [t['statement'] for t in pack]
        assert len(statements) == len(set(statements))
        for t in pack:
            assert t['kind'] in ('world', 'self', 'other')
            assert t['tags'], t['statement']
            assert 0 < t['confidence'] <= 1


def test_celebrian_speaks_of_orcs_as_a_person():
    orc_thoughts = [
        t for t in CELEBRIAN_THOUGHTS
        if 'tag:entity_type:orcs' in t['tags']
    ]
    assert len(orc_thoughts) >= 2
    # Her orc-trauma sharpens what stands out — the pack wires the boost.
    assert any(
        (t['boosts'] or {}).get('tag:entity_type:orcs', 0) > 0
        for t in orc_thoughts
    )


# --- evocation: when each thought speaks ------------------------------------

def test_solitude_thoughts_speak_on_a_day_nobody_touched():
    thought = _belief(
        'Night knows me better than any face I have ever loved.',
        tags=['context:solitude'],
    )
    brief = build_brief(QUIET, [], [thought], [], {}, episode_idx=1)
    assert thought.statement in _texts(brief)
    line = next(l for l in _all_lines(brief) if l['kind'] == 'belief')
    assert line['part'] == 'carried'
    assert line['why'] == 'the mind alone with itself'


def test_solitude_thoughts_stay_quiet_when_the_day_had_company():
    thought = _belief('x', tags=['context:solitude'])
    brief = build_brief(FRIEND, [], [thought], [], {}, episode_idx=1)
    assert 'x' not in _texts(brief)
    assert brief['silenced'][0]['reason'] == 'the day had company'


def test_social_thoughts_touch_on_friendly_contact():
    thought = _belief(
        'They speak of tomorrow as if it were a promise.',
        tags=['tag:form:brief_exchange'],
    )
    brief = build_brief(FRIEND, [], [thought], [], {}, episode_idx=1)
    assert thought.statement in _texts(brief)


def test_orc_thoughts_touch_on_orc_sign_not_on_quiet_days():
    thought = _belief(
        'When the signs of orcs appear, an old part of me stops counting '
        'years and starts counting arrows.',
        tags=['tag:entity_type:orcs'],
    )
    brief = build_brief(ORC_SIGN, [], [thought], [], {}, episode_idx=1)
    assert thought.statement in _texts(brief)
    brief = build_brief(QUIET, [], [thought], [], {}, episode_idx=1)
    assert thought.statement not in _texts(brief)


def test_equal_thoughts_rotate_by_episode():
    thoughts = [
        _belief(f'thought {i}', tags=['context:solitude'], id_=f'b{i}')
        for i in range(8)
    ]
    picks = []
    for idx in range(4):
        brief = build_brief(
            QUIET, [], thoughts, [], {}, episode_idx=idx
        )
        picks.append(tuple(
            l['text'] for l in _all_lines(brief) if l['kind'] == 'belief'
        ))
    # Same quiet day, different episodes: the voice that answers changes.
    assert len(set(picks)) > 1
    # Deterministic: same episode, same answer.
    assert tuple(
        l['text'] for l in _all_lines(
            build_brief(QUIET, [], thoughts, [], {}, episode_idx=0)
        ) if l['kind'] == 'belief'
    ) == picks[0]


# --- cloning: the pack becomes the person ------------------------------------

def test_pack_seed_beliefs_clone_with_the_mold():
    session = SessionLocal()
    game_id = 'middle_earth'
    slug = f'celebrian-clone-{uuid.uuid4().hex[:8]}'
    mold = BrainMold(game_id=game_id, slug=slug, name='Celebrian test')
    session.add(mold)
    session.flush()
    for t in CELEBRIAN_THOUGHTS:
        session.add(MoldStarterBelief(
            mold_id=mold.id, kind=t['kind'], statement=t['statement'],
            confidence=t['confidence'], tags=t['tags'], boosts=t['boosts'],
        ))
    session.flush()

    brain = get_or_create_brain(
        session, game_id, f'cel-{uuid.uuid4().hex[:8]}', slug
    )
    session.flush()
    seeds = (
        session.query(Belief)
        .filter_by(character_id=brain.character_id, origin='seed')
        .all()
    )
    assert len(seeds) == len(CELEBRIAN_THOUGHTS)
    by_statement = {b.statement: b for b in seeds}
    thought = next(
        t for t in CELEBRIAN_THOUGHTS
        if (t['boosts'] or {}).get('tag:entity_type:orcs')
    )
    clone = by_statement[thought['statement']]
    assert clone.boosts['tag:entity_type:orcs'] == pytest.approx(0.3)
    session.rollback()
    session.close()


# --- seeds are nature: reflection can't fade or crowd them out ---------------

def test_reflection_decay_and_cap_leave_seeds_alone():
    session = SessionLocal()
    brain = get_or_create_brain(
        session, 'middle_earth', f'refl-{uuid.uuid4().hex[:8]}', None
    )
    seeds = []
    for i in range(5):
        b = Belief(
            game_id='middle_earth', character_id=brain.character_id,
            kind='self', statement=f'seed thought {i}', confidence=0.6,
            tags=[], boosts={}, evidence=[], origin='seed', status='active',
        )
        session.add(b)
        seeds.append(b)
    acquired = []
    for i in range(20):
        b = Belief(
            game_id='middle_earth', character_id=brain.character_id,
            kind='self', statement=f'acquired belief {i}', confidence=0.5,
            tags=[], boosts={}, evidence=[], origin='reflected',
            status='active',
        )
        session.add(b)
        acquired.append(b)
    session.flush()

    beliefs_by_id = {b.id: b for b in seeds + acquired}
    # A reflection that touched nothing: everything acquired decays and
    # the cap thins the crowd; the seeds must be exactly as they were.
    _apply_ops(
        session, brain, [], beliefs_by_id, idx=1,
        w={'belief_confidence_decay': 0.9, 'belief_cap': 8,
           'belief_weaken_below': 0.2},
    )
    for b in seeds:
        assert b.status == 'active'
        assert b.confidence == pytest.approx(0.6)
    weakened = [b for b in acquired if b.status == 'weakened']
    assert len(weakened) >= len(acquired) - 8
    session.rollback()
    session.close()


# --- the auditor: every thought in the pack must be able to speak -----------

FRAME_TYPES = _ENGINE_FRAME_TYPES | set(
    DEFAULT_PHRASE_LISTS['mind.focus_excluded']
)
AMBIENT = tuple(p for p in _CONTACT_AMBIENT_PREFIXES if p != 'type:')
ALL_THOUGHTS = [
    pytest.param(t, id=f"{who}:{t['statement'][:40]}")
    for who, pack in (('celebrian', CELEBRIAN_THOUGHTS),
                      ('aranath', ARANATH_THOUGHTS))
    for t in pack
] + [
    pytest.param({'statement': new, 'tags': tags}, id=f'{who}:0014:{new[:30]}')
    for who, rewrites in LEGACY_REWRITES.items()
    for _old, new, _old_tags, tags in rewrites
]


def _day_for(tag):
    """The smallest day that carries `tag` the way the host would."""
    if tag == 'context:solitude':
        return QUIET
    if tag.startswith('type:'):
        return [_event('a moment of that kind', 0.9, 'night',
                       type_=tag.split(':', 1)[1])]
    return [_event('something happens', 0.9, 'afternoon',
                   ['type:encounter', tag])]


@pytest.mark.parametrize('thought', ALL_THOUGHTS)
def test_every_tag_is_one_the_lens_can_see(thought):
    """A tag the Lens never compares is a silent bug: the thought looks
    wired in Studio and never speaks. Frame types never reach the Lens
    as events; ambient prefixes are stripped before contact."""
    for tag in thought['tags']:
        assert not tag.startswith(AMBIENT), tag
        if tag.startswith('type:'):
            assert tag.split(':', 1)[1] not in FRAME_TYPES, tag
        assert tag == 'context:solitude' or tag.startswith(
            ('tag:', 'entity:', 'type:')
        ), tag


@pytest.mark.parametrize('thought', ALL_THOUGHTS)
def test_every_tag_actually_evokes_its_thought(thought):
    """Behavioural audit: for each of its tags, a day carrying that tag
    makes the thought speak. Catches whatever filter comes next."""
    b = _belief(thought['statement'], tags=thought['tags'])
    for tag in thought['tags']:
        brief = build_brief(_day_for(tag), [], [b], [], {}, episode_idx=0)
        assert b.statement in _texts(brief), tag


# --- fix A: beliefs answer to the kind of moment -----------------------------

def test_a_campfire_thought_speaks_on_a_night_of_rest():
    fire = _belief(
        'The small fire of a campfire is worth more than a thousand '
        'torches lit out of fear.', tags=['type:rest'],
    )
    night = [_event('they make camp under the beeches', 0.6, 'night',
                    ['type:rest', 'tag:rest_quality:fair'], type_='rest')]
    brief = build_brief(night, [], [fire], [], {}, episode_idx=0)
    assert fire.statement in _texts(brief)


def test_memories_still_ignore_the_kind_of_moment():
    """The kind of moment opens beliefs only — the brief never leaks
    touch_tags, and events keep content-only tags."""
    night = [_event('camp', 0.6, 'night', ['type:rest'], type_='rest')]
    brief = build_brief(night, [], [], [], {}, episode_idx=0)
    assert 'touch_tags' not in (brief['focus'] or {})
    assert all('touch_tags' not in c for c in brief['candidates'])


# --- fix C: alone with a striking sight is still alone -----------------------

def test_solitude_speaks_beside_a_focus_when_nobody_was_there():
    thought = _belief('Solitude is not emptiness.', tags=['context:solitude'])
    ruin = [_event('the broken towers of Amon Sûl against the dusk', 0.8,
                   'afternoon', ['type:place', 'tag:ruin'], type_='place')]
    brief = build_brief(ruin, [], [thought], [], {}, episode_idx=0)
    assert brief['focus'] is not None
    assert thought.statement in _texts(brief)


# --- part 3: retrieval context holds only the beliefs the day activated ------

def test_retrieval_context_takes_only_activated_beliefs():
    day = [{'tags': ['type:encounter', 'tag:entity_type:orcs']}]
    orcs = _belief('orcs', tags=['tag:entity_type:orcs', 'tag:form:attacks'])
    elves = _belief('elves', tags=['tag:entity_type:elves'])
    ctx = _context_tags(day, [orcs, elves])
    assert 'tag:form:attacks' in ctx         # activated: its tags join
    assert 'tag:entity_type:elves' not in ctx  # untouched: stays out


# --- part 2: a reflection sees the seeds the evidence bears on ---------------

def _seed(session, char, statement, tags, origin='seed', horizon='enduring'):
    b = Belief(
        game_id='middle_earth', character_id=char, kind='self',
        statement=statement, confidence=0.6, tags=tags, boosts={},
        evidence=[], origin=origin, status='active', horizon=horizon,
    )
    session.add(b)
    return b


def test_reflection_sees_touched_voiced_and_learned_beliefs_only():
    session = SessionLocal()
    brain = get_or_create_brain(
        session, 'middle_earth', f'rb-{uuid.uuid4().hex[:8]}', None
    )
    char = brain.character_id
    orc = _seed(session, char, 'The watch never sleeps.',
                ['tag:entity_type:orcs'])
    lonely = _seed(session, char, 'Quiet thought one.', ['context:solitude'])
    voiced = _seed(session, char, 'Quiet thought two.', ['context:solitude'])
    learned = _seed(session, char, 'This ford is watched.', [],
                    origin='reflected')
    passing = _seed(session, char, 'The inn is full tonight.', [],
                    horizon='transient')
    session.flush()
    session.add(Episode(
        game_id='middle_earth', character_id=char, episode_idx=3,
        brief={'focus': None, 'carried': [{'id': f'belief:{voiced.id}'}],
               'day': []},
    ))
    session.flush()
    memories = [SimpleNamespace(
        tags=['type:encounter', 'tag:entity_type:orcs'],
        desc='orc boots in the mud by the ford',
    )]

    shown = reflection_beliefs(session, brain, memories, 0, {})
    ids = {b.id for b in shown}
    assert {orc.id, voiced.id, learned.id, passing.id} <= ids
    assert lonely.id not in ids  # nothing lived puts it in question
    session.rollback()
    session.close()


def test_reflection_seed_cap_keeps_the_most_touched():
    session = SessionLocal()
    brain = get_or_create_brain(
        session, 'middle_earth', f'rc-{uuid.uuid4().hex[:8]}', None
    )
    weak = [_seed(session, brain.character_id, f'orc thought {i}',
                  ['tag:entity_type:orcs']) for i in range(30)]
    strong = _seed(session, brain.character_id, 'orc and wound',
                   ['tag:entity_type:orcs', 'tag:outcome:wounded'])
    session.flush()
    memories = [
        SimpleNamespace(tags=['tag:entity_type:orcs'], desc='x'),
        SimpleNamespace(tags=['tag:outcome:wounded'], desc='y'),
    ]
    shown = reflection_beliefs(
        session, brain, memories, 0, {'reflection_seed_cap': 10}
    )
    assert len(shown) == 10
    assert shown[0].id == strong.id  # touches two memories, ranks first
    assert len(weak) == 30
    session.rollback()
    session.close()


# --- after the live run: quiet days, word luck, specificity, voice ---------

def test_a_quiet_day_still_hears_the_campfire():
    """Live run, day 5: a rest at salience 0.19 is no Focus candidate,
    yet the thought about the campfire is exactly about it."""
    fire = _belief('The small fire of a campfire…', tags=['type:rest'],
                   id_='fire')
    alone = _belief('Solitude is not emptiness.', tags=['context:solitude'],
                    id_='alone')
    day = QUIET + [_event('a small fire under old beeches', 0.19, 'night',
                          ['type:rest'], type_='rest')]
    brief = build_brief(day, [], [fire, alone], [], {}, episode_idx=0)
    assert brief['focus'] is None
    score = {l['text']: l['score'] for l in _all_lines(brief)}
    assert fire.statement in score
    # What the day touched outranks free-floating thought.
    assert score[fire.statement] > score[alone.statement]


def test_tagged_thoughts_do_not_match_by_word_luck():
    """Live run, day 2: 'space' met 'wide-spaced'. A tagged belief now
    touches by tag only; untagged ones keep the word door."""
    poem = _belief('Solitude is not emptiness; it is space to remember.',
                   tags=['tag:entity_type:elves'], id_='poem')
    plain = _belief('Wide tracks mean many feet.', id_='plain')
    tracks = [_event('orc boots in the mud, wide-spaced', 0.7, 'afternoon',
                     ['type:encounter', 'tag:entity_type:orcs'])]
    brief = build_brief(tracks, [], [poem, plain], [], {}, episode_idx=0)
    texts = _texts(brief)
    assert poem.statement not in texts
    assert plain.statement in texts


def test_the_more_specific_thought_wins():
    """Live run, day 2: orcs AND signs beats orcs alone or signs alone,
    whatever the rotation says."""
    tracks = [_event('orc boots in the mud', 0.7, 'afternoon',
                     ['type:encounter', 'tag:entity_type:orcs',
                      'tag:form:sign_only'])]
    generic = [
        _belief(f'about orcs {i}', tags=['tag:entity_type:orcs'],
                id_=f'g{i}')
        for i in range(5)
    ]
    specific = _belief('orcs and their signs',
                       tags=['tag:entity_type:orcs', 'tag:form:sign_only'],
                       id_='s')
    for idx in range(6):
        brief = build_brief(tracks, [], generic + [specific], [], {},
                            episode_idx=idx)
        assert specific.statement in _texts(brief), idx


def test_every_seed_speaks_in_the_first_person():
    """Live run, day 4: 'She trusts growing things…' broke the voice."""
    import re
    third = re.compile(r'^(She|He)\b')
    for pack in (CELEBRIAN_THOUGHTS, ARANATH_THOUGHTS):
        for t in pack:
            assert not third.match(t['statement']), t['statement']
    for rewrites in LEGACY_REWRITES.values():
        for _old, new, _o, _n in rewrites:
            assert not third.match(new), new
