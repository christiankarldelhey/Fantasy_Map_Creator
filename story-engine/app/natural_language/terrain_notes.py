# ============================================================================
# Terrain notes: biomes and altitude layers crossed
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/naturalLanguage/terrainNotes.js.
# ============================================================================
import random

from app.day_phases import time_of_day_phrase
from app.natural_language.terrain_phrases import pick_phrase_for_regions
from app.text import region_names_of

BIOME_PHRASES = {
    'forest': 'woodland',
    'marsh': 'marshes and wet ground',
    'desert': 'barren, arid waste',
    'plain': 'open grasslands',
}

ALTITUDE_PHRASES = {
    'hills': 'rolling hills',
    'mountains_low': 'the lower mountain slopes',
    'mountains_med': 'high mountain country',
    'mountains_high': 'the high peaks',
}

# A biome patch below this area is described as "small".
SMALL_PATCH_KM2 = 10


def _terrain_phrase(terrain_phrases, region_names, key, fallbacks, rng):
    """Regional phrase for a terrain key, falling back to the generic one."""
    return (
        pick_phrase_for_regions(terrain_phrases, region_names, key, rng)
        or fallbacks.get(key)
        or key
    )


def _biome_facts(biome):
    """Normalise a biome entry (string or dict) into the fields the note needs."""
    if isinstance(biome, str):
        return {'type': biome, 'totalAreaKm2': None, 'hourFloat': None}
    return {
        'type': biome.get('type'),
        'totalAreaKm2': biome.get('total_area_km2'),
        'hourFloat': biome.get('hour_float'),
    }


def collect_terrain_notes(biomes, altitude, regions=None, terrain_phrases=None, rng=random.random):
    """Bullet-ready terrain notes, e.g. "- forest (in the mid-morning): woodland"."""
    regions = regions or []
    terrain_phrases = terrain_phrases or {}
    region_names = region_names_of(regions)
    notes = []

    for biome in [b for b in (biomes or []) if b]:
        facts = _biome_facts(biome)
        type_, total_area_km2, hour_float = facts['type'], facts['totalAreaKm2'], facts['hourFloat']
        prefix = 'small ' if total_area_km2 is not None and total_area_km2 < SMALL_PATCH_KM2 else ''
        when = f' ({time_of_day_phrase(hour_float)})' if hour_float is not None else ''
        phrase = _terrain_phrase(terrain_phrases, region_names, type_, BIOME_PHRASES, rng)
        notes.append(f'- {prefix}{type_}{when}: {phrase}')

    for layer in [layer for layer in (altitude or []) if layer]:
        phrase = _terrain_phrase(terrain_phrases, region_names, layer, ALTITUDE_PHRASES, rng)
        notes.append(f'- {layer}: {phrase}')

    if len(notes) == 0:
        phrase = _terrain_phrase(terrain_phrases, region_names, 'plain', BIOME_PHRASES, rng)
        notes.append(f'- plain: {phrase}')

    return notes
