# ============================================================================
# Today's way in
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/naturalLanguage/openingFocus.js.
# ============================================================================
import random

from app.text import pick

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


def pick_todays_way_in(rng=random.random):
    """Pick the narrative focus for the day's opening."""
    return pick(OPENING_FOCI, rng)


def pick_opening_strategy(rng=random.random):
    """Pick the grammatical strategy for the chapter's first sentence."""
    return pick(OPENING_STRATEGIES, rng)
