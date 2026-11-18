# ============================================================================
# Fixed instruction sections
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/prompt/sections/instructionsSection.js.
# ============================================================================

LAND_NOTES_RULES = "=== HOW TO USE THE LAND NOTES ===\nThe notes below are REFERENCE ONLY. Never copy their wording into the prose. Render them fresh in your own words. They tell you what is there, not how to say it. The === TODAY === section lays the day out in the order it happened — each line a beat of the road; narrate it in that order. When a land is marked 'entered today', the crossing is a real moment of the day's journey — name the new land as the traveller comes under it and let the threshold be felt."

ENCOUNTER_RULES = '=== ENCOUNTER RULES ===\nRender the given form, dialogue and outcome for each encounter. Do not invent a different form. Vary the beats across the chapter. The way an encounter resolves must differ from how recent encounters resolved.'

OVERNIGHT_COLOUR_NOTE = 'If the overnight location is a town or inn, let the narrative reflect this — a meal taken, a fire shared, a bed found. If it is a fortress or ruin, let it colour the night accordingly.'

SPANISH_INSTRUCTION = 'Please write the entire response in Spanish.'

def road_intro(day_number):
    """Opening line of === TODAY === for an ordinary (non-terminal) day."""
    return f"Day {day_number}. Narrate this single day's journey in the order it happened, dawn to night."
