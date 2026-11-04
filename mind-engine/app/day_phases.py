# ============================================================================
# Day phases and clock -> prose time
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/naturalLanguage/dayPhases.js.
# WALK_END_HOUR is ported as a constant (was imported via the Game adapter in
# Node); its value (19) is defined in backend/domains/game/services/world/tripDay.js.
# ============================================================================

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
