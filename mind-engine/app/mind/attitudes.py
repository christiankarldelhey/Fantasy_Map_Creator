# ============================================================================
# Belief facets — subject matching helpers (CONTEXT.md · Belief facets)
# ----------------------------------------------------------------------------
# An Attitude is a Belief with a Subject (the tags this mind counts as 'the
# same kind of being') and a Stance (-1 loathing .. +1 love). The motion
# lives in Relations now (ADR 0017): the stance still matches the moment
# for the brief and reflection — who or what a thought is about — but it
# no longer colours perception nor drifts at close.
#
# Most specific wins when several subjects touch one encounter: entity >
# family > type — Celebrian loves horses, and the horses of Mordor are
# not that.
# ============================================================================
# Narrowest first: a match on an entity outranks a family, a family a type.
_LEVELS = (('entity:', 3), ('tag:family:', 2), ('tag:entity_type:', 1))

# The people ladder (#86): 'dunlendings' is the same folk whether the
# host worded them 'tag:family:' or 'tag:entity_type:' — the levels are
# naming, not identity. Matching normalizes both sides to the type form
# so a belief's subject and the day's tag agree on the terminal slug.
_LADDER = ('tag:family:', 'tag:entity_type:')


def ladder_norm(tag):
    for prefix in _LADDER:
        if tag.startswith(prefix):
            return f'tag:entity_type:{tag[len(prefix):]}'
    return tag


def is_attitude(belief):
    return bool(getattr(belief, 'subject', None)) and (
        getattr(belief, 'stance', None) is not None
    )


def subject_level(tag):
    for prefix, level in _LEVELS:
        if tag.startswith(prefix):
            return level
    return 1


def match_level(belief, tags):
    """How narrowly this attitude's subject meets the tags; 0 = no touch.
    Ladder-normalized (#86): a family subject meets an entity_type tag
    on the same slug — the level is the subject's own narrowness."""
    tags = {ladder_norm(t) for t in tags or []}
    hits = [
        s for s in (belief.subject or [])
        if ladder_norm(s) in tags
    ]
    return max((subject_level(t) for t in hits), default=0)
