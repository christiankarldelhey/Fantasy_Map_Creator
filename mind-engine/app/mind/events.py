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

ENVELOPE_KEYS = frozenset({
    'act', 'intensity', 'reading', 'tags', 'check',
})


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
