# ============================================================================
# C17 — a cleaner prompt: the mind inside the lens, no anti-repetition filler
# ----------------------------------------------------------------------------
# '=== THE MIND OF X ===' and 'What today stirs in their mind' are gone as
# standalone blocks — the mind's current state is fused inside NARRATOR'S
# LENS alongside the authored personality. The banned-phrase feature and
# the 'Earlier chapters opened with these sentences' context are removed
# entirely: the narrator's context stays clean.
# ============================================================================
from types import SimpleNamespace

from app.mind.lens import brief_beats, render_lens
from app.prompt.builder import build_day_prompt
from app.prompt.sections.character import (
    mind_today_section, narrator_lens_section)


def _memory(desc):
    return SimpleNamespace(desc=desc)


def test_lens_section_is_the_static_personality_alone():
    """The lens rides the system prompt now — the authored personality,
    stable across days. The mind's volatile state gets its own block."""
    section = narrator_lens_section(
        {'name': 'Celebrian', 'system_prompt': 'She speaks little.'},
    )
    assert section.startswith("=== NARRATOR'S LENS FOR CELEBRIAN ===")
    assert 'She speaks little.' in section


def test_mind_today_carries_the_state_under_its_own_title():
    section = mind_today_section(
        'Aranath today.\nWhat they carry into this Episode:\n- a cold',
        {'name': 'Aranath'})
    assert section.startswith('=== ARANATH TODAY ===')
    # The block's 'X today.' opener is the title restated — dropped.
    assert 'Aranath today.' not in section
    assert 'a cold' in section


def test_mind_today_keeps_blocks_that_dont_open_with_the_title():
    section = mind_today_section(
        'What they carry into this Episode:\n- a cold',
        {'name': 'Aranath'})
    assert 'What they carry' in section


def test_lens_section_empty_without_personality():
    assert narrator_lens_section({'name': 'Aranath'}) == ''


def test_prompt_has_no_anti_repetition_context():
    prompt = build_day_prompt(
        day={'day_number': 5, 'date': '1950-01-19'},
        character={'name': 'Aranath'},
    )
    user = prompt['user']
    assert 'AVOID THESE PHRASES' not in user
    assert 'Earlier chapters opened' not in user
    assert "TODAY'S WAY IN" not in user


def test_prompt_places_mind_state_in_user_before_the_road():
    prompt = build_day_prompt(
        day={'day_number': 1, 'date': '1950-01-19'},
        character={'name': 'Celebrian', 'system_prompt': 'She speaks little.'},
        mind_block="Celebrian today.\nStirring today:\n- a ranger's question",
    )
    user = prompt['user']
    mind_i = user.index('=== CELEBRIAN TODAY ===')
    road_i = user.index('=== TODAY ===')
    assert mind_i < road_i
    assert 'THE MIND OF' not in user


def test_standing_material_rides_the_system_prompt():
    """Header, authored lens and chapter boilerplate are stable across
    days — they live in system; user is the day alone."""
    prompt = build_day_prompt(
        day={'day_number': 1, 'date': '1950-01-19'},
        character={'name': 'Aranath', 'system_prompt': 'Watch the wind.'},
    )
    system, user = prompt['system'], prompt['user']
    assert '=== ARANATH ===' in system
    assert "NARRATOR'S LENS FOR ARANATH" in system
    assert 'Watch the wind.' in system
    assert 'HOW TO USE THE LAND NOTES' in system
    assert 'ENCOUNTER RULES' in system
    assert '=== TODAY ===' in user
    for boilerplate in (
            "NARRATOR'S LENS", 'HOW TO USE THE LAND NOTES',
            'ENCOUNTER RULES'):
        assert boilerplate not in user

def test_render_lens_has_no_banner_and_opens_with_today():
    block = render_lens('Celebrian', {'focus': None, 'carried': [], 'day': []})
    assert 'THE MIND OF' not in block
    assert block.startswith('Celebrian today.')


def test_render_lens_lists_nothing_that_floats():
    # The carry-list is dead: a listed memory or need never lands in the
    # telling — what they carry speaks inside the day's events or stays
    # silent. The Lens keeps only the entering mood and the centre.
    brief = {
        'focus': {'kind': 'event', 'part': 'day', 'phase': 'afternoon',
                  'text': 'orc boots, a pursuit gait'},
        'carried': [
            {'kind': 'need', 'text': 'the belly wonders — 2 days without a proper meal'},
            {'kind': 'memory', 'text': 'the common-room at the Pony'},
        ],
        'day': [{'kind': 'belief', 'part': 'day', 'phase': 'afternoon',
                 'text': 'After danger passes, gratitude is the sharpest feeling.'}],
    }
    block = render_lens('Aranath', brief)
    assert 'What they carry' not in block
    assert 'the common-room at the Pony' not in block
    assert 'the belly wonders' not in block
    assert 'orc' not in block
    assert 'gratitude' not in block


def test_render_lens_quiet_episode_says_so():
    block = render_lens('Aranath', {'focus': None, 'carried': [], 'day': []})
    assert 'quiet stretch' in block


def test_ambience_event_reading_lands_in_the_timeline():
    """A resolved ambient situation is an 'ambience' event (#158); its
    reading must reach the narrator, at the day's position it belongs
    to (ADR-0019)."""
    prompt = build_day_prompt(
        day={'day_number': 3, 'date': '1950-01-19'},
        character={'name': 'Aranath'},
        events=[
            {'type': 'ambience', 'when': {'phase': 'afternoon', 'hour': 15},
             'data': {'reading': 'a stump, huge and rotten, two leagues from the nearest tree'}},
            {'type': 'rest', 'when': {'phase': 'night'},
             'data': {'reading': 'a hedge for a windbreak'}},
        ],
    )
    user = prompt['user']
    today = user.index('=== TODAY ===')
    assert today < user.index('A stump, huge and rotten') < user.index('A hedge for a windbreak')


def test_land_events_reach_the_timeline_in_order():
    """Land-contact events ride the wire under the 'land' umbrella keyed
    by data.subtype (toEvents.js): place sightings and pass-throughs,
    terrain phrases, water crossings and region entries all carry the
    prose the narrator lays out — the day's whole spatial skeleton, in
    the order the road met it."""
    prompt = build_day_prompt(
        day={'day_number': 4, 'date': '1950-01-19'},
        character={'name': 'Aranath'},
        events=[
            {'type': 'land', 'when': {'phase': 'morning'},
             'data': {'subtype': 'place',
                      'reading': 'a village: sighted far off to the east'}},
            {'type': 'land', 'when': {'phase': 'morning'},
             'data': {'subtype': 'terrain',
                      'reading': 'the chalk lies open to the sky'}},
            {'type': 'land', 'when': {'phase': 'afternoon'},
             'data': {'subtype': 'water',
                      'reading': 'a ford of brown water'}},
            {'type': 'land', 'when': {'phase': 'afternoon'},
             'data': {'subtype': 'region', 'reading': 'crossed into Bree'}},
        ],
    )
    user = prompt['user']
    assert '=== TODAY ===' in user
    assert user.index('The chalk lies open to the sky') < user.index('A ford of brown water')
    assert user.index('A ford of brown water') < user.index('Crossed into Bree')
    assert 'A village: sighted far off to the east.' in user


def test_brief_beats_twin_memory_rows_attach_once():
    desc = 'Dwarves of Erebor — news of the eastern road'
    brief = {'focus': None, 'day': [], 'carried': [
        {'kind': 'memory', 'text': desc, 'age': '(a memory, yesterday) '},
        {'kind': 'memory', 'text': desc, 'age': '(a memory, yesterday) '},
    ]}
    carried = brief_beats(brief, {}, None)['carried']
    assert len([b for b in carried if 'Dwarves of Erebor' in b['line']]) == 1
