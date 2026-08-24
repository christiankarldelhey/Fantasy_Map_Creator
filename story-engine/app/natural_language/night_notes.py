# ============================================================================
# Nighttime conditions at camp
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/naturalLanguage/nightNotes.js.
# ============================================================================
import random

from app.climate_data import mean_of, sum_of, timed_climate_records
from app.day_phases import hour_of_timestamp
from app.text import pick

STORM_PRECIPITATION_MIN = 1
STORM_WIND_MIN = 25
HARD_WIND_MIN = 30
RESTLESS_WIND_MIN = 18
SOAKING_DAWN_RAIN_MIN = 0.5
DAWN_HOURS = [5, 7]

STORM_PHRASES = [
    'A storm bursts after dark; the traveller must find what shelter they can.',
    'Thunder and wind force the camp to huddle behind rocks or trees.',
    'The night turns violent — rain and gusts make sleep impossible until the storm passes.',
]

SOAKING_DAWN_RAIN_PHRASES = [
    'Toward dawn a steady rain soaks the camp, waking the traveller with cold drops.',
    'A grey rain moves in before first light, pattering against cloak and canvas.',
    'The traveller wakes to the sound of rain in the small hours, the ground turning soft.',
]

LIGHT_DAWN_RAIN_PHRASES = [
    'A faint drizzle brushes the camp near dawn.',
    'A light, passing shower stirs the sleeper once before morning.',
]

HARD_WIND_PHRASES = [
    'In the depth of night the wind rises, tearing at the camp and making sleep fitful.',
    'Gusts slam across the sleeping place, rattling gear and demanding attention.',
]

RESTLESS_WIND_PHRASES = [
    'A restless wind keeps the traveller half-awake through the watches of the night.',
    'The night air moves constantly, carrying the smell of rain or pine through the camp.',
]

FREEZING_PHRASES = [
    'The cold sinks deep; sleep comes in shivers until the fire dies entirely.',
    'Frost forms on cloak and grass, and the traveller wakes stiff and slow.',
]

CHILLY_PHRASES = [
    'The night is cold enough that the traveller curls closer to the embers.',
    'A chill settles after sunset and never truly leaves.',
]

CALM_PHRASES = [
    'The night passes quietly, the stars clear and untroubled.',
    'A calm, uneventful night leaves the traveller rested by morning.',
]


def _night_weather_summary(samples):
    """Aggregate the overnight samples into the few numbers the rules need."""
    winds = [s['weather'].get('wind_speed_10m') for s in samples if isinstance(s['weather'].get('wind_speed_10m'), (int, float))]

    dawn_precipitation = 0
    for hour in DAWN_HOURS:
        at_hour = [s for s in samples if hour_of_timestamp(s['time']) == hour]
        last = at_hour[-1] if at_hour else None
        dawn_precipitation += (last['weather'].get('precipitation') or 0) if last else 0

    return {
        'meanTemp': mean_of([s['weather'].get('temperature_2m') for s in samples]),
        'maxWind': max(winds) if winds else None,
        'totalPrecipitation': sum_of([s['weather'].get('precipitation') or 0 for s in samples]),
        'dawnPrecipitation': dawn_precipitation,
    }


def collect_nighttime_conditions(nighttime_climate_array, rng=random.random):
    """Bullet-ready notes on how the night affected the sleeping traveller."""
    samples = timed_climate_records(nighttime_climate_array)
    if len(samples) == 0:
        return []

    summary = _night_weather_summary(samples)
    mean_temp = summary['meanTemp']
    max_wind = summary['maxWind']
    total_precipitation = summary['totalPrecipitation']
    dawn_precipitation = summary['dawnPrecipitation']

    stormy = total_precipitation > STORM_PRECIPITATION_MIN and max_wind is not None and max_wind > STORM_WIND_MIN

    conditions = []

    if stormy:
        conditions.append(pick(STORM_PHRASES, rng))

    if dawn_precipitation > SOAKING_DAWN_RAIN_MIN:
        conditions.append(pick(SOAKING_DAWN_RAIN_PHRASES, rng))
    elif dawn_precipitation > 0:
        conditions.append(pick(LIGHT_DAWN_RAIN_PHRASES, rng))

    # Wind only gets its own note when the storm phrase did not already cover it.
    if not stormy and max_wind is not None:
        if max_wind > HARD_WIND_MIN:
            conditions.append(pick(HARD_WIND_PHRASES, rng))
        elif max_wind > RESTLESS_WIND_MIN:
            conditions.append(pick(RESTLESS_WIND_PHRASES, rng))

    if mean_temp is not None:
        if mean_temp < 2:
            conditions.append(pick(FREEZING_PHRASES, rng))
        elif mean_temp < 8:
            conditions.append(pick(CHILLY_PHRASES, rng))

    if len(conditions) == 0:
        conditions.append(pick(CALM_PHRASES, rng))

    return [f'- {c}' for c in conditions]
