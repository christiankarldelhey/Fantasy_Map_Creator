# ============================================================================
# Phase blocks (MORNING / AFTERNOON / NIGHT AT CAMP)
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/prompt/sections/phaseSection.js.
# ============================================================================
import random

from app.natural_language import collect_location_notes, collect_terrain_notes, describe_water_crossings
from app.prompt.sections.encounters import encounters_section


def phase_block(
    title,
    weather=None,
    biomes=None,
    locations=None,
    water_crossings=None,
    encounters=None,
    regions=None,
    terrain_phrases=None,
    rng=random.random,
    extra_lead='',
    meal='',
    echoes=None,
):
    biomes = biomes or []
    locations = locations or []
    water_crossings = water_crossings or []
    encounters = encounters or []
    regions = regions or []
    terrain_phrases = terrain_phrases or {}

    subsections = []

    if weather:
        subsections.append(f'Weather: {weather}')

    if biomes:
        terrain_notes = collect_terrain_notes(biomes, [], regions, terrain_phrases, rng)
        if terrain_notes:
            subsections.append(f"Terrain:\n{chr(10).join(terrain_notes)}")

    if locations:
        subsections.append(f'Locations:\n{chr(10).join(collect_location_notes(locations))}')

    if water_crossings:
        water = describe_water_crossings(water_crossings, rng)
        if water:
            subsections.append(f'Water crossings:\n{water}')

    if meal:
        subsections.append(f'Food and drink:\n{meal}')

    if extra_lead:
        subsections.append(extra_lead)

    # C21: an echo whose subject is one of this phase's encounters rides
    # INSIDE that encounter block; the rest hover at phase level.
    echoes = echoes or []
    encounters = [dict(e) for e in encounters]
    leftovers = []
    for echo in echoes:
        placed = False
        for enc in encounters:
            name = ((enc.get('entity') or {}).get('name') or '').lower()
            subj = (echo.get('subject') or '').lower()
            if subj and name and (subj in name or name in subj):
                enc.setdefault('echo', echo['line'])
                placed = True
                break
        if not placed:
            leftovers.append(echo)

    subsections.append(f'Encounters:\n{encounters_section(encounters)}')

    # C21: evoked memories land where they stirred — inside the part of
    # the day that called them back, not in a faraway list. The note is
    # optional on purpose: it colors the beat if it fits, it is not a
    # seventh encounter to render.
    if leftovers:
        subsections.append(
            'Echoes of the mind (memories surfacing in this part of the '
            'day — let them color a beat as recollection if they fit, '
            'never as events happening now):\n'
            + '\n'.join(f"- {e['line']}" for e in leftovers)
        )

    return f"=== {title} ===\n" + "\n\n".join(subsections)
