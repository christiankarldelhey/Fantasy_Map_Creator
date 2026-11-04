# ============================================================================
# C13 — the host sends facts/slugs, prose and tags arrive declared
# ----------------------------------------------------------------------------
# previous_day arrives as raw names (never a composed sentence) and the
# structural fallback joins them plainly; a rest night without a declared
# reading falls back to the place's own words. World voice (#52/#53):
# the host verbalizes — the engine lays out, it never phrases the world.
# ============================================================================
from app.mind.voice import resolve_event_reading
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


def test_declared_reading_wins_verbatim():
    # #53: the world says what it was — the mind consumes the line as-is.
    reading = resolve_event_reading(
        {'type': 'meal',
         'data': {'reading': 'a hot meal bought at the inn and ale',
                  'food': 'tavern_meal', 'drink': 'tavern_ale'}},
    )
    assert reading == 'a hot meal bought at the inn and ale'


def test_open_sky_rest_reading_comes_declared():
    # The shelterless night reads through data.reading, declared by the
    # host (toEvents' REST_OPEN_SKY) — the engine adds no words of its own.
    reading = resolve_event_reading(
        {'type': 'rest',
         'data': {'rest_quality': 1, 'place': None, 'description': None,
                  'scope': 'hardcoded_fallback',
                  'reading': 'The night is spent under open sky.'}},
    )
    assert 'open sky' in reading


def test_rest_falls_back_to_the_place_words():
    reading = resolve_event_reading(
        {'type': 'rest',
         'data': {'place': 'the Prancing Pony'}},
    )
    assert reading == 'the Prancing Pony'
