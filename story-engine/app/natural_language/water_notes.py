# ============================================================================
# Water crossings: rivers bridged, streams forded
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/naturalLanguage/waterNotes.js.
# ============================================================================
import random

from app.day_phases import time_of_day_phrase
from app.text import capitalize, description_suffix, pick

# Generic names carry no colour, so they are treated as unnamed water.
GENERIC_WATER_NAMES = {'river', 'stream'}

# Odds that a stream is spanned by a rough plank bridge instead of forded.
PLANK_BRIDGE_CHANCE = 0.3


def _bridge_variants(named, when):
    subject = named or 'A river'
    river = named or 'a river'
    return [
        f'{subject} is crossed by a stone bridge {when}.',
        f'A bridge carries the road over {river} {when}.',
        f'{capitalize(river)} runs swift beneath a wooden bridge, crossed {when}.',
    ]


def _plank_variants(named, when):
    stream = named or 'a stream'
    return [
        f'A rough plank bridge spans {stream} {when}.',
        f'A low timber crossing takes the road over {stream} {when}.',
    ]


def _ford_variants(named, when):
    subject = named or 'A stream'
    stream = named or 'a stream'
    return [
        f'{subject} is forded {when} — the water cold and quick underfoot.',
        f'A shallow crossing of {stream} {when}; the stones slippery beneath.',
        f'{capitalize(stream)} must be waded {when}, the current pulling at the ankles.',
    ]


def _distinctive_name(name):
    """The crossing's own name, or None when it is generic/absent."""
    if not name:
        return None
    return None if name.lower() in GENERIC_WATER_NAMES else name


def _describe_crossing(crossing, rng):
    when = time_of_day_phrase(crossing.get('hour_float'))
    named = _distinctive_name(crossing.get('name'))

    if crossing.get('crossing_type') == 'bridge':
        variants = _bridge_variants(named, when)
    else:
        variants = _plank_variants(named, when) if rng() < PLANK_BRIDGE_CHANCE else _ford_variants(named, when)

    return f"- {pick(variants, rng)}{description_suffix(crossing.get('description'))}"


def describe_water_crossings(crossings, rng=random.random):
    """Describe the rivers and streams crossed during the day."""
    if not isinstance(crossings, list) or len(crossings) == 0:
        return None
    return '\n'.join(_describe_crossing(c, rng) for c in crossings)


def _lake_variants(named, when):
    water = named or 'a lake'
    subject = named or 'A lake'
    return [
        f'{subject} is sighted off the road {when}, still and grey as slate.',
        f'The road passes near {water} {when}, its shore quiet and reedy.',
        f'A glint of water through the trees: {water} lies close by {when}.',
    ]


def _shore_refill_variants(named, when):
    water = named or 'the lake'
    return [
        f'At {water} the waterskin is refilled {when}.',
        f'{capitalize(water)} provides clear water and the flask is topped up {when}.',
    ]


def _describe_source(source, rng, refilled=False):
    when = time_of_day_phrase(source.get('hour_float'))
    named = _distinctive_name(source.get('name'))
    variants = _shore_refill_variants(named, when) if refilled else _lake_variants(named, when)
    return f"- {pick(variants, rng)}{description_suffix(source.get('description'))}"


def describe_water_sources(sources, rng=random.random, refilled=False):
    """Describe lakes or shores that are close enough to matter."""
    if not isinstance(sources, list) or len(sources) == 0:
        return None
    return '\n'.join(_describe_source(s, rng, refilled) for s in sources)
