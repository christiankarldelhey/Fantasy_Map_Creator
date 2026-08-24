# ============================================================================
# Climate sample helpers
# ----------------------------------------------------------------------------
# Port of backend/domains/map/services/data/climateData.js (pure functions,
# no DB — reused here directly instead of going through an HTTP adapter,
# since they operate only on the `climate` array already embedded in the
# `day` payload).
# ============================================================================


def inner_climate(sample):
    """Pull the inner weather record from a climate sample (handles the nesting)."""
    if not sample:
        return None
    c = sample.get('climate') or sample
    return c.get('climate') or c


def climate_records(climate_array):
    """Unwrap a whole climate array into plain weather records, dropping blanks."""
    if not isinstance(climate_array, list):
        return []
    return [r for r in (inner_climate(s) for s in climate_array) if r]


def timed_climate_records(climate_array):
    """Unwrap a climate array keeping the sample timestamp alongside the record."""
    if not isinstance(climate_array, list):
        return []
    result = []
    for s in climate_array:
        weather = inner_climate(s)
        if weather:
            result.append({'time': s.get('time'), 'weather': weather})
    return result


def mean_of(nums):
    """Arithmetic mean of the finite numbers in the list, or None when there are none."""
    xs = [n for n in (nums or []) if isinstance(n, (int, float))]
    if len(xs) == 0:
        return None
    return sum(xs) / len(xs)


def sum_of(nums):
    """Sum of the finite numbers in the list (0 when empty)."""
    return sum(n for n in (nums or []) if isinstance(n, (int, float)))
