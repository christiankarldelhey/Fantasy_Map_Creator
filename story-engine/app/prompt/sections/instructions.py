# ============================================================================
# Fixed instruction sections
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/prompt/sections/instructionsSection.js.
# ============================================================================

LAND_NOTES_RULES = "=== HOW TO USE THE LAND NOTES ===\nThe notes below are REFERENCE ONLY. Never copy their wording into the prose. Render them fresh in your own words. They tell you what is there, not how to say it. The day is laid out chronologically: the MORNING, AFTERNOON and NIGHT AT CAMP blocks each gather the terrain, weather, water and encounters that belong to that part of the day. Narrate them in that order."

ENCOUNTER_RULES = '=== ENCOUNTER RULES ===\nRender the given form, dialogue and outcome for each encounter. Do not invent a different form. Vary the beats across the chapter. The way an encounter resolves must differ from how recent encounters resolved.'

OVERNIGHT_COLOUR_NOTE = 'If the overnight location is a town or inn, let the narrative reflect this — a meal taken, a fire shared, a bed found. If it is a fortress or ruin, let it colour the night accordingly.'

SPANISH_INSTRUCTION = 'Please write the entire response in Spanish.'


def todays_way_in_section(focus, strategy, character_name='', previous_openings=None):
    """The single element the chapter's opening must be built around, plus the
    grammatical shape of the first sentence and the openings already spent."""
    previous_openings = previous_openings or []

    if character_name:
        name_rule = f' Never open the chapter with "{character_name}" as the first word, and never open with {character_name} walking, advancing or setting out — the journey is already in motion; enter it sideways.'
    else:
        name_rule = " Never open the chapter with the traveller's name as the first word, and never open with the traveller walking, advancing or setting out."

    if previous_openings:
        openings_lines = '\n'.join(f'- "{s}"' for s in previous_openings)
        openings_block = f"\nEarlier chapters opened with these sentences — today's first sentence must differ from ALL of them in structure, subject and rhythm:\n{openings_lines}"
    else:
        openings_block = ''

    return (
        f"=== TODAY'S WAY IN ===\n"
        f"Build today's opening around ONE element: {focus}. Shape of the first sentence: {strategy}.{name_rule} "
        f"Do not inventory the scenery — enter through that one sense and let the rest stay in shadow.{openings_block}"
    )


def road_intro(day_number):
    """Opening line of TODAY'S ROAD for an ordinary (non-terminal) day."""
    return f"Day {day_number}. Narrate a single day's journey in three movements: morning, afternoon, and the night at camp."
