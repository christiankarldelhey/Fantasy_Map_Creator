# ============================================================================
# Terminal day sections (the character dies in this chapter)
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/prompt/sections/terminalDaySection.js.
# ============================================================================


def terminal_notice_section(character_name):
    """Warning that the day's timeline must stop at the death."""
    return f"=== FINAL DAY STRUCTURE ===\nBecause this is the final day, this chapter ends with {character_name}'s death. The timeline's night is not narrated. The narrative must stop at the moment of death; do not continue to overnight rest.\n\n"


def terminal_road_intro(day_number, character_name):
    """Opening line of === TODAY === for a terminal day."""
    return f'Day {day_number}. This is the final day. {character_name} dies in this chapter. Narrate the morning and afternoon, then describe the death explicitly. Do not narrate a night at camp.'


def terminal_closing_instruction(character_name):
    """Closing instruction for a terminal day, replacing the rotating variant."""
    return f'This is the final chapter. {character_name} dies in this chapter. Narrate the death explicitly and end the story there. Do not describe a night at camp.'


# === THE END === — the fate's own last word (was narration_notes'
# end_state): `fate` arrives on the wire already; the per-fate wording
# lives here, with the rest of the terminal-day voice.
_END_STATES = {
    'slain': (
        '=== THE END ===\nThis is the FINAL CHAPTER. {name} dies here. '
        'Narrate the moment of death explicitly in the final movement. '
        'Do not end the chapter with {name} still alive. The journey '
        "ends here.\n\n=== MANDATORY ENDING ===\nYou must describe "
        "{name}'s actual death. Do not transition to a night at camp; "
        'the story stops at the moment {name} falls.'
    ),
    'dead_exhaustion': (
        '=== THE END ===\nThis is the FINAL CHAPTER. Exhaustion finally '
        'claims {name}, who dies here. Narrate the collapse and final '
        'moments explicitly in the final movement. Do not end the '
        "chapter with {name} still alive. The journey ends here.\n\n"
        "=== MANDATORY ENDING ===\nYou must describe {name}'s death "
        'from exhaustion. Do not transition to a night at camp; the '
        "story stops at {name}'s final collapse."
    ),
    'dead_shadow': (
        '=== THE END ===\nThis is the FINAL CHAPTER. The shadow finally '
        'consumes {name}; {name} dies or is fully corrupted. Narrate '
        'the corruption taking hold and the final end explicitly in '
        'the final movement. Do not end the chapter with {name} merely '
        'threatened or alive. The journey ends in darkness.\n\n'
        '=== MANDATORY ENDING ===\nYou must describe the exact moment '
        'the shadow consumes {name}. Do not transition to a night at '
        'camp; the story stops at that moment.'
    ),
}


def end_state_section(fate, character_name):
    """The fate-specific final instruction, or '' when the day is not
    terminal. `fate` rides the wire itself — the host stops shipping
    this prose."""
    if not fate or fate == 'living':
        return ''
    text = _END_STATES.get(fate)
    return f'{text.format(name=character_name)}\n\n' if text else ''
