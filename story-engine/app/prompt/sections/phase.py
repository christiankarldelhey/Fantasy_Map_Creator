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

    subsections.append(f'Encounters:\n{encounters_section(encounters)}')

    return f"=== {title} ===\n" + "\n\n".join(subsections)
