# ============================================================================
# Natural Language service (NO AI)
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/naturalLanguage/index.js (barrel).
# Deterministic, rule-based interpreters that turn the raw day data (climate,
# regions, biomes, altitude, locations, roads, water) into plain English notes
# for the narrator prompt.
# ============================================================================

from app.day_phases import (  # noqa: F401
    NARRATIVE_PHASES,
    empty_phase_buckets,
    group_by_phase,
    phase_for_hour,
    time_of_day_phrase,
)
from app.natural_language.climate_notes import (  # noqa: F401
    collect_climate_notes_by_phase,
    resolve_climate_state,
    day_weather_signature,
    format_moon_night_phrase,
)
from app.natural_language.night_notes import collect_nighttime_conditions  # noqa: F401
from app.natural_language.terrain_notes import collect_terrain_notes  # noqa: F401
from app.natural_language.elevation_notes import describe_elevation  # noqa: F401
from app.natural_language.road_notes import collect_road_notes  # noqa: F401
from app.natural_language.water_notes import describe_water_crossings  # noqa: F401
from app.natural_language.meal_notes import describe_meal, describe_meals  # noqa: F401
from app.natural_language.place_notes import (  # noqa: F401
    collect_location_notes,
    describe_overnight_location,
    describe_regions,
)
from app.natural_language.opening_focus import pick_opening_strategy, pick_todays_way_in  # noqa: F401
