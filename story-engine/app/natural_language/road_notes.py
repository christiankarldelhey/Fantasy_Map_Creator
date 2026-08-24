# ============================================================================
# Road notes: what the traveller treads on, and for how far
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/naturalLanguage/roadNotes.js.
# ============================================================================
import random

from app.natural_language.terrain_phrases import pick_phrase_for_regions
from app.text import region_names_of

ROAD_PHRASES = {
    'road_major': 'well-kept royal roads',
    'road': 'made roads',
    'trail': 'rough trails and paths',
    'off_road': 'open country, cross-country',
}

# Only these road types have regional variants worth looking up.
REGIONAL_ROAD_TYPES = {'road', 'trail'}


def collect_road_notes(road_types, regions=None, terrain_phrases=None, rng=random.random):
    """Bullet-ready road notes, e.g. "- road: made roads (12.5 km)"."""
    regions = regions or []
    terrain_phrases = terrain_phrases or {}
    region_names = region_names_of(regions)

    notes = []
    for type_, km in (road_types or {}).items():
        if not km or km <= 0:
            continue
        regional = pick_phrase_for_regions(terrain_phrases, region_names, type_, rng) if type_ in REGIONAL_ROAD_TYPES else None
        phrase = regional or ROAD_PHRASES.get(type_, type_)
        notes.append(f'- {type_}: {phrase} ({km:.1f} km)')
    return notes
