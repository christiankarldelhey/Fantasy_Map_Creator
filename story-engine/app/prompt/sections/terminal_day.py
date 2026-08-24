# ============================================================================
# Terminal day sections (the character dies in this chapter)
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/prompt/sections/terminalDaySection.js.
# ============================================================================


def terminal_notice_section(character_name):
    """Warning that the NIGHT AT CAMP block must be ignored."""
    return f"=== FINAL DAY STRUCTURE ===\nBecause this is the final day, this chapter ends with {character_name}'s death. Ignore the NIGHT AT CAMP block below. The narrative must stop at the moment of death; do not continue to overnight camp.\n\n"


def terminal_road_intro(day_number, character_name):
    """Opening line of TODAY'S ROAD for a terminal day."""
    return f'Day {day_number}. This is the final day. {character_name} dies in this chapter. Narrate the morning and afternoon, then describe the death explicitly. Do not narrate a night at camp.'


def terminal_closing_instruction(character_name):
    """Closing instruction for a terminal day, replacing the rotating variant."""
    return f'This is the final chapter. {character_name} dies in this chapter. Narrate the death explicitly and end the story there. Do not describe a night at camp.'
