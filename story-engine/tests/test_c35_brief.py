# ============================================================================
# C35 — the Lens is an Episode brief with a Focus
# ----------------------------------------------------------------------------
# build_brief narrows the Mind to what touches this Episode: a Focus,
# a few lines that connect to it — split into what the Character carries
# in and what the day does to it, by phase — and every silenced candidate
# with its reason (CONTEXT.md · Lens, Focus, Belief, Memory, Need).
# ============================================================================
from types import SimpleNamespace

from app.mind.focus import build_brief


def _event(reading, salience, phase=None, tags=(), type_='encounter'):
    return {
        'type': type_, 'reading': reading, 'salience': salience,
        'when': {'phase': phase} if phase else {}, 'tags': list(tags),
        'perception': 'noticed',
    }


ORCS = _event(
    'orc boots, wide-spaced, a pursuit gait', 0.7, 'afternoon',
    ['type:encounter', 'entity:orc_trackers', 'tag:entity_type:orcs'],
)
SHEEP = _event(
    'a herd on the hillside', 0.35, 'morning',
    ['type:encounter', 'entity:sheep', 'tag:entity_type:herbivores'],
)
DRIZZLE = _event('a faint drizzle', 0.1, 'morning', type_='climate')


def _belief(statement, tags=(), confidence=0.8, id_='b1'):
    return SimpleNamespace(id=id_, statement=statement, tags=list(tags),
                           confidence=confidence)


def test_loudest_event_is_the_focus_and_lives_in_its_phase():
    brief = build_brief([DRIZZLE, SHEEP, ORCS], [], [], [], {})
    assert brief['focus']['text'].startswith('orc boots')
    assert brief['focus']['phase'] == 'afternoon'
    assert brief['chosen_by'] == 'rules'


def test_quiet_episode_has_no_focus():
    brief = build_brief([DRIZZLE, SHEEP], [], [], [], {})
    assert brief['focus'] is None


def test_beliefs_speak_only_when_the_day_puts_them_at_stake():
    gratitude = _belief(
        'After danger passes, gratitude is the sharpest feeling.',
        tags=['tag:entity_type:orcs'], id_='g',
    )
    arnor = _belief(
        'He has spent years walking the borders of fallen Arnor.', id_='a',
    )
    brief = build_brief([ORCS], [], [gratitude, arnor], [], {})
    day_texts = [l['text'] for l in brief['day']]
    assert gratitude.statement in day_texts
    # Anchored to the moment the danger happens, never before it.
    assert next(l for l in brief['day'] if l['text'] == gratitude.statement)['phase'] == 'afternoon'
    silenced = {s['text']: s['reason'] for s in brief['silenced']}
    assert silenced[arnor.statement] == 'nothing in the Episode puts it at stake'


def test_a_belief_touched_by_words_alone_still_counts():
    meal = _belief('A warm meal and ale renew my spirit for the road ahead.', id_='m')
    inn = _event('a hot meal bought at the inn, ale and clean water', 0.5,
                 'night', ['type:rest', 'tag:paid'], type_='rest')
    brief = build_brief([inn], [], [meal], [], {})
    assert meal.statement in [l['text'] for l in brief['day']]


def test_needs_speak_when_new_worsening_or_urgent_and_carry_their_origin():
    # Past the urgency line: always speaks, with where it comes from.
    hunger = {'key': 'hunger', 'description': 'the hunger has gone from ache to companion',
              'urgency': 0.65, 'source': {'days': 3}}
    # Worsening but unconnected to the Focus: a candidate the rules let
    # go quiet (the director may still pick it).
    tired = {'key': 'exhaustion', 'description': 'the legs ask for the end',
             'urgency': 0.4, 'worsening': True}
    stable = {'key': 'thirst', 'description': 'the mouth asks',
              'urgency': 0.4}
    brief = build_brief(
        [ORCS], [], [], [hunger, tired, stable], {},
        need_origins={'hunger': '3 days without a proper meal'},
    )
    carried = [l['text'] for l in brief['carried']]
    assert 'the hunger has gone from ache to companion — 3 days without a proper meal' in carried
    silenced = {s['text']: s['reason'] for s in brief['silenced']}
    assert silenced['the mouth asks'] == 'stable and untouched by the Episode'
    assert silenced['the legs ask for the end'] == 'does not connect to the Focus'


def test_an_urgent_need_can_take_the_focus():
    starving = {'key': 'hunger', 'description': 'food crowds every thought',
                'urgency': 0.95}
    brief = build_brief([SHEEP], [], [], [starving], {})
    assert brief['focus']['kind'] == 'need'


def test_a_need_born_today_speaks_at_night_never_before():
    wound = {'key': 'wound', 'description': 'a wound still unhealed',
             'urgency': 0.35, 'is_new': True}
    brief = build_brief([ORCS], [], [], [wound], {})
    line = next(l for l in brief['day'] if l['kind'] == 'need')
    assert line['phase'] == 'night'


def test_entering_mood_connects_to_a_matching_focus():
    entering = {'valence': -0.5, 'cause': {
        'reading': 'orc tracks a day old', 'valence': -0.8,
        'tags': ['tag:entity_type:orcs'],
    }}
    brief = build_brief([ORCS], [], [], [], entering)
    assert 'orc tracks a day old' in [l['text'] for l in brief['carried']]


def test_anchored_memory_waits_for_its_phase():
    wolves = SimpleNamespace(id='m1', desc='wolves at dusk on the south road',
                             importance=0.7)
    brief = build_brief([SHEEP, ORCS], [wolves], [], [], {}, anchors={'m1': 1})
    line = next(l for l in brief['day'] if l['kind'] == 'memory')
    assert line['phase'] == 'afternoon'
    assert line['connects_to'] == brief['focus']['id']


def test_lines_are_capped():
    beliefs = [
        _belief(f'orcs belief {i}', tags=['tag:entity_type:orcs'], id_=f'b{i}')
        for i in range(6)
    ]
    brief = build_brief([ORCS], [], beliefs, [], {})
    assert len(brief['carried']) + len(brief['day']) == 3
    assert sum(s['reason'] == 'past the line cap' for s in brief['silenced']) == 3
