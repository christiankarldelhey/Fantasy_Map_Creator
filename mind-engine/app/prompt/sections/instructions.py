# ============================================================================
# Fixed instruction sections
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/prompt/sections/instructionsSection.js.
# ============================================================================

LAND_NOTES_RULES = "=== HOW TO USE THE LAND NOTES ===\nThe notes below are REFERENCE ONLY. Never copy their wording into the prose. Render them fresh in your own words. They tell you what is there, not how to say it. The === TODAY === section lays the day out in the order it happened — each line a beat of the road; narrate it in that order. When a land is marked 'entered today', the crossing is a real moment of the day's journey — name the new land as the traveller comes under it and let the threshold be felt."

ENCOUNTER_RULES = '=== ENCOUNTER RULES ===\nRender the given form, dialogue and outcome for each encounter. Do not invent a different form. Vary the beats across the chapter. The way an encounter resolves must differ from how recent encounters resolved.'

SPANISH_INSTRUCTION = 'Please write the entire response in Spanish.'

def road_intro(day_number):
    """Opening line of === TODAY === for an ordinary (non-terminal) day."""
    return f"Day {day_number}. Narrate this single day's journey in the order it happened, dawn to night."


def chapter_rules_section(encounter_names, closing, has_recollection=False):
    """The contract the skeleton runs under — where encounters may land,
    that the named places are all that exist, and the day's closing
    instruction. The roster makes an omission checkable: a wolf attack
    the prose never reaches is a breach, not a style choice. `closing`
    arrives already chosen (rotated per day, or the terminal variant).
    `has_recollection` adds the memory-markers rule only when the day
    actually carries them."""
    names = [n for n in dict.fromkeys(encounter_names or []) if n]
    encounter_line = (
        'Encounters today happen where the timeline says — nowhere '
        f'else: {", ".join(names)}. Every one must land — none is '
        'skipped, whatever its form.'
        if names else
        'Encounters today: none — no one is met on the road.'
    )
    memory_line = (
        'Lines marked "(a memory…)" are recollection surfacing — let them '
        'colour the moment where they land as memory or comparison, '
        'never as events happening now.\n'
        if has_recollection else ''
    )
    return (
        "=== THE CHAPTER'S RULES ===\n"
        f"{encounter_line}\n"
        "Only the places named exist. The day begins where it says it "
        "begins and ends where it says it ends. Weather already told does "
        "not repeat unless it changes. The lines are the skeleton — "
        "narrate it in order, do not reorder it.\n"
        f"{memory_line}"
        f"{closing}\n\n"
    )
