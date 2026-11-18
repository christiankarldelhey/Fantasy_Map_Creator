# ============================================================================
# Day phases and clock -> prose time
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/naturalLanguage/dayPhases.js.
# WALK_END_HOUR is ported as a constant (was imported via the Game adapter in
# Node); its value (19) is defined in backend/domains/game/services/world/tripDay.js.
# ============================================================================
import re

NARRATIVE_PHASES = ['morning', 'afternoon', 'night']

MORNING_START_HOUR = 7
AFTERNOON_START_HOUR = 13
NIGHT_START_HOUR = 19

WALK_END_HOUR = 19


def empty_phase_buckets():
    """An empty { morning, afternoon, night } accumulator of lists."""
    return {'morning': [], 'afternoon': [], 'night': []}


def phase_for_hour(hour_float):
    """Map a clock hour (float) to a narrative phase."""
    if hour_float is None:
        return 'night'
    if MORNING_START_HOUR <= hour_float < AFTERNOON_START_HOUR:
        return 'morning'
    if AFTERNOON_START_HOUR <= hour_float < NIGHT_START_HOUR:
        return 'afternoon'
    return 'night'


def group_by_phase(items):
    """Group items carrying an `hour_float` into the three narrative phases."""
    buckets = empty_phase_buckets()
    for item in (items or []):
        hour_float = (item or {}).get('hour_float') if isinstance(item, dict) else None
        buckets[phase_for_hour(hour_float)].append(item)
    return buckets


def hour_of_timestamp(time):
    """Parse the hour out of a "YYYY-MM-DD HH:mm:ss" stamp, or None when unreadable."""
    if not time:
        return None
    try:
        hour = int(str(time)[11:13])
        return hour
    except (ValueError, IndexError):
        return None


def phase_for_climate_sample(sample):
    """Derive the phase of a climate sample: its stored phase, else its timestamp."""
    phase = (sample or {}).get('phase')
    if phase and phase in NARRATIVE_PHASES:
        return phase
    hour = hour_of_timestamp((sample or {}).get('time'))
    if hour is None:
        return 'night'
    return phase_for_hour(hour)


# Daylight anchors (ADR-0019): fixed for now — a future daylight engine
# (season, latitude) will move these; every caller goes through
# day_time_phrase so the change stays local.
DAWN_HOUR = 7
DUSK_HOUR = 19


def day_time_phrase(hour):
    """Map a clock hour to the narrator-facing time expression (ADR-0019).
    The prompt never carries digits — 'late in the afternoon', never
    '16:00'. None → no phrase (the reading names its own time)."""
    if hour is None:
        return None
    if hour < DAWN_HOUR:
        return 'Before first light'
    if hour < 9:
        return 'At dawn'
    if hour < 12:
        return 'Mid-morning'
    if hour < 13.5:
        return 'Toward midday'
    if hour < 16:
        return 'Early in the afternoon'
    if hour < 18:
        return 'Late in the afternoon'
    if hour < DUSK_HOUR:
        return 'Toward dusk'
    return 'After dark'


# Readings verbalized upstream already carry their own time phrase
# (time_of_day_phrase at resolution). When an event arrives without
# when.hour, that embedded phrase recovers the clock position — used
# only to order the timeline, never shown to the narrator. Longer,
# more specific phrases must precede the bare ones.
_READING_HOUR_PHRASES = [
    ('before first light', 5),
    ('first light', 6.5),
    ('dawn', 7.5),
    ('early morning', 8),
    ('mid-morning', 10),
    ('morning', 9),
    ('midday', 12.5),
    ('noon', 12.5),
    ('early afternoon', 14),
    ('late afternoon', 17),
    ('afternoon', 15),
    ('evening', 18),
    ('dusk', 18.5),
    ('sunset', 18.5),
    ('after dark', 20),
    ('night', 21),
]

# Word-boundary matching: 'afternoon' must not trip 'noon'.
_READING_HOUR_RES = [
    (re.compile(rf'\b{re.escape(phrase)}\b'), hour)
    for phrase, hour in _READING_HOUR_PHRASES
]


def implied_hour(reading):
    """Clock position a reading already implies in its own wording —
    the sort key for events that arrive without when.hour. The FIRST
    time phrase in the text anchors it: 'A night in the open lands …
    after sunset' is a night beat, not a sunset one."""
    text = (reading or '').lower()
    best = None
    for pattern, hour in _READING_HOUR_RES:
        match = pattern.search(text)
        if match and (best is None or match.start() < best[0]):
            best = (match.start(), hour)
    return best[1] if best else None


def time_of_day_phrase(hour_float):
    """Map a clock hour (float) to a coarse time-of-day phrase for the notes."""
    if hour_float is None:
        return 'somewhere along the way'
    if hour_float < 9:
        return 'in the early morning'
    if hour_float < 11:
        return 'in the mid-morning'
    if hour_float < 13:
        return 'toward midday'
    if hour_float < 15:
        return 'in the early afternoon'
    if hour_float < 17:
        return 'in the late afternoon'
    if hour_float < WALK_END_HOUR:
        return 'as evening drew near'
    return 'after dark'
