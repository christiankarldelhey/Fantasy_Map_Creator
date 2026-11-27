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
    assert user.index('A shepherd waved') < user.index('A wolf watched')


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


def test_polar_daylight_overrides_clock_phrases():
    """Above the arctic circle the analog returns polar flags, not hours:
    a Finnmark December ('polar night') reads dark at midday; a June
    midnight sun keeps late hours lit."""
    enc = [{
        'phase': 'afternoon', 'hour': 12.0, 'region': 'the Ice Bay',
        'entity': {'name': 'Lossoth', 'type': 'people'},
        'interaction': {'form': 'glimpsed_far'},
    }]
    polar_night = _prompt(
        day={'day_number': 4, 'date': '1950-12-21',
             'daylight': {'sunrise': None, 'sunset': None, 'polar': 'night'},
             'encounters': enc},
        events=[])
    assert 'In the dark of the polar night' in polar_night
    late_enc = [dict(enc[0], hour=23.0)]
    polar_day = _prompt(
        day={'day_number': 4, 'date': '1950-06-21',
             'daylight': {'sunrise': None, 'sunset': None, 'polar': 'day'},
             'encounters': late_enc},
        events=[])
    assert 'Under the midnight sun' in polar_day


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
    assert user.index('Road-bread and dried fruit') < user.index('Dunlendings')


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
            < user.index('Road-bread and dried fruit')
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
    assert (user.index('The midday halt')
            < user.index('A stream waded')
            < user.index('Dunlendings')
            < user.index('A village sighted'))


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
    assert user.index('Drove-lanes') < user.index('A hollow out of the wind')


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
    assert user.count('A hard cold holds the land') == 1
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
    assert user.index('The Prancing Pony') < user.index('He leaves southward')


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
    assert user.index('the dry loft') < user.index('He leaves southward')


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
    assert user.index('A raw cold') < user.index('Wandering Company')


def test_a_threat_is_named_in_its_header_and_the_rules():
    """A wolf that breaks cover cannot read as just another line: the
    beat announces 'a dangerous encounter' and the chapter's rules
    roster every name, so a dropped attack is a checkable breach."""
    user = _prompt(
        day={
            'day_number': 4, 'date': '1950-10-08',
            'encounters': [{
                'phase': 'afternoon', 'hour': 16.0,
                'entity': {'name': 'Hares', 'type': 'animal'},
                'interaction': {'form': 'reacts_withdraws'},
            }, {
                'phase': 'afternoon', 'hour': 17.0,
                'entity': {'name': 'Wolves', 'type': 'animal'},
                'interaction': {'form': 'attacks'},
            }],
        },
        events=[],
    )
    assert 'a dangerous encounter' in user
    rules = user[user.index("=== THE CHAPTER'S RULES ==="):]
    assert 'Hares, Wolves' in rules


def test_a_resolved_threat_binds_its_result_and_its_cost():
    """ADR-0022: what the traveller chose against the wolves, and what
    it cost the body, is a fact to narrate — never a soft seed line the
    narrator may dissolve."""
    user = _prompt(
        day={
            'day_number': 4, 'date': '1950-10-08',
            'encounters': [{
                'phase': 'afternoon', 'hour': 17.0,
                'entity': {'name': 'Wolves', 'type': 'carnivores'},
                'interaction': {
                    'form': 'attacks', 'outcome': 'wounded',
                    'dialogue_content': {
                        'traveller_stance': 'Stands with her back to the '
                                            'alder and takes the first one '
                                            'on the blade.',
                    },
                },
            }],
        },
        events=[],
    )
    line = next(ln for ln in user.splitlines() if 'OUTCOME' in ln)
    assert 'takes the first one on the blade' in line
    assert 'comes away wounded' in line
    assert user.count('takes the first one on the blade') == 1


def test_no_encounters_is_stated_not_implied():
    user = _prompt(events=[
        {'type': 'meal', 'when': {'phase': 'morning', 'hour': 9.0},
         'data': {'reading': 'bread and cheese'}},
    ])
    assert 'no one is met' in user


def test_stirs_land_in_their_own_part_of_the_day():
    """A stir belongs where it stirs (C21/C35): the afternoon's fear sits
    inside the beat that woke it — it does not open the day and it does
    not wait at a faraway list."""
    user = _prompt(
        events=[
            {'type': 'ambience', 'when': {'phase': 'morning', 'hour': 9.0},
             'data': {'reading': 'a lark over the stubble'}},
            {'type': 'ambience', 'when': {'phase': 'afternoon', 'hour': 15.0},
             'data': {'reading': 'the road narrows between hedges'}},
        ],
        memory_beats={
            'afternoon': [{'line': 'orcs tighten their chest', 'anchor': 1}],
        },
    )
    lark = user.index('A lark over the stubble')
    hedges = user.index('The road narrows between hedges')
    stir = user.index('Orcs tighten their chest')
    assert lark < hedges < stir


def test_the_wake_reports_the_body_and_holds_the_continuity():
    """The wake is the day's first fixed point: it names where last
    night ended (place + what the night was worth) and hosts the needs
    no day's event answers to — the body's own report."""
    user = _prompt(
        previous_rest={'place': 'a sheltered dell',
                       'tags': ['rest:good'],
                       'reading': 'A sheltered dell out of the wind'},
        events=[
            {'type': 'ambience', 'when': {'phase': 'morning', 'hour': 9.0},
             'data': {'reading': 'a lark over the stubble'}},
            {'type': 'meal', 'when': {'phase': 'afternoon', 'hour': 13.0},
             'data': {'reading': 'The midday halt: road-bread.'}},
        ],
        memory_beats={
            'carried': [
                {'kind': 'need', 'key': 'hunger', 'urgent': True,
                 'line': 'the belly cramps — three days without a meal'},
            ],
        },
    )
    wake = user.index('The day begins where last night ended')
    assert 'they wake at a sheltered dell — the night gave deep rest' \
        in user[wake:]
    belly = user.index('The belly cramps')
    meal = user.index('The midday halt')
    # Past the urgency line it speaks at the wake — not waiting for a meal.
    assert wake < belly < meal


def test_a_carried_need_speaks_at_the_first_event_of_its_domain():
    """The carried hunger does not float in the Lens and does not wait
    for the last meal — it reports at the day's first one."""
    user = _prompt(
        events=[
            {'type': 'climate', 'when': {'phase': 'morning', 'hour': 8.0},
             'data': {'reading': 'a grey lid of sky'}},
            {'type': 'meal', 'when': {'phase': 'afternoon', 'hour': 13.0},
             'data': {'reading': 'The midday halt: road-bread.'}},
            {'type': 'meal', 'when': {'phase': 'night', 'hour': 20.0},
             'data': {'reading': 'Supper by the fire: salt pork.'}},
        ],
        memory_beats={
            'carried': [
                {'kind': 'need', 'key': 'hunger',
                 'line': 'the belly wonders — 2 days without a proper meal'},
                {'kind': 'need', 'key': 'exposure',
                 'line': 'day upon day of hostile weather — shelter is needed'},
            ],
        },
    )
    sky = user.index('A grey lid of sky')
    midday = user.index('The midday halt')
    supper = user.index('Supper by the fire')
    shelter = user.index('Day upon day of hostile weather')
    belly = user.index('The belly wonders')
    # First weather, first meal — not the last of either.
    assert sky < shelter < midday < belly < supper
    assert 'stirs in them' not in user


def test_an_unconnected_line_never_reaches_the_narrator():
    """A standing feeling or memory the day never touched stays silent —
    nothing floats in a phase list without its event."""
    user = _prompt(
        events=[
            {'type': 'ambience', 'when': {'phase': 'afternoon', 'hour': 15.0},
             'data': {'reading': 'the road narrows between hedges'}},
        ],
        memory_beats={
            'afternoon': [
                {'line': 'orcs tighten their chest', 'subject': 'x'},
                {'line': '(a standing feeling) Cave-trolls — feared',
                 'kind': 'disposition', 'subject': 'Cave-trolls'},
            ],
        },
    )
    assert 'orcs tighten their chest' not in user
    assert 'Cave-trolls' not in user
    assert 'stirs in them' not in user


def test_a_carried_memory_speaks_where_the_day_touches_it():
    """The carried memory is no floating preamble either: a memory the
    day's events touch surfaces inside that event — a memory nothing
    touches stays silent. No 'What they carry' list reaches the prompt."""
    user = _prompt(
        events=[
            {'type': 'ambience', 'when': {'phase': 'morning', 'hour': 9.0},
             'data': {'reading': 'a pack of wolves crosses the road'}},
            {'type': 'ambience', 'when': {'phase': 'afternoon', 'hour': 15.0},
             'data': {'reading': 'the road narrows between hedges'}},
        ],
        memory_beats={
            'carried': [
                {'kind': 'memory', 'subject': 'wolves',
                 'line': '(a memory) A pack reads a road better than most '
                         'garrisons; I respect the craft and distrust the '
                         'wolves.'},
                {'kind': 'memory', 'subject': 'the last of my people',
                 'line': '(a memory) The last of my people walk the same '
                         'roads I do; we nod once, and that is enough.'},
            ],
        },
    )
    assert 'What they carry' not in user
    wolves = user.index('A pack of wolves crosses')
    pack = user.index('A pack reads a road better')
    assert wolves < pack
    assert 'the last of my people' not in user.lower()


def test_a_need_rides_the_event_of_its_domain():
    """The weather complaint speaks under the weather, not in a list —
    a need joins the event that IS its domain."""
    user = _prompt(
        events=[
            {'type': 'climate', 'when': {'phase': 'morning', 'hour': 9.0},
             'data': {'reading': 'a hard cold holds the land'}},
            {'type': 'meal', 'when': {'phase': 'night', 'hour': 20.0},
             'data': {'reading': 'Supper by the fire: road-bread.'}},
        ],
        memory_beats={
            'night': [
                {'line': 'day upon day of hostile weather has worn the '
                         'spirit thin — shelter is needed',
                 'kind': 'need', 'key': 'exposure'},
                {'line': 'three days without food — hunger is urgent',
                 'kind': 'need', 'key': 'hunger'},
            ],
        },
    )
    cold = user.index('A hard cold holds the land')
    supper = user.index('Supper by the fire')
    weather_need = user.index('Day upon day of hostile weather')
    hunger = user.index('Three days without food')
    assert cold < weather_need < supper < hunger


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


def test_light_turns_get_a_divider_between_beats():
    """The host's declared sky changes mark themselves (when.light): a
    17:42 in autumn is already night and the skeleton says so between
    beats, not by the narrator's guess."""
    user = _prompt(events=[
        {'type': 'land', 'when': {'phase': 'afternoon', 'hour': 15.0,
                                  'light': 'day'},
         'data': {'subtype': 'terrain', 'reading': 'open heath'}},
        {'type': 'land', 'when': {'phase': 'afternoon', 'hour': 17.7,
                                  'light': 'night'},
         'data': {'subtype': 'terrain', 'reading': 'a wind-bent oak'}},
    ])
    dark = user.index('— after dark —')
    assert user.index('Open heath') < dark < user.index('A wind-bent oak')
    # Broad daylight is the road's default — no marker for the opening sky.
    assert '— daylight —' not in user


def test_a_day_opening_in_darkness_says_so():
    user = _prompt(events=[
        {'type': 'land', 'when': {'phase': 'morning', 'hour': 5.0,
                                  'light': 'night'},
         'data': {'subtype': 'terrain', 'reading': 'frost on the ruts'}},
        {'type': 'land', 'when': {'phase': 'morning', 'hour': 8.0,
                                  'light': 'day'},
         'data': {'subtype': 'terrain', 'reading': 'the sun clears the ridge'}},
    ])
    assert '— after dark —' in user[:user.index('Frost on the ruts')]
    assert '— daylight —' in user


def test_the_chapters_rules_close_the_prompt_under_their_title():
    user = _prompt(events=[
        {'type': 'meal', 'when': {'phase': 'morning', 'hour': 9.0},
         'data': {'reading': 'bread and cheese'}},
    ])
    assert "=== THE CHAPTER'S RULES ===" in user
    assert user.index('=== TODAY ===') < user.index(
        "=== THE CHAPTER'S RULES ===")
    assert 'no one is met' in user


# ---------------------------------------------------------------------------
# Evoked lines ride inside the event that woke them (C35)
# ---------------------------------------------------------------------------

def test_an_evoked_memory_rides_inside_its_event():
    """A memory is an event-like thing: it belongs to the moment that
    woke it, indented under that beat — never floating in the phase's
    stirs list."""
    user = _prompt(
        events=[
            {'type': 'land', 'when': {'phase': 'morning', 'hour': 9.0},
             'data': {'subtype': 'crossing',
                      'reading': 'crossed into Numeriador'}},
            {'type': 'meal', 'when': {'phase': 'night', 'hour': 20.0},
             'data': {'reading': 'Supper by the fire: road-bread.'}},
        ],
        memory_beats={
            'morning': [{
                'line': '(a memory, 4 days ago) crossed into Talath Muil',
                'subject': 'Numeriador',
                'anchor': 0,
                'kind': 'memory',
            }],
        },
    )
    assert ('Crossed into Numeriador.\n'
            '  (a memory, 4 days ago) crossed into Talath Muil.') in user
    assert 'stirs in them' not in user


def test_an_evoked_memory_inside_its_encounter_uses_the_echo_slot():
    """A memory an encounter woke rides inside the encounter block — the
    echo slot already speaks 'may call to mind'."""
    user = _prompt(
        day={'day_number': 4, 'date': '1950-10-08',
             'encounters': [{
                 'phase': 'afternoon', 'hour': 15.0, 'region': 'the Gap',
                 'entity': {'name': 'Losrandír', 'type': 'people'},
                 'interaction': {'form': 'sign_only'},
             }]},
        events=[
            {'type': 'encounter',
             'when': {'phase': 'afternoon', 'hour': 15.0},
             'data': {'entity_name': 'Losrandír', 'form': 'sign_only'}},
        ],
        memory_beats={
            'afternoon': [{
                'line': '(a memory, 2 days ago) hoofprints by the water',
                'subject': 'Losrandír',
                'anchor': 0,
                'kind': 'memory',
            }],
        },
    )
    assert ('May call to mind (or stay silent): '
            '(a memory, 2 days ago) hoofprints by the water') in user
    assert 'stirs in them' not in user


def test_a_felt_beat_indents_under_its_own_event():
    """The immediate pull an event cast lands under that event's line —
    'left them watchful' belongs to the moment, not the phase."""
    user = _prompt(
        events=[
            {'type': 'ambience',
             'when': {'phase': 'afternoon', 'hour': 14.0},
             'data': {'reading': 'a wolf watched from the treeline'}},
        ],
        memory_beats={
            'afternoon': [{
                'line': 'the treeline left them watchful',
                'subject': None,
                'anchor': 0,
                'kind': 'felt',
            }],
        },
    )
    assert ('A wolf watched from the treeline.\n'
            '  The treeline left them watchful.') in user
    assert 'stirs in them' not in user


def test_an_unanchored_standing_feeling_finds_the_beat_about_its_subject():
    """A disposition that was not evoked still attaches by subject: a
    standing feeling about the land just crossed rides under the
    crossing's own line."""
    user = _prompt(
        events=[
            {'type': 'land', 'when': {'phase': 'morning', 'hour': 9.0},
             'where': {'place': 'talath_muil'},
             'data': {'subtype': 'crossing',
                      'reading': 'crossed into Talath Muil'}},
        ],
        memory_beats={
            'morning': [{
                'line': '(a standing feeling) Talath Muil — feared, '
                        'and hated for it',
                'subject': 'Talath Muil',
                'kind': 'disposition',
            }],
        },
    )
    assert ('Crossed into Talath Muil.\n'
            '  (a standing feeling) Talath Muil — feared, '
            'and hated for it') in user
    assert 'stirs in them' not in user


def test_a_stir_whose_anchor_made_no_beat_falls_back_to_the_phase():
    """An anchor pointing at an event that produced no beat (no reading)
    lands inside the day's last beat — the evocation is real, the moment
    just never rendered. It does not float and it does not vanish."""
    user = _prompt(
        events=[
            {'type': 'condition', 'when': {'phase': 'morning'},
             'data': {}},
            {'type': 'meal', 'when': {'phase': 'night', 'hour': 20.0},
             'data': {'reading': 'Supper by the fire: road-bread.'}},
        ],
        memory_beats={
            'morning': [{
                'line': '(a memory) the cold of last night',
                'subject': None,
                'anchor': 0,
                'kind': 'memory',
            }],
        },
    )
    supper = user.index('Supper by the fire')
    assert '(a memory) the cold of last night' in user[supper:]
    assert 'stirs in them' not in user


def test_a_stir_that_restates_its_own_beat_is_consumed():
    """A day line that only repeats the beat it would ride under is
    dropped — printing it twice is the failure, not the silence."""
    user = _prompt(
        events=[
            {'type': 'ambience',
             'when': {'phase': 'morning', 'hour': 9.0},
             'data': {'reading': 'the herd churned the waterhole mud'}},
        ],
        memory_beats={
            'morning': [{
                'line': 'the herd churned the waterhole mud',
                'subject': 'the waterhole',
                'anchor': 0,
                'kind': 'event',
            }],
        },
    )
    assert user.count('The herd churned the waterhole mud') == 1
    assert 'stirs in them' not in user


def test_two_memories_evoked_by_one_event_both_ride_under_it():
    user = _prompt(
        events=[
            {'type': 'land', 'when': {'phase': 'morning', 'hour': 9.0},
             'data': {'subtype': 'crossing',
                      'reading': 'crossed into Numeriador'}},
        ],
        memory_beats={
            'morning': [
                {'line': '(a memory, 4 days ago) crossed into Talath Muil',
                 'subject': 'Numeriador', 'anchor': 0, 'kind': 'memory'},
                {'line': '(a memory, yesterday) rain on the same stones',
                 'subject': 'Numeriador', 'anchor': 0, 'kind': 'memory'},
            ],
        },
    )
    assert ('Crossed into Numeriador.\n'
            '  (a memory, 4 days ago) crossed into Talath Muil.\n'
            '  (a memory, yesterday) rain on the same stones.') in user
    assert 'stirs in them' not in user
