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
from app.mind.steps import step

_LEVELS = (('entity:', 3), ('family:', 2), ('tag:entity_type:', 1))

# The people ladder (#86): 'dunlendings' is the same folk whether the
# host worded them 'family:', 'tag:entity_type:' or the legacy
# 'tag:family:' — the levels are naming, not identity. Matching
# normalizes both sides to the type form so a belief's subject and the
# day's tag agree on the terminal slug.
_LADDER = ('family:', 'tag:family:', 'tag:entity_type:')


def ladder_norm(tag):
    for prefix in _LADDER:
        if tag.startswith(prefix):
            return f'tag:entity_type:{tag[len(prefix):]}'
    return tag


def conviction_stance(row):
    """A conviction's Stance lives in its imprint (#168): the affection
    the belief carries toward its subjects. `stance` kept for test
    fixtures."""
    imprint = getattr(row, 'imprint', None) or {}
    if 'affection' in imprint:
        return imprint['affection']
    return getattr(row, 'stance', None)


def conviction_statement(row):
    """A conviction's statement is its memory desc (`statement` kept for
    test fixtures)."""
    return getattr(row, 'desc', None) or getattr(row, 'statement', None)


def conviction_subjects(row):
    """A conviction's Subject list — `subjects` on the folded Memory
    row; `subject` kept for SimpleNamespace test fixtures."""
    return getattr(row, 'subjects', None) or getattr(row, 'subject', None)


def conviction_facet(row, key, default=None):
    """One field of the conviction facet — strength/status/horizon/etc.
    `conviction` on the folded row; direct attribute kept for test
    fixtures."""
    conv = getattr(row, 'conviction', None)
    if isinstance(conv, dict) and key in conv:
        return conv[key]
    return getattr(row, key, default)


def is_conviction(row):
    """The row is a conviction-tier memory that carries a belief facet."""
    return isinstance(getattr(row, 'conviction', None), dict)


def is_attitude(belief):
    return bool(conviction_subjects(belief)) and (
        conviction_stance(belief) is not None
    )


@step('Belief')
def active_convictions(session, character_id):
    """The 'loud' beliefs: conviction-tier memories whose facet status is
    active (#168). Status is JSONB-filtered in Python — a mind's
    convictions are few by design (the cap sees to it)."""
    from app.mind.tables import Memory
    return [
        m for m in session.query(Memory)
        .filter_by(character_id=character_id, kind='conviction')
        .all()
        if (m.conviction or {}).get('status') == 'active'
    ]


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
        s for s in (conviction_subjects(belief) or [])
        if ladder_norm(s) in tags
    ]
    return max((subject_level(t) for t in hits), default=0)
