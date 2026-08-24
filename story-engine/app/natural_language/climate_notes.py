# ============================================================================
# Weather notes, one short phrase per narrative phase and multi-day states
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/naturalLanguage/climateNotes.js.
# Weather is atmosphere, never a report: no figures and no clock times leave
# this module.
# ============================================================================
import random

from app.climate_data import inner_climate, mean_of, sum_of
from app.day_phases import NARRATIVE_PHASES, empty_phase_buckets, phase_for_climate_sample
from app.text import join_list, pick

TEMPERATURE_BANDS = [
    {'below': 2, 'phrase': 'bitter cold'},
    {'below': 8, 'phrase': 'cold'},
    {'below': 15, 'phrase': 'cool'},
    {'below': 22, 'phrase': 'mild'},
    {'below': 29, 'phrase': 'warm'},
    {'below': float('inf'), 'phrase': 'hot'},
]

CLOUD_BANDS = [
    {'below': 25, 'phrase': 'clear skies'},
    {'below': 60, 'phrase': 'partly cloudy'},
    {'below': 90, 'phrase': 'mostly overcast'},
    {'below': float('inf'), 'phrase': 'heavy cloud cover'},
]

WINDY_SPEED_MIN = 18
WET_PRECIPITATION_MIN = 0.2


def _band_phrase(bands, value):
    """First band whose threshold the value falls under, or None for missing data."""
    if value is None:
        return None
    for b in bands:
        if value < b['below']:
            return b['phrase']
    return None


def summarise_weather(records):
    """Summarise weather records into a short phrase like "cool, partly cloudy"."""
    mean_temp = mean_of([w.get('temperature_2m') for w in records])
    mean_cloud = mean_of([w.get('cloud_cover') for w in records])
    mean_wind = mean_of([w.get('wind_speed_10m') for w in records])
    total_prec = sum_of([w.get('precipitation') or 0 for w in records])

    parts = [p for p in [
        _band_phrase(TEMPERATURE_BANDS, mean_temp),
        _band_phrase(CLOUD_BANDS, mean_cloud),
        'windy' if (mean_wind is not None and mean_wind > WINDY_SPEED_MIN) else None,
    ] if p]

    if total_prec > WET_PRECIPITATION_MIN:
        parts.append('wet')
    elif total_prec > 0:
        parts.append('a passing shower')

    return join_list(parts) if parts else None


def collect_climate_notes_by_phase(climate_array, moon=None):
    """Group weather into the three narrative phases and return one summary
    phrase per phase (None when there is no data for it)."""
    notes = {'morning': None, 'afternoon': None, 'night': None}
    if not isinstance(climate_array, list) or len(climate_array) == 0:
        return notes

    by_phase = empty_phase_buckets()
    for sample in climate_array:
        weather = inner_climate(sample)
        if weather:
            by_phase[phase_for_climate_sample(sample)].append(weather)

    for phase in NARRATIVE_PHASES:
        if not by_phase[phase]:
            continue
        summary = summarise_weather(by_phase[phase])
        if phase == 'night' and summary and moon:
            mean_cloud = mean_of([w.get('cloud_cover') for w in by_phase['night']])
            moon_phrase = format_moon_night_phrase(moon, mean_cloud)
            if moon_phrase:
                summary = f'{summary} — {moon_phrase}'
        notes[phase] = summary

    return notes


# ============================================================================
# Multi-day and unusual climate states
# ============================================================================

SNOW_TEMP_MAX = 1.0
HEAVY_RAIN_MIN = 0.4
STORM_WIND_MIN = 25
DEEP_COLD_MAX = -10
SCORCHING_MIN = 32

# Minimum consecutive days to become a *state* rather than a one-day note.
CONSECUTIVE_DAYS = 2

SNOWBOUND_PHRASES = [
    'The snow has followed the road for days now; the way grows harder to read with each white mile.',
    'Snow lies deep and unbroken; every step costs more breath, more warmth, more will.',
    'Drifts are closing the lower paths. The world has narrowed to what the traveller can still break through.',
]

DRENCHED_PHRASES = [
    'Rain has not let up for days; cloak, boots and spirit are all sodden through.',
    'The sky has wept without rest; the road runs with mud and the camp is a swamp.',
    'Water finds every seam: the traveller has forgotten what it is to be dry.',
]

STORM_LASHED_PHRASES = [
    "Storm after storm has harried the journey; the wind seems to know the traveller's name.",
    'The days have been loud with thunder and the nights uneasy with flying rain.',
    'It is as if the weather has turned deliberately hostile; each dawn brings a new assault from the sky.',
]

FROZEN_PHRASES = [
    'A killing cold has settled in and will not lift; fingers stiffen, breath smokes, metal bites the skin.',
    'The frost has lasted so long that even the fires at night feel thin.',
    'Every water skin is slush by morning; the cold has become a companion no one asked for.',
]

SCORCHED_PHRASES = [
    'The heat has beaten down for days; the land is pale, the throat parched, the shadows the only mercy.',
    'Sun and dust have ruled the road; the traveller moves in the stunned hours of early and late day.',
    'The air shimmers and does not cool; rest is shallow and the nights offer little relief.',
]


def day_weather_signature(climate=None):
    """Summarise a single day by its worst (or most defining) weather impression."""
    samples = [s for s in (inner_climate(s) for s in (climate or [])) if s]
    if len(samples) == 0:
        return {
            'snow': False, 'heavyRain': False, 'storm': False, 'deepCold': False,
            'scorching': False, 'meanTemp': None, 'maxWind': None, 'totalPrecip': 0,
        }

    temps = [s.get('temperature_2m') for s in samples if isinstance(s.get('temperature_2m'), (int, float))]
    winds = [s.get('wind_speed_10m') for s in samples if isinstance(s.get('wind_speed_10m'), (int, float))]
    precs = [s.get('precipitation') or 0 for s in samples if isinstance(s.get('precipitation') or 0, (int, float))]

    mean_temp = sum(temps) / len(temps) if temps else None
    max_wind = max(winds) if winds else None
    total_precip = sum(precs)

    snow = any(isinstance(s.get('temperature_2m'), (int, float)) and s['temperature_2m'] <= SNOW_TEMP_MAX and (s.get('precipitation') or 0) > 0 for s in samples)
    heavy_rain = any((s.get('precipitation') or 0) >= HEAVY_RAIN_MIN for s in samples)
    storm = max_wind is not None and max_wind >= STORM_WIND_MIN
    deep_cold = mean_temp is not None and mean_temp <= DEEP_COLD_MAX
    scorching = mean_temp is not None and mean_temp >= SCORCHING_MIN

    return {
        'snow': snow, 'heavyRain': heavy_rain, 'storm': storm, 'deepCold': deep_cold,
        'scorching': scorching, 'meanTemp': mean_temp, 'maxWind': max_wind, 'totalPrecip': total_precip,
    }


def resolve_climate_state(recent_days=None, rng=random.random):
    """Detect persistent multi-day climate states from recent days.

    recent_days: list of { climate }, newest last; include today at the end.
    """
    recent_days = recent_days or []
    if len(recent_days) == 0:
        return {'active': [], 'narrative': '', 'dominant': None}

    signatures = [day_weather_signature(d.get('climate')) for d in recent_days]

    def streak(predicate):
        c = 0
        for s in reversed(signatures):
            if predicate(s):
                c += 1
            else:
                break
        return c

    active = []
    bits = []

    snow_streak = streak(lambda s: s['snow'])
    if snow_streak >= CONSECUTIVE_DAYS:
        active.append('snowbound')
        bits.append(pick(SNOWBOUND_PHRASES, rng))

    rain_streak = streak(lambda s: s['heavyRain'])
    if rain_streak >= CONSECUTIVE_DAYS:
        active.append('drenched')
        bits.append(pick(DRENCHED_PHRASES, rng))

    storm_streak = streak(lambda s: s['storm'])
    if storm_streak >= CONSECUTIVE_DAYS:
        active.append('storm_lashed')
        bits.append(pick(STORM_LASHED_PHRASES, rng))

    cold_streak = streak(lambda s: s['deepCold'])
    if cold_streak >= CONSECUTIVE_DAYS:
        active.append('frozen')
        bits.append(pick(FROZEN_PHRASES, rng))

    heat_streak = streak(lambda s: s['scorching'])
    if heat_streak >= CONSECUTIVE_DAYS:
        active.append('scorched')
        bits.append(pick(SCORCHED_PHRASES, rng))

    narrative = f"=== CLIMATE STATE ===\n{chr(10).join(bits)}\n" if bits else ''
    dominant = active[0] if active else None

    return {'active': active, 'narrative': narrative, 'dominant': dominant}


# ============================================================================
# Moon phase phrase for the night weather line
# ============================================================================

MOON_NIGHT_PHRASES = {
    'new_moon': 'no moon rises; the dark is absolute away from the fire',
    'waxing_crescent': 'a thin waxing crescent follows the sunset',
    'first_quarter': 'the moon stands at first quarter, half-lit in the south',
    'waxing_gibbous': 'a waxing gibbous moon brightens the east',
    'full_moon': 'the full moon is bright; the land lies pale and open',
    'waning_gibbous': 'a waning gibbous moon lights the camp early, then dims',
    'last_quarter': 'the last-quarter moon rises late and cold',
    'waning_crescent': 'a waning crescent fades before dawn',
}

HEAVY_CLOUD_COVER = 70


def format_moon_night_phrase(moon, mean_cloud):
    """Short moon phrase for the night weather line, or None when the moon is
    not worth mentioning."""
    if not moon or not moon.get('phase'):
        return None
    if moon['phase'] == 'new_moon':
        return MOON_NIGHT_PHRASES['new_moon']
    if moon['phase'] != 'full_moon':
        return None
    if isinstance(mean_cloud, (int, float)) and mean_cloud >= HEAVY_CLOUD_COVER:
        return None
    return MOON_NIGHT_PHRASES['full_moon']
