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


# ---- nl pack wiring ---------------------------------------------------------
# Every consumer accepts an optional NlPack (app.mind.nl_resolver). When it's
# absent the module constants apply — identical output, so legacy callers and
# games without a seeded pack keep working byte-for-byte.


def _band(nl, table, bands, value):
    if nl is not None:
        return nl.band_phrase(table, value)
    return _band_phrase(bands, value)


def _threshold(nl, key, fallback):
    return nl.threshold(key, fallback) if nl is not None else fallback


def _pick(nl, key, fallback, rng):
    choices = nl.phrases(key) if nl is not None else None
    return pick(choices or fallback, rng)


def summarise_weather(records, nl=None):
    """Summarise weather records into a short phrase like "cool, partly cloudy"."""
    mean_temp = mean_of([w.get('temperature_2m') for w in records])
    mean_cloud = mean_of([w.get('cloud_cover') for w in records])
    mean_wind = mean_of([w.get('wind_speed_10m') for w in records])
    total_prec = sum_of([w.get('precipitation') or 0 for w in records])

    parts = [p for p in [
        _band(nl, 'temperature', TEMPERATURE_BANDS, mean_temp),
        _band(nl, 'cloud_cover', CLOUD_BANDS, mean_cloud),
        'windy' if (mean_wind is not None and mean_wind > _threshold(nl, 'climate.windy_speed_min', WINDY_SPEED_MIN)) else None,
    ] if p]

    if total_prec > _threshold(nl, 'climate.wet_precipitation_min', WET_PRECIPITATION_MIN):
        parts.append('wet')
    elif total_prec > 0:
        parts.append('a passing shower')

    return join_list(parts) if parts else None


def collect_climate_notes_by_phase(climate_array, moon=None, nl=None):
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
        summary = summarise_weather(by_phase[phase], nl)
        if phase == 'night' and summary and moon:
            mean_cloud = mean_of([w.get('cloud_cover') for w in by_phase['night']])
            moon_phrase = format_moon_night_phrase(moon, mean_cloud, nl)
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


def day_weather_signature(climate=None, nl=None):
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

    snow_max = _threshold(nl, 'climate.snow_temp_max', SNOW_TEMP_MAX)
    rain_min = _threshold(nl, 'climate.heavy_rain_min', HEAVY_RAIN_MIN)
    storm_min = _threshold(nl, 'climate.storm_wind_min', STORM_WIND_MIN)
    cold_max = _threshold(nl, 'climate.deep_cold_max', DEEP_COLD_MAX)
    hot_min = _threshold(nl, 'climate.scorching_min', SCORCHING_MIN)

    snow = any(isinstance(s.get('temperature_2m'), (int, float)) and s['temperature_2m'] <= snow_max and (s.get('precipitation') or 0) > 0 for s in samples)
    heavy_rain = any((s.get('precipitation') or 0) >= rain_min for s in samples)
    storm = max_wind is not None and max_wind >= storm_min
    deep_cold = mean_temp is not None and mean_temp <= cold_max
    scorching = mean_temp is not None and mean_temp >= hot_min

    return {
        'snow': snow, 'heavyRain': heavy_rain, 'storm': storm, 'deepCold': deep_cold,
        'scorching': scorching, 'meanTemp': mean_temp, 'maxWind': max_wind, 'totalPrecip': total_precip,
    }


def resolve_climate_state(recent_days=None, rng=random.random, nl=None):
    """Detect persistent multi-day climate states from recent days.

    recent_days: list of { climate }, newest last; include today at the end.
    """
    recent_days = recent_days or []
    if len(recent_days) == 0:
        return {'active': [], 'narrative': '', 'dominant': None}

    signatures = [day_weather_signature(d.get('climate'), nl) for d in recent_days]
    consecutive = _threshold(nl, 'climate.consecutive_days', CONSECUTIVE_DAYS)

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
    if snow_streak >= consecutive:
        active.append('snowbound')
        bits.append(_pick(nl, 'climate.snowbound', SNOWBOUND_PHRASES, rng))

    rain_streak = streak(lambda s: s['heavyRain'])
    if rain_streak >= consecutive:
        active.append('drenched')
        bits.append(_pick(nl, 'climate.drenched', DRENCHED_PHRASES, rng))

    storm_streak = streak(lambda s: s['storm'])
    if storm_streak >= consecutive:
        active.append('storm_lashed')
        bits.append(_pick(nl, 'climate.storm_lashed', STORM_LASHED_PHRASES, rng))

    cold_streak = streak(lambda s: s['deepCold'])
    if cold_streak >= consecutive:
        active.append('frozen')
        bits.append(_pick(nl, 'climate.frozen', FROZEN_PHRASES, rng))

    heat_streak = streak(lambda s: s['scorching'])
    if heat_streak >= consecutive:
        active.append('scorched')
        bits.append(_pick(nl, 'climate.scorched', SCORCHED_PHRASES, rng))

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


def format_moon_night_phrase(moon, mean_cloud, nl=None):
    """Short moon phrase for the night weather line, or None when the moon is
    not worth mentioning."""
    if not moon or not moon.get('phase'):
        return None
    if moon['phase'] == 'new_moon':
        return (nl.phrase('climate.moon.new_moon') if nl is not None else None) or MOON_NIGHT_PHRASES['new_moon']
    if moon['phase'] != 'full_moon':
        return None
    if isinstance(mean_cloud, (int, float)) and mean_cloud >= _threshold(nl, 'climate.heavy_cloud_cover', HEAVY_CLOUD_COVER):
        return None
    return (nl.phrase('climate.moon.full_moon') if nl is not None else None) or MOON_NIGHT_PHRASES['full_moon']
