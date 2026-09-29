# ============================================================================
# C10 — story-engine owns every data→language translation
# ----------------------------------------------------------------------------
# The host ships raw state; the NL pack renders the condition, equipage
# and end-state sections. Numbers never reach the prompt. On the mind
# path the lens owns the body's voice — TRAVELLER'S CONDITION is skipped.
# ============================================================================
from app.prompt.builder import build_day_prompt
from app.prompt.sections.state_blocks import (
    condition_section,
    end_state_section,
    equipment_section,
)


def test_condition_renders_bands_without_numbers():
    block = condition_section(
        {'energy': 30, 'shadow': 55, 'wounded': 'wounded',
         'recentNotes': ['a fight with wolves']},
        'Aranath',
    )
    assert "TRAVELLER'S CONDITION" in block
    assert 'worn down' in block
    assert 'A shadow has gathered' in block
    assert 'nurses a wound' in block
    assert 'owes to a fight with wolves' in block
    assert not any(ch.isdigit() for ch in block)


def test_condition_silent_when_the_body_is_fine():
    assert condition_section(
        {'energy': 90, 'shadow': 5, 'wounded': 'none'}, 'Aranath'
    ) == ''


def test_equipage_renders_raw_supplies():
    block = equipment_section({
        'rations': 1, 'waterHeld': 0, 'waterCapacity': 1,
        'daysWithoutFood': 3, 'coins': 3, 'turnedAway': True,
        'meanTemperature': -5, 'coldShift': 0,
        'notableItems': ['a grey elven cloak'],
    })
    assert '=== EQUIPAGE ===' in block
    assert 'turned away' in block
    assert 'poorly clad' in block
    assert 'grey elven cloak' in block
    assert 'satchel is nearly empty' in block
    assert 'waterskin is empty' in block
    assert 'no decent meal in days' in block
    assert 'few coins' in block
    assert not any(ch.isdigit() for ch in block)


def test_equipage_silent_when_nothing_hinders():
    assert equipment_section(
        {'rations': 5, 'coins': 100, 'waterCapacity': 0}
    ) == ''


def test_end_state_only_speaks_for_the_dead():
    assert end_state_section('living', 'Aranath') == ''
    block = end_state_section('dead_shadow', 'Aranath')
    assert 'FINAL CHAPTER' in block
    assert 'shadow' in block and 'Aranath' in block


def test_prompt_renders_state_on_the_stateless_path():
    prompt = build_day_prompt(
        day={'day_number': 1, 'date': '1950-01-19'},
        character={'name': 'Aranath'},
        character_state={'energy': 20, 'shadow': 0},
        equipment_state={'rations': 1},
    )
    user = prompt['user']
    assert "TRAVELLER'S CONDITION" in user
    assert 'EQUIPAGE' in user


def test_mind_path_drops_the_condition_section():
    """The lens voices the body — rendering the condition block too would
    say the same thing twice in two registers."""
    prompt = build_day_prompt(
        day={'day_number': 1, 'date': '1950-01-19'},
        character={'name': 'Aranath'},
        character_state={'energy': 20, 'shadow': 0},
        equipment_state={'rations': 1},
        mind_block='=== THE MIND OF ARANATH ===\nMood: troubled',
    )
    user = prompt['user']
    assert "TRAVELLER'S CONDITION" not in user
    assert 'THE MIND OF ARANATH' in user
    assert 'EQUIPAGE' in user  # supplies are facts, not interiority
