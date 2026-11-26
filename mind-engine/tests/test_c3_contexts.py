# ============================================================================
# C3 — context:* gates declared over the whole day (musings + beliefs)
# ----------------------------------------------------------------------------
# `context:solitude` worked, hardcoded to one boolean. Now `_day_contexts`
# computes the day's shape from a declared registry — solitude, company,
# danger, safe, deprivation — and any 'context:X' tag on a musing or a
# belief asks that X be true of the DAY, not of one item. 'safe' is the
# day nothing dangerous happened; no single item can say that.
# ============================================================================
from types import SimpleNamespace

from app.mind.focus import build_brief


def _event(reading, salience, phase=None, tags=(), type_='encounter',
           data=None, imprint=None):
    return {
        'type': type_, 'reading': reading, 'salience': salience,
        'when': {'phase': phase} if phase else {}, 'tags': list(tags),
        'perception': 'noticed',
        **({'data': data} if data else {}),
        **({'imprint': imprint} if imprint else {}),
    }


def _musing(statement, tags=(), id_='m1'):
    return SimpleNamespace(id=id_, statement=statement, tags=list(tags))


def _belief(statement, tags=(), strength=3, id_='b1'):
    return SimpleNamespace(id=id_, statement=statement, tags=list(tags),
                           strength=strength)


QUIET = [
    _event('open moor under a grey sky', 0.3, 'morning', type_='travel'),
    _event('cold drizzle', 0.2, 'afternoon', type_='climate'),
]
FRIEND = [_event(
    'a trader shares her fire and news of the road', 0.6, 'night',
    ['type:encounter', 'entity:trader_ana', 'tag:entity_type:humans',
     'tag:form:brief_exchange'],
)]
WARG = [_event(
    'the warg leapt at them out of the dark', 0.9, 'night',
    ['type:encounter', 'entity:warg', 'tag:entity_type:carnivores',
     'tag:form:attacks'],
    data={'danger': 4},
)]
# No declared danger but the semantics wrote fear into the imprint —
# menace the semantics named, not the wire.
STALKED = [_event(
    'something moved between the trunks, keeping pace', 0.7, 'afternoon',
    ['type:encounter', 'entity:stalker'],
    imprint={'fear': 0.4},
)]


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


def test_safe_musing_speaks_only_on_safe_days():
    musing = _musing(
        'The first night I do not have to watch the door.',
        tags=['context:safe'])
    brief = build_brief(QUIET, [], [], [], {}, episode_idx=1,
                        musings=[musing])
    assert musing.statement in _texts(brief)
    brief = build_brief(WARG, [], [], [], {}, episode_idx=1,
                        musings=[musing])
    assert musing.statement not in _texts(brief)


def test_danger_musing_speaks_only_when_menace_was_near():
    musing = _musing(
        'Fear keeps better time than any hourglass.',
        tags=['context:danger'])
    brief = build_brief(WARG, [], [], [], {}, episode_idx=1,
                        musings=[musing])
    assert musing.statement in _texts(brief)
    # Menace written by the semantics, not declared by the wire.
    brief = build_brief(STALKED, [], [], [], {}, episode_idx=1,
                        musings=[musing])
    assert musing.statement in _texts(brief)
    brief = build_brief(QUIET, [], [], [], {}, episode_idx=1,
                        musings=[musing])
    assert musing.statement not in _texts(brief)


def test_company_belief_speaks_only_when_someone_was_there():
    belief = _belief(
        'A shared fire is half a home.', tags=['context:company'])
    brief = build_brief(FRIEND, [], [belief], [], {}, episode_idx=1)
    assert belief.statement in _texts(brief)
    brief = build_brief(QUIET, [], [belief], [], {}, episode_idx=1)
    assert belief.statement not in _texts(brief)


def test_deprivation_musing_speaks_only_while_the_body_asks():
    musing = _musing(
        'Hunger makes a clock of the belly.', tags=['context:deprivation'])
    needs = [{'type': 'physiological', 'key': 'hunger'}]
    brief = build_brief(QUIET, [], [], needs, {}, episode_idx=1,
                        musings=[musing])
    assert musing.statement in _texts(brief)
    # An intention is not the body asking.
    brief = build_brief(QUIET, [], [],
                        [{'type': 'intention', 'key': 'find_the_ford'}],
                        {}, episode_idx=1, musings=[musing])
    assert musing.statement not in _texts(brief)


def test_solitude_keeps_its_exact_door():
    """Regression: 'context:solitude' is a registry entry now but the
    semantics are the ones it always had — speaks when nobody touched
    the mind, quiet when the day had company."""
    musing = _musing('x', tags=['context:solitude'])
    brief = build_brief(QUIET, [], [], [], {}, episode_idx=1,
                        musings=[musing])
    assert 'x' in _texts(brief)
    brief = build_brief(FRIEND, [], [], [], {}, episode_idx=1,
                        musings=[musing])
    assert 'x' not in _texts(brief)
    assert brief['silenced'][0]['reason'] == 'the day had company'


def test_compound_contexts_all_must_hold():
    """'context:solitude' + 'context:safe' is the night she is alone AND
    nothing hunts — every declared context must be true of the day."""
    musing = _musing(
        'Alone and unhunted — the rarest of nights.',
        tags=['context:solitude', 'context:safe'])
    # Alone and dangerous: solitude holds, safe does not.
    brief = build_brief(WARG, [], [], [], {}, episode_idx=1,
                        musings=[musing])
    assert musing.statement not in _texts(brief)
    # Alone and safe: both hold.
    brief = build_brief(QUIET, [], [], [], {}, episode_idx=1,
                        musings=[musing])
    assert musing.statement in _texts(brief)
