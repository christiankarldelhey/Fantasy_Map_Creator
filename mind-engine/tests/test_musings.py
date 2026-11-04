# ============================================================================
# Musings — the authored inner voice, beside (not inside) the beliefs
# ----------------------------------------------------------------------------
# A Musing (CONTEXT.md · Musing) is a line of inner voice: it clones with
# the preset (origin='seed'), speaks through the Lens when the day's own
# tags call it up — including 'context:solitude' when nobody touched the
# mind — and carries nothing a life could move: no strength, no status,
# no facets, and Reflection never sees it.
#
# Attitudes (ATTITUDE_PACKS) stay what they always were: faceted Beliefs
# with Subject + Stance, tested here under the belief rules.
# ============================================================================
import uuid
from types import SimpleNamespace

import pytest

from app.db import SessionLocal
from app.mind.focus import _ENGINE_FRAME_TYPES, build_brief
from app.mind.voice import PHRASES
from app.mind.provisioning import get_or_create_mind
from app.mind.reflection import _apply_ops, reflection_beliefs
from app.mind.retrieval import _CONTACT_AMBIENT_PREFIXES, _context_tags
from app.mind.tables import (
    Belief, MindPreset, Episode, PresetMusing, PresetStarterBelief, Musing,
)
from app.mind.musings import (
    ARANATH_MUSINGS, ATTITUDE_PACKS, CELEBRIAN_MUSINGS, LEGACY_REWRITES,
)


def _event(reading, salience, phase=None, tags=(), type_='encounter',
           perception='noticed'):
    return {
        'type': type_, 'reading': reading, 'salience': salience,
        'when': {'phase': phase} if phase else {}, 'tags': list(tags),
        'perception': perception,
    }


def _belief(statement, tags=(), strength=3, id_='b1'):
    return SimpleNamespace(id=id_, statement=statement, tags=list(tags),
                           strength=strength)


def _musing(statement, tags=(), id_='m1'):
    return SimpleNamespace(id=id_, statement=statement, tags=list(tags))


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


def _lines_of(brief, kind):
    return [
        l for c in (brief['carried'], *(brief['day'].values() if isinstance(
            brief['day'], dict) else [brief['day']]))
        for l in (c if isinstance(c, list) else [c])
        if isinstance(l, dict) and l.get('kind') == kind
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
    for pack in (CELEBRIAN_MUSINGS, ARANATH_MUSINGS):
        statements = [m['statement'] for m in pack]
        assert len(statements) == len(set(statements))
        for m in pack:
            # Voice only: statement + the tags that call it up. Anything
            # more — strength, kind, boosts — would make it a belief.
            assert set(m.keys()) == {'statement', 'tags'}
            assert m['tags'], m['statement']


def test_celebrian_speaks_of_orcs_as_a_person():
    orc_musings = [
        m for m in CELEBRIAN_MUSINGS
        if 'tag:entity_type:orcs' in m['tags']
    ]
    assert len(orc_musings) >= 2


# --- evocation: when each musing speaks --------------------------------------

def test_solitude_musings_speak_on_a_day_nobody_touched():
    musing = _musing(
        'Night knows me better than any face I have ever loved.',
        tags=['context:solitude'],
    )
    brief = build_brief(QUIET, [], [], [], {}, episode_idx=1,
                        musings=[musing])
    assert musing.statement in _texts(brief)
    line = next(l for l in _all_lines(brief) if l['kind'] == 'musing')
    assert line['part'] == 'carried'
    assert line['why'] == 'the mind alone with itself'


def test_solitude_musings_stay_quiet_when_the_day_had_company():
    musing = _musing('x', tags=['context:solitude'])
    brief = build_brief(FRIEND, [], [], [], {}, episode_idx=1,
                        musings=[musing])
    assert 'x' not in _texts(brief)
    assert brief['silenced'][0]['kind'] == 'musing'
    assert brief['silenced'][0]['reason'] == 'the day had company'


def test_social_musings_touch_on_friendly_contact():
    musing = _musing(
        'They speak of tomorrow as if it were a promise.',
        tags=['tag:form:brief_exchange'],
    )
    brief = build_brief(FRIEND, [], [], [], {}, episode_idx=1,
                        musings=[musing])
    assert musing.statement in _texts(brief)


def test_orc_musings_touch_on_orc_sign_not_on_quiet_days():
    musing = _musing(
        'When the signs of orcs appear, an old part of me stops counting '
        'years and starts counting arrows.',
        tags=['tag:entity_type:orcs'],
    )
    brief = build_brief(ORC_SIGN, [], [], [], {}, episode_idx=1,
                        musings=[musing])
    assert musing.statement in _texts(brief)
    brief = build_brief(QUIET, [], [], [], {}, episode_idx=1,
                        musings=[musing])
    assert musing.statement not in _texts(brief)


def test_equal_musings_rotate_by_episode():
    musings = [
        _musing(f'musing {i}', tags=['context:solitude'], id_=f'm{i}')
        for i in range(8)
    ]
    picks = []
    for idx in range(4):
        brief = build_brief(
            QUIET, [], [], [], {}, episode_idx=idx, musings=musings
        )
        picks.append(tuple(
            l['text'] for l in _all_lines(brief) if l['kind'] == 'musing'
        ))
    # Same quiet day, different episodes: the voice that answers changes.
    assert len(set(picks)) > 1
    # Deterministic: same episode, same answer.
    assert tuple(
        l['text'] for l in _all_lines(
            build_brief(QUIET, [], [], [], {}, episode_idx=0,
                        musings=musings)
        ) if l['kind'] == 'musing'
    ) == picks[0]


# --- cloning: the pack becomes the person ------------------------------------

def test_pack_musings_clone_with_the_mold():
    session = SessionLocal()
    game_id = 'middle_earth'
    slug = f'celebrian-clone-{uuid.uuid4().hex[:8]}'
    preset = MindPreset(game_id=game_id, slug=slug, name='Celebrian test')
    session.add(preset)
    session.flush()
    for m in CELEBRIAN_MUSINGS:
        session.add(PresetMusing(
            preset_id=preset.id, statement=m['statement'], tags=m['tags'],
        ))
    session.flush()

    mind = get_or_create_mind(
        session, game_id, f'cel-{uuid.uuid4().hex[:8]}', slug
    )
    session.flush()
    musings = (
        session.query(Musing)
        .filter_by(character_id=mind.character_id, origin='seed')
        .all()
    )
    assert len(musings) == len(CELEBRIAN_MUSINGS)
    # …and none of them leaked into the beliefs.
    beliefs = (
        session.query(Belief)
        .filter_by(character_id=mind.character_id)
        .all()
    )
    assert beliefs == []
    session.rollback()
    session.close()


def test_reset_reseeds_musings_and_leaves_beliefs_alone():
    session = SessionLocal()
    game_id = 'middle_earth'
    slug = f'musing-reset-{uuid.uuid4().hex[:8]}'
    preset = MindPreset(game_id=game_id, slug=slug, name='reset test')
    session.add(preset)
    session.flush()
    session.add(PresetMusing(
        preset_id=preset.id, statement='a voice that returns', tags=['x'],
    ))
    session.add(PresetStarterBelief(
        preset_id=preset.id, kind='other', statement='a stance that returns',
        strength=3, tags=[], subject=['tag:entity_type:orcs'],
        stance=-0.5, source='lived',
    ))
    session.flush()
    mind = get_or_create_mind(
        session, game_id, f'rst-{uuid.uuid4().hex[:8]}', slug
    )
    session.flush()
    kinds = {
        type(r).__name__ for r in session.query(Musing).filter_by(
            character_id=mind.character_id).all()
    } | {
        type(r).__name__ for r in session.query(Belief).filter_by(
            character_id=mind.character_id).all()
    }
    assert kinds == {'Musing', 'Belief'}
    session.rollback()
    session.close()


# --- what a musing is NOT ----------------------------------------------------

def test_a_musing_carries_nothing_a_life_could_move():
    """The columns are the contract: no strength, no status, no
    evidence, no facets — nothing Reflection could touch."""
    m = Musing(
        game_id='g', character_id='c', statement='x', tags=[],
    )
    for absent in ('strength', 'status', 'evidence', 'subject',
                   'stance', 'source', 'boosts', 'pull', 'habit',
                   'horizon', 'updated_episode'):
        assert not hasattr(m, absent), absent


def test_reflection_never_sees_a_musing():
    session = SessionLocal()
    mind = get_or_create_mind(
        session, 'middle_earth', f'rm-{uuid.uuid4().hex[:8]}', None
    )
    char = mind.character_id
    session.add(Musing(
        game_id='middle_earth', character_id=char,
        statement='Orcs ruin everything they touch.',
        tags=['tag:entity_type:orcs'], origin='seed',
    ))
    belief = Belief(
        game_id='middle_earth', character_id=char, kind='self',
        statement='The watch never sleeps.', strength=3,
        tags=['tag:entity_type:orcs'], boosts={}, evidence=[],
        origin='seed', status='active', horizon='enduring',
    )
    session.add(belief)
    session.flush()
    memories = [SimpleNamespace(
        tags=['tag:entity_type:orcs'], desc='orc boots in the mud',
    )]

    shown = reflection_beliefs(session, mind, memories, 0, {})
    assert [b.id for b in shown] == [belief.id]
    session.rollback()
    session.close()


# --- seeds are nature: reflection can't fade or crowd them out ---------------

def test_reflection_decay_and_cap_leave_seeds_alone():
    session = SessionLocal()
    mind = get_or_create_mind(
        session, 'middle_earth', f'refl-{uuid.uuid4().hex[:8]}', None
    )
    seeds = []
    for i in range(5):
        b = Belief(
            game_id='middle_earth', character_id=mind.character_id,
            kind='self', statement=f'seed belief {i}', strength=3,
            tags=['tag:entity_type:orcs'], boosts={}, evidence=[],
            origin='seed', status='active',
            subject=['tag:entity_type:orcs'], stance=-0.4,
        )
        session.add(b)
        seeds.append(b)
    acquired = []
    for i in range(20):
        b = Belief(
            game_id='middle_earth', character_id=mind.character_id,
            kind='self', statement=f'acquired belief {i}', strength=2.5,
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
        session, mind, [], beliefs_by_id, idx=1,
        w={'belief_strength_decay': 0.9, 'belief_cap': 8,
           'belief_weaken_below': 1.0},
    )
    for b in seeds:
        assert b.status == 'active'
        assert b.strength == pytest.approx(3.0)
    weakened = [b for b in acquired if b.status == 'weakened']
    assert len(weakened) >= len(acquired) - 8
    session.rollback()
    session.close()


# --- the auditor: every musing in the pack must be able to speak -------------

FRAME_TYPES = _ENGINE_FRAME_TYPES | set(
    PHRASES['mind.focus_excluded']
)
AMBIENT = tuple(p for p in _CONTACT_AMBIENT_PREFIXES if p != 'type:')
ALL_MUSINGS = [
    pytest.param(m, id=f"{who}:{m['statement'][:40]}")
    for who, pack in (('celebrian', CELEBRIAN_MUSINGS),
                      ('aranath', ARANATH_MUSINGS))
    for m in pack
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


@pytest.mark.parametrize('musing', ALL_MUSINGS)
def test_every_tag_is_one_the_lens_can_see(musing):
    """A tag the Lens never compares is a silent bug: the musing looks
    wired in Studio and never speaks. Frame types never reach the Lens
    as events; ambient prefixes are stripped before contact."""
    for tag in musing['tags']:
        assert not tag.startswith(AMBIENT), tag
        if tag.startswith('type:'):
            assert tag.split(':', 1)[1] not in FRAME_TYPES, tag
        assert tag == 'context:solitude' or tag.startswith(
            ('tag:', 'entity:', 'type:')
        ), tag


@pytest.mark.parametrize('musing', ALL_MUSINGS)
def test_every_tag_actually_evokes_its_musing(musing):
    """Behavioural audit: for each of its tags, a day carrying that tag
    makes the musing speak. Catches whatever filter comes next."""
    m = _musing(musing['statement'], tags=musing['tags'])
    for tag in musing['tags']:
        brief = build_brief(_day_for(tag), [], [], [], {},
                            episode_idx=0, musings=[m])
        assert m.statement in _texts(brief), tag


# --- musings answer to the kind of moment ------------------------------------

def test_a_campfire_musing_speaks_on_a_night_of_rest():
    fire = _musing(
        'The small fire of a campfire is worth more than a thousand '
        'torches lit out of fear.', tags=['type:rest'],
    )
    night = [_event('they make camp under the beeches', 0.6, 'night',
                    ['type:rest', 'tag:rest_quality:fair'], type_='rest')]
    brief = build_brief(night, [], [], [], {}, episode_idx=0,
                        musings=[fire])
    assert fire.statement in _texts(brief)


def test_memories_still_ignore_the_kind_of_moment():
    """The kind of moment opens voice lines only — the brief never leaks
    touch_tags, and events keep content-only tags."""
    night = [_event('camp', 0.6, 'night', ['type:rest'], type_='rest')]
    brief = build_brief(night, [], [], [], {}, episode_idx=0)
    assert 'touch_tags' not in (brief['focus'] or {})
    assert all('touch_tags' not in c for c in brief['candidates'])


# --- fix C: alone with a striking sight is still alone -----------------------

def test_solitude_speaks_beside_a_focus_when_nobody_was_there():
    musing = _musing('Solitude is not emptiness.', tags=['context:solitude'])
    ruin = [_event('the broken towers of Amon Sûl against the dusk', 0.8,
                   'afternoon', ['type:place', 'tag:ruin'], type_='place')]
    brief = build_brief(ruin, [], [], [], {}, episode_idx=0,
                        musings=[musing])
    assert brief['focus'] is not None
    assert musing.statement in _texts(brief)


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
        statement=statement, strength=3, tags=tags, boosts={},
        evidence=[], origin=origin, status='active', horizon=horizon,
    )
    session.add(b)
    return b


def test_reflection_sees_touched_voiced_and_learned_beliefs_only():
    session = SessionLocal()
    mind = get_or_create_mind(
        session, 'middle_earth', f'rb-{uuid.uuid4().hex[:8]}', None
    )
    char = mind.character_id
    orc = _seed(session, char, 'The watch never sleeps.',
                ['tag:entity_type:orcs'])
    lonely = _seed(session, char, 'Quiet belief one.', ['context:solitude'])
    voiced = _seed(session, char, 'Quiet belief two.', ['context:solitude'])
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

    shown = reflection_beliefs(session, mind, memories, 0, {})
    ids = {b.id for b in shown}
    assert {orc.id, voiced.id, learned.id, passing.id} <= ids
    assert lonely.id not in ids  # nothing lived puts it in question
    session.rollback()
    session.close()


def test_reflection_seed_cap_keeps_the_most_touched():
    session = SessionLocal()
    mind = get_or_create_mind(
        session, 'middle_earth', f'rc-{uuid.uuid4().hex[:8]}', None
    )
    weak = [_seed(session, mind.character_id, f'orc belief {i}',
                  ['tag:entity_type:orcs']) for i in range(30)]
    strong = _seed(session, mind.character_id, 'orc and wound',
                   ['tag:entity_type:orcs', 'tag:outcome:wounded'])
    session.flush()
    memories = [
        SimpleNamespace(tags=['tag:entity_type:orcs'], desc='x'),
        SimpleNamespace(tags=['tag:outcome:wounded'], desc='y'),
    ]
    shown = reflection_beliefs(
        session, mind, memories, 0, {'reflection_seed_cap': 10}
    )
    assert len(shown) == 10
    assert shown[0].id == strong.id  # touches two memories, ranks first
    assert len(weak) == 30
    session.rollback()
    session.close()


# --- after the live run: quiet days, word luck, specificity, voice ---------

def test_a_quiet_day_still_hears_the_campfire():
    """Live run, day 5: a rest at salience 0.19 is no Focus candidate,
    yet the musing about the campfire is exactly about it."""
    fire = _musing('The small fire of a campfire…', tags=['type:rest'],
                   id_='fire')
    alone = _musing('Solitude is not emptiness.', tags=['context:solitude'],
                    id_='alone')
    day = QUIET + [_event('a small fire under old beeches', 0.19, 'night',
                          ['type:rest'], type_='rest')]
    brief = build_brief(day, [], [], [], {}, episode_idx=0,
                        musings=[fire, alone])
    assert brief['focus'] is None
    score = {l['text']: l['score'] for l in _all_lines(brief)}
    assert fire.statement in score
    # What the day touched outranks free-floating thought.
    assert score[fire.statement] > score[alone.statement]


def test_tagged_musings_do_not_match_by_word_luck():
    """Live run, day 2: 'space' met 'wide-spaced'. A tagged line now
    touches by tag only; untagged ones keep the word door."""
    poem = _musing('Solitude is not emptiness; it is space to remember.',
                   tags=['tag:entity_type:elves'], id_='poem')
    plain = _musing('Wide tracks mean many feet.', id_='plain')
    tracks = [_event('orc boots in the mud, wide-spaced', 0.7, 'afternoon',
                     ['type:encounter', 'tag:entity_type:orcs'])]
    brief = build_brief(tracks, [], [], [], {}, episode_idx=0,
                        musings=[poem, plain])
    texts = _texts(brief)
    assert poem.statement not in texts
    assert plain.statement in texts


def test_the_more_specific_musing_wins():
    """Live run, day 2: orcs AND signs beats orcs alone or signs alone,
    whatever the rotation says."""
    tracks = [_event('orc boots in the mud', 0.7, 'afternoon',
                     ['type:encounter', 'tag:entity_type:orcs',
                      'tag:form:sign_only'])]
    generic = [
        _musing(f'about orcs {i}', tags=['tag:entity_type:orcs'],
                id_=f'g{i}')
        for i in range(5)
    ]
    specific = _musing('orcs and their signs',
                       tags=['tag:entity_type:orcs', 'tag:form:sign_only'],
                       id_='s')
    for idx in range(6):
        brief = build_brief(tracks, [], [], [], {}, episode_idx=idx,
                            musings=generic + [specific])
        assert specific.statement in _texts(brief), idx


def test_every_musing_speaks_in_the_first_person():
    """Live run, day 4: 'She trusts growing things…' broke the voice."""
    import re
    third = re.compile(r'^(She|He)\b')
    for pack in (CELEBRIAN_MUSINGS, ARANATH_MUSINGS):
        for m in pack:
            assert not third.match(m['statement']), m['statement']
    for rewrites in LEGACY_REWRITES.values():
        for _old, new, _o, _n in rewrites:
            assert not third.match(new), new


# --- attitudes: the faceted part of the pack --------------------------------

ALL_ATTITUDES = [
    pytest.param(who, a, id=f"{who}:{a['statement'][:40]}")
    for who, pack in ATTITUDE_PACKS.items()
    for a in pack
]
_SUBJECT_PREFIXES = ('entity:', 'tag:family:', 'tag:entity_type:')


def test_attitudes_are_well_formed():
    """Every attitude is a faceted belief: subject + bounded stance + a
    declared source — and the subject only knows the three specificity
    levels the engine resolves (entity > family > type)."""
    seen = set()
    for pack in ATTITUDE_PACKS.values():
        for a in pack:
            assert a['statement'] not in seen, a['statement']
            seen.add(a['statement'])
            assert a['kind'] in ('world', 'self', 'other')
            assert a['subject'], a['statement']
            for tag in a['subject']:
                assert tag.startswith(_SUBJECT_PREFIXES), tag
            assert -1 <= a['stance'] <= 1
            assert a['source'] in ('lived', 'heard', 'legend')
            assert 0 < a['strength'] <= 5


@pytest.mark.parametrize('who,attitude', ALL_ATTITUDES)
def test_every_attitude_subject_actually_touches(who, attitude):
    """Same behavioural audit as the musings: a day carrying each of
    the subject's tags makes the attitude speak in the brief."""
    b = _belief(attitude['statement'], id_=f'{who}-a')
    b.subject = list(attitude['subject'])
    for tag in attitude['subject']:
        brief = build_brief(_day_for(tag), [], [b], [], {}, episode_idx=0)
        assert b.statement in _texts(brief), tag


def test_attitudes_speak_in_the_first_person_too():
    import re
    third = re.compile(r'^(She|He)\b')
    for pack in ATTITUDE_PACKS.values():
        for a in pack:
            assert not third.match(a['statement']), a['statement']
