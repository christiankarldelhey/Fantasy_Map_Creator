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

from app.mind.lens import render_lens
from app.prompt.builder import build_day_prompt
from app.prompt.sections.character import narrator_lens_section


def _memory(desc):
    return SimpleNamespace(desc=desc)


def test_lens_section_fuses_personality_and_mind():
    section = narrator_lens_section(
        {'name': 'Celebrian', 'system_prompt': 'She speaks little.'},
        'Celebrian today — mood: grave.',
    )
    assert section.startswith("=== NARRATOR'S LENS FOR CELEBRIAN ===")
    assert 'She speaks little.' in section
    assert 'Celebrian today — mood: grave.' in section
    # Personality first, the day's state right after — one block.
    assert section.index('She speaks little.') < section.index('Celebrian today')


def test_lens_section_holds_the_mind_alone_for_unauthored_clones():
    section = narrator_lens_section(
        {'name': 'Aranath'}, 'Aranath today — mood: steady.'
    )
    assert "NARRATOR'S LENS FOR ARANATH" in section
    assert 'Aranath today — mood: steady.' in section


def test_lens_section_empty_without_either():
    assert narrator_lens_section({'name': 'Aranath'}) == ''


def test_prompt_has_no_anti_repetition_context():
    prompt = build_day_prompt(
        day={'day_number': 5, 'date': '1950-01-19'},
        character={'name': 'Aranath'},
    )
    user = prompt['user']
    assert 'AVOID THESE PHRASES' not in user
    assert 'Earlier chapters opened' not in user
    assert "TODAY'S WAY IN" in user


def test_prompt_places_mind_inside_the_lens_before_the_road():
    prompt = build_day_prompt(
        day={'day_number': 1, 'date': '1950-01-19'},
        character={'name': 'Celebrian', 'system_prompt': 'She speaks little.'},
        mind_block="Celebrian today — mood: grave.\nStirring today:\n- a ranger's question",
    )
    user = prompt['user']
    lens_i = user.index("NARRATOR'S LENS FOR CELEBRIAN")
    mind_i = user.index('Celebrian today — mood: grave.')
    road_i = user.index("TODAY'S ROAD")
    assert lens_i < mind_i < road_i
    assert 'THE MIND OF' not in user

def test_render_lens_has_no_banner_and_opens_with_today():
    block = render_lens('Celebrian', {'focus': None, 'carried': [], 'day': []})
    assert 'THE MIND OF' not in block
    assert block.startswith('Celebrian today.')


def test_render_lens_speaks_only_what_is_carried_in():
    # A day line (the orcs of the afternoon) never renders in the Lens —
    # it waits for its phase block; the Lens holds what is carried in.
    brief = {
        'focus': {'kind': 'event', 'part': 'day', 'phase': 'afternoon',
                  'text': 'orc boots, a pursuit gait'},
        'carried': [{'kind': 'need', 'text': 'the belly wonders — 2 days without a proper meal'}],
        'day': [{'kind': 'belief', 'part': 'day', 'phase': 'afternoon',
                 'text': 'After danger passes, gratitude is the sharpest feeling.'}],
    }
    block = render_lens('Aranath', brief)
    assert 'What they carry into this Episode:' in block
    assert 'the belly wonders — 2 days without a proper meal' in block
    assert 'orc' not in block
    assert 'gratitude' not in block


def test_render_lens_quiet_episode_says_so():
    block = render_lens('Aranath', {'focus': None, 'carried': [], 'day': []})
    assert 'quiet stretch' in block


def test_render_lens_twin_memory_rows_read_once():
    desc = 'Dwarves of Erebor — news of the eastern road'
    brief = {'focus': None, 'day': [], 'carried': [
        {'kind': 'memory', 'text': desc, 'age': 'Yesterday — '},
        {'kind': 'memory', 'text': desc, 'age': 'Yesterday — '},
    ]}
    assert render_lens('Aranath', brief).count('Dwarves of Erebor') == 1
