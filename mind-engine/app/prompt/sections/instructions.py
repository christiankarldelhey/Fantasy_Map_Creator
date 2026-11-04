# ============================================================================
# Fixed instruction sections
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/prompt/sections/instructionsSection.js.
# ============================================================================

LAND_NOTES_RULES = "=== HOW TO USE THE LAND NOTES ===\nThe notes below are REFERENCE ONLY. Never copy their wording into the prose. Render them fresh in your own words. They tell you what is there, not how to say it. The day is laid out chronologically: the MORNING, AFTERNOON and NIGHT AT CAMP blocks each gather the terrain, weather, water and encounters that belong to that part of the day. Narrate them in that order."

ENCOUNTER_RULES = '=== ENCOUNTER RULES ===\nRender the given form, dialogue and outcome for each encounter. Do not invent a different form. Vary the beats across the chapter. The way an encounter resolves must differ from how recent encounters resolved.'

OVERNIGHT_COLOUR_NOTE = 'If the overnight location is a town or inn, let the narrative reflect this — a meal taken, a fire shared, a bed found. If it is a fortress or ruin, let it colour the night accordingly.'

SPANISH_INSTRUCTION = 'Please write the entire response in Spanish.'

# The day's opening: one element to build it around, one grammatical
# shape for the first sentence — the narrator's own scaffolding.
OPENING_FOCI = [
    'the sound of the place — what the traveller hears, not what he sees',
    'the light — how the day opens, turns, and closes',
    'the body of the traveller — weariness, breath, the weight of the pack',
    'a small object or detail on the road',
    'the silence or absence — what is not there, what the land withholds',
    'how the traveller wakes up, or what it takes for breakfast',
]

OPENING_STRATEGIES = [
    "the first sentence has the land, the weather or an object as its grammatical subject — the traveller enters the paragraph late, almost incidentally",
    'open with a sensation in the body — heat, an ache, thirst, cold stone underhand — before saying who feels it or where',
    'open with something already half-finished: an action caught at its end, its beginning left untold',
    'open with a short, concrete sentence of five words or fewer; let the second sentence widen the view',
    'open with what the traveller hears or smells before anything is seen',
    "open with a thought, a memory or a doubt in the traveller's head, and only then place the body on the road",
    'open with a change: something is different from yesterday, and the first line names that difference',
]


def _pick(arr, rng):
    return arr[int(rng() * len(arr))]


def pick_todays_way_in(rng):
    """Pick the narrative focus for the day's opening."""
    return _pick(OPENING_FOCI, rng)


def pick_opening_strategy(rng):
    """Pick the grammatical strategy for the chapter's first sentence."""
    return _pick(OPENING_STRATEGIES, rng)


def todays_way_in_section(focus, strategy, character_name=''):
    """The single element the chapter's opening must be built around, plus the
    grammatical shape of the first sentence."""
    if character_name:
        name_rule = f' Never open the chapter with "{character_name}" as the first word, and never open with {character_name} walking, advancing or setting out — the journey is already in motion; enter it sideways.'
    else:
        name_rule = " Never open the chapter with the traveller's name as the first word, and never open with the traveller walking, advancing or setting out."

    return (
        f"=== TODAY'S WAY IN ===\n"
        f"Build today's opening around ONE element: {focus}. Shape of the first sentence: {strategy}.{name_rule} "
        f"Do not inventory the scenery — enter through that one sense and let the rest stay in shadow."
    )


def road_intro(day_number):
    """Opening line of TODAY'S ROAD for an ordinary (non-terminal) day."""
    return f"Day {day_number}. Narrate a single day's journey in three movements: morning, afternoon, and the night at camp."
