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
        {'type': 'ambience', 'when': {'phase': 'afternoon', 'hour': 16.0},
         'data': {'reading': 'a wolf watched from the treeline'}},
        {'type': 'ambience', 'when': {'phase': 'afternoon', 'hour': 13.5},
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


def test_daylight_moves_the_dusk_phrase_with_the_season():
    """day.daylight carries the day's true {sunrise, sunset} — a November
    dusk falls before 17:00, so a 15:00 encounter reads 'Toward dusk',
    while a June dusk holds it in the afternoon."""
    enc = [{
        'phase': 'afternoon', 'hour': 15.0, 'region': 'the Greenway',
        'entity': {'name': 'Dunlendings', 'type': 'people'},
        'interaction': {'form': 'glimpsed_far'},
    }]
    winter = _prompt(
        day={'day_number': 4, 'date': '1950-11-08',
             'daylight': {'sunrise': 8.1, 'sunset': 16.4},
             'encounters': enc},
        events=[])
    assert 'Toward dusk' in winter
    summer = _prompt(
        day={'day_number': 4, 'date': '1950-06-08',
             'daylight': {'sunrise': 4.9, 'sunset': 21.2},
             'encounters': enc},
        events=[])
    assert 'Early in the afternoon' in summer
    # A day that ships no anchors keeps the fixed 7/19 defaults.
    fixed = _prompt(
        day={'day_number': 4, 'date': '1950-10-08', 'encounters': enc},
        events=[])
    assert 'Early in the afternoon' in fixed


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


def test_encounter_clock_string_sorts_at_its_hour():
    """The backend wire sends encounter hour as the display string
    'HH:MM' beside the numeric hour_float (formatClock). The timeline
    must read the clock position — never compare a string to a float."""
    user = _prompt(
        day={
            'day_number': 4, 'date': '1950-10-08',
            'encounters': [{
                'phase': 'afternoon', 'hour': '16:30', 'hour_float': 16.5,
                'region': 'the Greenway',
                'entity': {'name': 'Dunlendings', 'type': 'people'},
                'interaction': {'form': 'glimpsed_far'},
            }, {
                'phase': 'morning', 'hour': '10:00',
                'region': 'the Greenway',
                'entity': {'name': 'Wandering Company', 'type': 'people'},
                'interaction': {'form': 'glimpsed_far'},
            }],
        },
        events=[
            {'type': 'meal', 'when': {'phase': 'afternoon', 'hour': 13.0},
             'data': {'reading': 'road-bread and dried fruit'}},
        ],
    )
    assert (user.index('Wandering Company')
            < user.index('road-bread and dried fruit')
            < user.index('Dunlendings'))
    assert '16:30' not in user


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


def test_the_day_opens_where_the_roof_was():
    """A rest record names the place itself — 'they wake at the dry
    loft', never a clause carved out of the night's prose (a hosted
    reading leads with the host's name, not the roof)."""
    user = _prompt(
        previous_rest={
            'place': 'the dry loft',
            'reading': 'Edrahil, a keeper of the northern road — a night '
                       'under a dry roof.',
            'tags': ['rest:indoor', 'rest:good'],
        },
        events=[
            {'type': 'land', 'when': {'phase': 'morning', 'hour': 8.0},
             'data': {'subtype': 'place', 'reading': 'he leaves southward'}},
        ],
    )
    assert 'they wake at the dry loft' in user
    assert 'the night gave deep rest' in user
    assert user.index('the dry loft') < user.index('he leaves southward')


def test_an_unremarkable_night_says_nothing_about_sleep():
    """Most mornings the waking is only a place — rest tags mark the
    extremes (poor/good), so a middling night earns no remark. The
    world decides when sleep is worth a word, not the narrator."""
    user = _prompt(
        previous_rest={
            'place': 'a hollow out of the wind',
            'reading': 'A night in the open lands.',
            'tags': ['rest:open_sky'],
        },
        events=[],
    )
    assert 'they wake at a hollow out of the wind' in user
    assert 'gave little rest' not in user and 'gave deep rest' not in user


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
            {'type': 'ambience', 'when': {'phase': 'morning', 'hour': 9.0},
             'data': {'reading': 'a lark over the stubble'}},
            {'type': 'ambience', 'when': {'phase': 'afternoon', 'hour': 15.0},
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


def test_an_echo_that_restates_the_encounter_is_consumed():
    """Entity narration is authored once and reused — a memory of a past
    'Sheep Pastures' literally repeats today's seeds. An echo that only
    restates the encounter it rides into is dropped, not printed twice."""
    user = _prompt(
        day={
            'day_number': 4, 'date': '1950-10-08',
            'encounters': [{
                'phase': 'morning', 'hour': 10.0, 'region': 'South Arthedain',
                'entity': {'name': 'Sheep Pastures', 'type': 'resources'},
                'interaction': {
                    'form': 'harvest_shelter',
                    'dialogue_content': {
                        'concrete_content': 'A corner out of the wind can be found where land is kept: a hedge lee, a stacked-stone angle.',
                    },
                },
            }],
        },
        memory_beats={
            'morning': [{
                'line': 'Sheep Pastures — A corner out of the wind can be found where land is kept: a hedge lee, a stacked-stone angle. Reads who works this ground.',
                'subject': 'Sheep Pastures',
            }],
        },
    )
    assert 'call to mind' not in user
    assert 'inform what the traveller answers' not in user
    # The substance appears once — in the encounter, not twice.
    assert user.count('corner out of the wind') == 1


def test_a_sign_only_echo_calls_to_mind_not_answers():
    """No one stands behind a Ranger sign — the echo is a beat of
    recollection, not something to answer with."""
    user = _prompt(
        day={
            'day_number': 4, 'date': '1950-10-08',
            'encounters': [{
                'phase': 'night', 'hour': 20.5, 'region': 'South Arthedain',
                'entity': {'name': 'Bree-landers', 'type': 'humans'},
                'interaction': {
                    'form': 'sign_only',
                    'dialogue_content': {
                        'concrete_content': 'Three nicks on the waypost, fresh, pale inside.',
                    },
                },
            }],
        },
        memory_beats={
            'night': [{
                'line': 'Tribesmen — a dry loft, hot food and the loan of a whetstone.',
                'subject': 'Bree-landers',
            }],
        },
    )
    assert 'May call to mind' in user
    assert 'inform what the traveller answers' not in user


def test_a_resolved_npc_names_herself():
    """The backend names real NPCs (Bungo, Pearl) — the name must reach
    the narrator, not the entity slug."""
    user = _prompt(events=[
        {'type': 'encounter', 'when': {'phase': 'night', 'hour': 21.0},
         'where': {'region': 'Bree'},
         'data': {
             'entity_name': 'Prancing Pony host', 'entity_type': 'people',
             'npc_name': 'Pearl',
             'form': 'brief_exchange',
         }},
    ])
    assert 'Pearl' in user


def test_the_night_is_named_by_what_it_is():
    """No fixed NIGHT AT CAMP banner: the rest reading is the day's last
    beat — a bought bed reads as an inn, a hedge as open country."""
    user = _prompt(events=[
        {'type': 'rest', 'when': {'phase': 'night'},
         'data': {'reading': 'Coin buys the night at The Prancing Pony'}},
    ])
    assert 'Coin buys the night at The Prancing Pony' in user
    assert 'NIGHT AT CAMP' not in user
