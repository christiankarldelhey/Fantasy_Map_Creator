# ============================================================================
# C13 — the host sends facts/slugs, the pack owns every word
# ----------------------------------------------------------------------------
# previous_day arrives as raw names (never a composed sentence); meals as
# canonical slugs; a shelterless night as a scope marker. All rendering —
# including fallback words — lives in the NL pack.
# ============================================================================
from app.mind.nl_resolver import resolve_event_reading
from app.natural_language.meal_notes import describe_meal, meal_label
from app.prompt.sections.journey import journey_context_section


def test_previous_day_renders_from_raw_names():
    block = journey_context_section('Rivendell', previous_day={
        'day_number': 4,
        'regions': ['Mirkwood', 'The Brown Lands'],
        'locations': ['Rhosgobel'],
        'encounters': ['Wolf'],
    })
    assert 'In Chapter 4 (yesterday)' in block
    assert 'Mirkwood, The Brown Lands' in block
    assert 'Rhosgobel' in block
    assert 'Wolf' in block
    assert 'narrative continuity' in block


def test_previous_day_empty_lists_use_pack_words():
    block = journey_context_section('Rivendell', previous_day={
        'day_number': 2, 'regions': [], 'locations': [], 'encounters': [],
    })
    assert 'unknown lands' in block
    assert 'no major settlements' in block
    assert 'no major encounters' in block


def test_meal_slugs_render_display_names():
    # nl=None: code fallback still yields prose, never the slug.
    assert meal_label(None, 'tavern_meal') == 'a hot meal bought at the inn'
    assert meal_label(None, 'waterskin') == 'water from the skin'
    # Authored content passes through untouched.
    assert meal_label(None, 'a ration of road bread') == 'a ration of road bread'
    line = describe_meal(
        {'slot': 'evening', 'food': 'tavern_meal', 'drink': 'tavern_ale'}
    )
    assert 'a hot meal bought at the inn' in line
    assert 'ale and clean water' in line
    assert 'tavern_meal' not in line


def test_open_sky_rest_reading():
    reading = resolve_event_reading(
        None, 'middle_earth',
        {'type': 'rest',
         'data': {'rest_quality': 1, 'place': None, 'description': None,
                  'scope': 'hardcoded_fallback'}},
    )
    assert reading is not None
    assert 'open sky' in reading
