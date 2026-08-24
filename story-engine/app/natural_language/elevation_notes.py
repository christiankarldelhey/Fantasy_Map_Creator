# ============================================================================
# Elevation notes: the physical cost of the day's climbing
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/naturalLanguage/elevationNotes.js.
# ============================================================================
import random

from app.text import pick

# Above this much gain/loss in a day the climb is "hard" rather than "steady".
HEAVY_CHANGE_M = 300

ROLLING_PHRASES = [
    'The road rises and falls hard through the day — a gruelling march of ascent and descent that leaves the legs heavy by evening.',
    'Climb follows descent follows climb; the legs are never given peace.',
    'The way offers no level ground. Every hour is either up or down, and the body pays for it.',
]

HARD_ASCENT_PHRASES = [
    'The way climbs hard for much of the day — a long, taxing ascent that tests the lungs and legs.',
    'A relentless uphill march; the ground rises and does not level.',
    'The ascent is long and unforgiving — lungs labouring, pace reduced to a grind.',
]

HARD_DESCENT_PHRASES = [
    'The road descends steeply and at length — knees and balance are tested on rough, falling ground.',
    'A long downhill that punishes the joints as surely as any climb.',
    'The descent is steep and relentless; loose stone and the angle of the slope demand constant care.',
]

STEADY_ASCENT_PHRASES = [
    'The way rises through the day, a steady climb that makes the miles feel longer than they are.',
    'A gradual but persistent ascent runs through most of the day.',
    'The road trends upward all morning; by afternoon the altitude is felt in the step.',
]

STEADY_DESCENT_PHRASES = [
    'The road loses height through the day, a long descent that eases the pace but tires the joints.',
    'A steady descent through most of the march — easier on the lungs, harder on the knees.',
    'The way falls away gradually; the valley below grows closer with every hour.',
]

# Highest band first: the first threshold reached wins.
ALTITUDE_BANDS = [
    {
        'aboveM': 2000,
        'phrases': [
            'Two thousand metres above the lowlands — a height where few roads run and fewer travellers pass. The cold is punishing and the air thin enough to slow thought as well as foot.',
            'At this altitude the world below is lost in haze; the cold here is not weather but a permanent condition of the stone.',
            'Above two thousand metres: the peaks are no longer above but around. Survival demands attention to every step.',
        ],
    },
    {
        'aboveM': 1500,
        'phrases': [
            'Fifteen hundred metres and more: the lungs work harder, the cold bites deeper, and the sky feels closer than the earth.',
            'At this height clouds pass at eye level; the body labours for air it cannot quite find.',
            'The road climbs into the realm of snow and bare rock, where breath comes short and the cold is constant.',
        ],
    },
    {
        'aboveM': 1000,
        'phrases': [
            'The road at its highest runs above a thousand metres of open sky — the air noticeably thinner and the cold sharper.',
            'Above a thousand metres, the world opens wide below; the wind carries no warmth up here.',
            'The highest point of the day sits well above the tree-line; the air is clear and thin.',
        ],
    },
]


def _effort_phrases(gain, loss):
    """Pick the phrase set matching the day's gain/loss shape."""
    hard_gain = gain > HEAVY_CHANGE_M
    hard_loss = loss > HEAVY_CHANGE_M
    if hard_gain and hard_loss:
        return ROLLING_PHRASES
    if hard_gain:
        return HARD_ASCENT_PHRASES
    if hard_loss:
        return HARD_DESCENT_PHRASES
    return STEADY_ASCENT_PHRASES if gain > loss else STEADY_DESCENT_PHRASES


def _peak_elevation(profile):
    """Highest elevation sampled across the day, in metres."""
    return max(profile.get('dawn_m') or 0, profile.get('midday_m') or 0, profile.get('dusk_m') or 0)


def describe_elevation(profile, rng=random.random):
    """Describe the effort and altitude of the day's road, or None when flat."""
    if not profile:
        return None

    parts = []

    if profile.get('significant'):
        parts.append(pick(_effort_phrases(profile.get('total_gain_m', 0), profile.get('total_loss_m', 0)), rng))

    peak = _peak_elevation(profile)
    band = next((b for b in ALTITUDE_BANDS if peak >= b['aboveM']), None)
    if band:
        parts.append(pick(band['phrases'], rng))

    return ' '.join(parts) if parts else None
