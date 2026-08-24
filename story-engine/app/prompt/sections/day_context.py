# ============================================================================
# Day-level land context
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/prompt/sections/dayContextSection.js.
# ============================================================================
import random

from app.natural_language import collect_road_notes, describe_elevation, describe_regions


def day_context_section(regions=None, road_types=None, terrain_phrases=None, elevation_profile=None, rng=random.random):
    regions = regions or []
    road_types = road_types or {}
    terrain_phrases = terrain_phrases or {}

    parts = [f'Lands crossed (in order), with their character:\n{describe_regions(regions)}']

    road_notes = collect_road_notes(road_types, regions, terrain_phrases, rng)
    if road_notes:
        parts.append(f"Road notes (reference only — render, don't quote):\n{chr(10).join(road_notes)}")

    elevation_note = describe_elevation(elevation_profile, rng)
    if elevation_note:
        parts.append(f'Terrain effort (across the whole day):\n{elevation_note}')

    return '\n\n'.join(parts)
