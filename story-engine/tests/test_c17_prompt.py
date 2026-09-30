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


def _belief(statement, confidence=0.8):
    return SimpleNamespace(statement=statement, confidence=confidence)


def test_render_lens_has_no_banner_and_opens_with_today():
    block = render_lens(
        'Celebrian', {'dominant': 'heavy-hearted'}, [], [], needs=[]
    )
    assert 'THE MIND OF' not in block
    assert block.startswith('Celebrian today — mood: heavy-hearted.')


def test_render_lens_merges_impressions_and_readings_as_one_stirring():
    evoked = [_memory('three days of unbroken rain')]
    perceived = [
        {'type': 'weather', 'salience': 0.6, 'reading': 'the cold seeps'},
        {'type': 'encounter', 'salience': 0.5,
         'reading': 'a ranger asks the road north'},
        {'type': 'weather', 'salience': 0.1, 'reading': 'a faint drizzle'},
        {'type': 'need', 'salience': 0.9, 'reading': 'she is hungry'},
    ]
    block = render_lens(
        'Celebrian', {'dominant': 'weary'}, [], evoked, needs=[],
        perceived_day=perceived,
    )
    stir_i = block.index('Stirring today:')
    assert 'three days of unbroken rain' in block
    assert 'the cold seeps' in block
    assert 'a ranger asks the road north' in block
    # Below the salience floor — not stirred.
    assert 'a faint drizzle' not in block
    # Needs speak in the body's voice, never in the stirring list.
    assert 'she is hungry' not in block[stir_i:]
    # Impressions come before readings inside the merged list.
    assert block.index('three days of unbroken rain') < block.index('the cold seeps')


def test_render_lens_dedupes_a_reading_already_on_the_mind():
    evoked = [_memory('Day upon day of wet cold')]
    perceived = [
        {'type': 'weather', 'salience': 0.9,
         'reading': 'Day upon day of wet cold'},
    ]
    block = render_lens(
        'Aranath', {'dominant': 'neutral'}, [], evoked, needs=[],
        perceived_day=perceived,
    )
    assert block.count('Day upon day of wet cold') == 1


def test_render_lens_holds_beliefs_and_voices_needs():
    block = render_lens(
        'Aranath', {'dominant': 'steady'},
        [_belief('the old roads still answer'), _belief('a quieter one')],
        [], needs=[{'description': 'hunger gnaws'}],
    )
    assert 'What they hold true:' in block
    assert '- the old roads still answer' in block
    assert 'The body asks for:' in block
    assert '- hunger gnaws' in block


def test_render_lens_silent_needs_when_all_is_well():
    block = render_lens('Aranath', {'dominant': 'neutral'}, [], [], needs=[])
    assert 'body asks' not in block


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
