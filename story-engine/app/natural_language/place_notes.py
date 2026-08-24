# ============================================================================
# Place notes: lands crossed, settlements passed, and the overnight camp
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/naturalLanguage/placeNotes.js.
# ============================================================================
from app.day_phases import time_of_day_phrase
from app.text import description_suffix, readable_type

# Beyond this distance the traveller only sees the place on the horizon.
DISTANT_SIGHTING_KM = 1

PROXIMITY_THROUGH = 'passes through'
PROXIMITY_CLOSE = 'passed close by'
PROXIMITY_DISTANT = 'passed at some distance'


def _proximity_phrase(distance_km):
    """How the traveller met this place, from its distance to the road."""
    if distance_km == 0:
        return PROXIMITY_THROUGH
    if distance_km is not None and distance_km > DISTANT_SIGHTING_KM:
        return PROXIMITY_DISTANT
    return PROXIMITY_CLOSE


def describe_regions(regions):
    """The lands crossed in order, each with its character (description_summary)."""
    if not isinstance(regions, list) or len(regions) == 0:
        return 'The day passes through unnamed country.'

    lines = []
    for region in regions:
        name = region if isinstance(region, str) else region.get('name')
        summary = None if isinstance(region, str) else region.get('description_summary')
        if summary and summary.strip():
            lines.append(f'- {name}: {summary.strip()}')
        else:
            lines.append(f'- {name}')
    return '\n'.join(lines)


def collect_location_notes(locations):
    """Bullet-ready notes on the settlements and landmarks along the day's road."""
    if not isinstance(locations, list) or len(locations) == 0:
        return ['- No settlements or landmarks of note.']

    notes = []
    for l in locations:
        kind = f" ({readable_type(l.get('type'))})" if l.get('type') else ''
        proximity = _proximity_phrase(l.get('distance_km'))
        when = time_of_day_phrase(l.get('hour_float'))
        notes.append(f"- {l.get('name')}{kind}: {proximity}, {when}.{description_suffix(l.get('description'))}")
    return notes


def _shelter_phrase(location):
    """The shelter (or lack of it) the location offers for the night."""
    if location.get('indoor'):
        return f"There is likely a tavern, inn or hall where {location.get('name')} offers shelter and warmth for the night."
    return 'The character may shelter within its walls or in its shadow for the night.'


NO_SHELTER_NOTE = "No shelter of note lies near the day's end. The night is spent under open sky, with whatever cover the land affords."


def describe_overnight_location(location, interaction=None):
    """Describe where the character spends the night, plus any reference
    material from the resolved places_interactions row."""
    text = NO_SHELTER_NOTE

    if location:
        kind = readable_type(location.get('type')) if location.get('type') else 'place'
        description = location.get('description')
        first_sentence = f" {description.strip().split('.')[0]}." if description and description.strip() else ''
        text = f"Before nightfall, the road reaches {location.get('name')} ({kind}), {location.get('distance_km')} km from the day's end.{first_sentence} {_shelter_phrase(location)}"

    if interaction and interaction.get('description'):
        title = f"Title: {interaction['title']}\n" if interaction.get('title') else ''
        text += f"\n\nOvernight reference material (render fresh — never copy the wording):\n{title}{interaction['description']}"

    return text
