# ============================================================================
# Terrain phrases (pure lookup helpers)
# ----------------------------------------------------------------------------
# Port of the pure functions from
# backend/domains/story/services/naturalLanguage/terrainPhrases.js.
#
# loadTerrainPhrases (the DB-reading half of the original file) stays in Node:
# it is called from the Game domain during day generation, before narrateDay
# runs, and its result is already embedded in `day.terrain_phrases` by the
# time this service receives the payload. Nothing here talks to a database.
# ============================================================================
import random


def pick_phrase(phrases_map, region_name, category, rng=random.random):
    """Pick a random phrase for a region/category combination."""
    phrases = (phrases_map or {}).get(region_name, {}).get(category)
    if not isinstance(phrases, list) or len(phrases) == 0:
        return None
    return phrases[int(rng() * len(phrases))]


def pick_phrase_for_regions(phrases_map, region_names, category, rng=random.random):
    """Pick a phrase from the first region in the list that has one for the category."""
    if not isinstance(region_names, list):
        return None
    for name in region_names:
        phrase = pick_phrase(phrases_map, name, category, rng)
        if phrase:
            return phrase
    return None
