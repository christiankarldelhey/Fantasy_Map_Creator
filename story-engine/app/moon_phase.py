# ============================================================================
# Moon phase calculator for real 1950 lunar data.
# ----------------------------------------------------------------------------
# Port of backend/domains/map/services/data/moonPhase.js (pure function, no DB).
# ============================================================================
import math
import re
from datetime import datetime, timezone

KNOWN_NEW_MOON_UTC = datetime(1950, 1, 18, 8, 0, 0, tzinfo=timezone.utc)
SYNODIC_MONTH_DAYS = 29.530588861


def _to_date(input_):
    if isinstance(input_, datetime):
        return input_ if input_.tzinfo else input_.replace(tzinfo=timezone.utc)
    if isinstance(input_, str):
        match = re.match(r'^(\d{4}-\d{2}-\d{2})', input_)
        if match:
            return datetime.strptime(match.group(1), '%Y-%m-%d').replace(tzinfo=timezone.utc)
    raise ValueError(f'Unsupported date input: {input_!r}')


def get_moon_phase(date_input):
    """Compute the moon phase for a given date.

    Returns { phase, illumination, age_days }.
    """
    d = _to_date(date_input)
    days_since = (d - KNOWN_NEW_MOON_UTC).total_seconds() / (60 * 60 * 24)
    synodic_month = SYNODIC_MONTH_DAYS
    age = ((days_since % synodic_month) + synodic_month) % synodic_month
    illumination = 0.5 * (1 - math.cos(2 * math.pi * age / synodic_month))

    new_window = 1.5
    full_window = 1.5
    quarter_window = 1.5
    q = synodic_month / 4

    if age < new_window or age > synodic_month - new_window:
        phase = 'new_moon'
    elif abs(age - q) < quarter_window:
        phase = 'first_quarter'
    elif abs(age - 2 * q) < full_window:
        phase = 'full_moon'
    elif abs(age - 3 * q) < quarter_window:
        phase = 'last_quarter'
    elif age < q:
        phase = 'waxing_crescent'
    elif age < 2 * q:
        phase = 'waxing_gibbous'
    elif age < 3 * q:
        phase = 'waning_gibbous'
    else:
        phase = 'waning_crescent'

    return {'phase': phase, 'illumination': illumination, 'age_days': age}
