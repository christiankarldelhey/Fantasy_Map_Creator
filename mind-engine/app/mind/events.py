# ============================================================================
# Event envelope — the wire's universal vocabulary (ADR-0019)
# ----------------------------------------------------------------------------
# `type`/`when`/`where`/`id` are the envelope's spine; five more keys are
# universal because every kind may carry them: what the traveller was
# doing (act), how hard it hit (intensity, the shared 0-4 dial), the
# host's one-line reading, declared markers (tags), and the perception
# gate (check). `data` holds only what a kind owns — the encounter's
# entity, the meal's food, the night's keeper.
#
# The wire separates universal vocabulary from per-kind payload; inside
# the mechanics it is one map — flat_data folds the envelope back in so
# semantic rows, rules and readers keep a single lookup surface. The
# envelope wins when both spell a key: a canonical field always beats a
# stale data duplicate.
# ============================================================================
import re

from app.day_phases import DAWN_HOUR

ENVELOPE_KEYS = frozenset({
    'act', 'intensity', 'reading', 'tags', 'check',
})

# How a remarkable night reaches the waking — only the extremes the
# world tags ('rest:poor', 'rest:good') earn a word; an unremarkable
# night stays silent, as it should most mornings.
_REST_NOTE = {
    'rest:poor': 'the night gave little rest',
    'rest:good': 'the night gave deep rest',
}


def wake_anchor(previous_rest):
    """The wake's own words: where the traveller wakes. A rest record
    {place, reading, tags} names the roof itself; a plain reading
    string (stateless path) falls back to its first clause."""
    if isinstance(previous_rest, dict):
        wake = previous_rest.get('place') or re.split(
            r' — |(?<=\.)\s', previous_rest.get('reading') or ''
        )[0].rstrip('.')
        if previous_rest.get('place'):
            wake = f'they wake at {wake}'
        tags = set(previous_rest.get('tags') or [])
        note = next(
            (_REST_NOTE[t] for t in _REST_NOTE if t in tags), None)
        return f'{wake} — {note}' if note else wake
    return re.split(r' — |(?<=\.)\s', previous_rest)[0].rstrip('.')


def wake_event(previous_rest):
    """The day's first event: the waking itself. A real event in
    `episode.events` — perceived first, indexable like any other, the
    fixed point every overnight need and the day's continuity anchor
    to. Composed at open from the previous episode's rest so a
    re-narration replays the same words."""
    return {
        'type': 'wake',
        'act': 'wake',
        'when': {'phase': 'morning', 'hour': DAWN_HOUR - 2},
        'where': (
            {'region': previous_rest['region']}
            if previous_rest.get('region') else {}),
        'reading': (
            'The day begins where last night ended — '
            f'{wake_anchor(previous_rest)}.'),
        'tags': list(previous_rest.get('tags') or []),
    }


def flat_data(event):
    """`data` plus the envelope's universal keys folded in (see module
    docstring). Old-shape stored events — keys still inside data — read
    identically: the fold only adds what the envelope declares. Empty
    containers are NOT a declaration (a serialized tags: [] must never
    hide the data.tags an older event actually shipped); 0 is — a zero
    intensity is a declared whisper."""
    data = dict((event or {}).get('data') or {})
    for key in ENVELOPE_KEYS:
        value = (event or {}).get(key)
        if value not in (None, [], {}, ''):
            data[key] = value
    return data
