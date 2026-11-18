# ============================================================================
# The day as chronology (ADR-0019)
# ----------------------------------------------------------------------------
# The narrator prompt no longer lays the day out as three labelled phase
# blocks the model must re-order for itself. ONE === TODAY === section is
# the day's skeleton: every event, encounter, meal and rest in the order it
# happened, clock hours spoken as natural time, weather told once and only
# re-told when it changes, and the overnight stated where the day opens.
# ============================================================================
from app.prompt.builder import build_day_prompt


def _prompt(**kwargs):
    kwargs.setdefault('day', {'day_number': 4, 'date': '1950-10-08'})
    kwargs.setdefault('character', {'name': 'Aranath'})
    return build_day_prompt(**kwargs)['user']


def test_one_chronological_skeleton_no_phase_banners():
    user = _prompt(events=[
        {'type': 'land', 'when': {'phase': 'morning', 'hour': 9.0},
         'data': {'subtype': 'place', 'reading': 'a village: sighted far off'}},
    ])
    assert '=== TODAY ===' in user
    assert '=== MORNING ===' not in user
    assert '=== AFTERNOON ===' not in user
    assert 'NIGHT AT CAMP' not in user


def test_events_sort_by_hour_inside_the_phase():
    """Phase buckets flattened the afternoon: a 16:00 beat must come after
    the 13:00 one, even if the wire lists them out of order."""
    user = _prompt(events=[
        {'type': 'moment', 'when': {'phase': 'afternoon', 'hour': 16.0},
         'data': {'reading': 'a wolf watched from the treeline'}},
        {'type': 'moment', 'when': {'phase': 'afternoon', 'hour': 13.5},
         'data': {'reading': 'a shepherd waved from the field'}},
    ])
    assert user.index('a shepherd waved') < user.index('a wolf watched')


def test_clock_hours_never_reach_the_narrator():
    """The narrator reads prose, not a log: when.hour becomes a natural
    phrase — 'late in the afternoon', never '16:00'."""
    user = _prompt(
        day={
            'day_number': 4, 'date': '1950-10-08',
            'encounters': [{
                'phase': 'afternoon', 'hour': 16.0, 'region': 'the Greenway',
                'entity': {'name': 'Dunlendings', 'type': 'people'},
                'interaction': {'form': 'glimpsed_far'},
            }],
        },
        events=[],
    )
    assert '16:00' not in user and '16.0' not in user
    assert 'Late in the afternoon' in user


def test_encounter_lands_at_its_clock_position():
    """A 16:00 encounter narrates in the late afternoon — after the midday
    meal, not before it."""
    user = _prompt(
        day={
            'day_number': 4, 'date': '1950-10-08',
            'encounters': [{
                'phase': 'afternoon', 'hour': 16.0, 'region': 'the Greenway',
                'entity': {'name': 'Dunlendings', 'type': 'people'},
                'interaction': {'form': 'glimpsed_far'},
            }],
        },
        events=[
            {'type': 'meal', 'when': {'phase': 'afternoon', 'hour': 13.0},
             'data': {'reading': 'road-bread and dried fruit'}},
        ],
    )
    assert user.index('road-bread and dried fruit') < user.index('Dunlendings')


def test_hourless_events_sort_by_the_time_their_reading_names():
    """Land, meal and climate events arrive without when.hour — their
    readings already say 'the early afternoon', 'the midday halt'. The
    timeline recovers that position instead of dumping them at the end
    of the phase, after the clocked encounters they precede."""
    user = _prompt(
        day={
            'day_number': 4, 'date': '1950-10-08',
            'encounters': [{
                'phase': 'afternoon', 'hour': 16.0, 'region': 'the Greenway',
                'entity': {'name': 'Dunlendings', 'type': 'people'},
                'interaction': {'form': 'glimpsed_far'},
            }],
        },
        events=[
            {'type': 'land', 'when': {'phase': 'afternoon'},
             'data': {'subtype': 'water',
                      'reading': 'a stream waded in the early afternoon'}},
            {'type': 'meal', 'when': {'phase': 'afternoon'},
             'data': {'reading': 'the midday halt, taken standing'}},
            {'type': 'land', 'when': {'phase': 'afternoon'},
             'data': {'subtype': 'place',
                      'reading': 'a village sighted in the late afternoon'}},
        ],
    )
    assert (user.index('the midday halt')
            < user.index('a stream waded')
            < user.index('Dunlendings')
            < user.index('a village sighted'))


def test_an_untimed_event_opens_the_day_not_the_night():
    """An event with no phase and no hour is day-level material (the
    road's character) — it belongs at the open, not after supper."""
    user = _prompt(events=[
        {'type': 'land', 'when': {},
         'data': {'subtype': 'terrain',
                  'reading': 'drove-lanes join the road from the sheep-walks'}},
        {'type': 'rest', 'when': {'phase': 'night'},
         'data': {'reading': 'a hollow out of the wind'}},
    ])
    assert user.index('drove-lanes') < user.index('a hollow out of the wind')


def test_weather_is_told_once_and_only_change_is_retold():
    """An unchanging sky earns one line, not one per phase. Only a real
    shift — rain beginning, cloud gathering — re-enters the timeline."""
    user = _prompt(events=[
        {'type': 'climate', 'when': {'phase': 'morning', 'hour': 7.0},
         'data': {'reading': 'a hard cold holds the land and the east wind does not rest'}},
        {'type': 'climate', 'when': {'phase': 'afternoon', 'hour': 14.0},
         'data': {'reading': 'a hard cold holds the land and the east wind does not rest'}},
        {'type': 'climate', 'when': {'phase': 'night', 'hour': 20.0},
         'data': {'reading': 'a hard cold holds the land and rain begins'}},
    ])
    assert user.count('a hard cold holds the land') == 1
    assert 'rain begins' in user
    assert 'Later' in user


def test_the_day_opens_where_last_night_was_spent():
    """The dawn line names where the traveller woke — the spine's first
    fixed point, so the narrator cannot invent a morning elsewhere."""
    user = _prompt(
        previous_rest='Coin buys the night at The Prancing Pony — a real bed.',
        events=[
            {'type': 'land', 'when': {'phase': 'morning', 'hour': 8.0},
             'data': {'subtype': 'place', 'reading': 'he leaves southward'}},
        ],
    )
    assert 'The day begins where last night ended' in user
    assert 'dark..' not in user and 'Pony..' not in user
    assert user.index('The Prancing Pony') < user.index('he leaves southward')


def test_the_first_weather_opens_the_skeleton():
    """The day's sky is the first fact of the morning — even when the
    climate event carries no hour, it precedes the clocked beats."""
    user = _prompt(
        day={
            'day_number': 4, 'date': '1950-10-08',
            'encounters': [{
                'phase': 'morning', 'hour': 10.0, 'region': 'the Greenway',
                'entity': {'name': 'Wandering Company', 'type': 'people'},
                'interaction': {'form': 'glimpsed_far'},
            }],
        },
        events=[
            {'type': 'climate', 'when': {'phase': 'morning'},
             'data': {'reading': 'a raw cold and a low grey sky'}},
        ],
    )
    assert user.index('a raw cold') < user.index('Wandering Company')


def test_no_encounters_is_stated_not_implied():
    user = _prompt(events=[
        {'type': 'meal', 'when': {'phase': 'morning', 'hour': 9.0},
         'data': {'reading': 'bread and cheese'}},
    ])
    assert 'no one is met' in user


def test_stirs_land_in_their_own_part_of_the_day():
    """A stir belongs where it stirs (C21/C35): the afternoon's fear sits
    inside the afternoon stretch — it does not open the day and it does
    not wait at a faraway list."""
    user = _prompt(
        events=[
            {'type': 'moment', 'when': {'phase': 'morning', 'hour': 9.0},
             'data': {'reading': 'a lark over the stubble'}},
            {'type': 'moment', 'when': {'phase': 'afternoon', 'hour': 15.0},
             'data': {'reading': 'the road narrows between hedges'}},
        ],
        memory_beats={
            'afternoon': [{'line': 'orcs tighten their chest', 'subject': 'x'}],
        },
    )
    lark = user.index('a lark over the stubble')
    hedges = user.index('the road narrows between hedges')
    stir = user.index('orcs tighten their chest')
    assert lark < hedges < stir


def test_the_night_is_named_by_what_it_is():
    """No fixed NIGHT AT CAMP banner: the rest reading is the day's last
    beat — a bought bed reads as an inn, a hedge as open country."""
    user = _prompt(events=[
        {'type': 'rest', 'when': {'phase': 'night'},
         'data': {'reading': 'Coin buys the night at The Prancing Pony'}},
    ])
    assert 'Coin buys the night at The Prancing Pony' in user
    assert 'NIGHT AT CAMP' not in user
