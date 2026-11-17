# ============================================================================
# Tag classes — the Mind's reading of the vocabulary (ADR-0016)
# ----------------------------------------------------------------------------
# One declaration of what each tag family IS for the engine; previously
# four private lists answered the same question four ways. A family not
# listed is plain content — it evokes, encodes and streaks like anything
# else. Mirrors the `consumers` field of the shared registry
# (public.narration_tags / tags.json); the Mind does not read the table —
# each consumer decides how to read the vocabulary, and this is the
# Mind's reading, pack-declared like Detectors.
#
#   ambient   — background: never evokes, never a cause, never a subject
#               (the same rain must not recall every past rain)
#   subject   — can bear a Relation: a being, a kind, a people, a place
#   pattern   — recurring-theme eligible ('the rain again', 'the orcs')
#   cause     — can stand as a Mood's cause and link it to the Focus
# ============================================================================

TAG_CLASSES = {
    'type':        {'ambient'},
    'weather':     {'ambient', 'pattern'},
    'food':        {'ambient'},
    'drink':       {'ambient'},
    'region':      {'ambient', 'subject', 'pattern'},
    'entity':      {'subject', 'pattern', 'cause'},
    'entity_type': {'subject', 'cause'},
    'family':      {'subject'},
    'race':        {'subject'},
    'place':       {'subject'},
    'form':        {'cause'},
}

# Data keys that never enter the tag space (the wire's contract, not a
# game knob): check/needs machinery and resolution bookkeeping are
# signal, not content; 'slot' already travels as when.phase; 'scope' is
# which places_interactions row served the night; the prose fields
# ('description', 'prose_hint', 'aspect', 'presence', 'sighted_far',
# 'reading'…) are sentences to narrate, never vocabulary.
UNTAGGED_FIELDS = frozenset({
    'entity', 'entity_id', 'entity_name', 'check', 'thread_desc',
    'resolves', 'urgency', 'scope', 'description', 'description_es',
    'inhabitants', 'prose_hint', 'slot', 'substance', 'lodging',
    'aspect', 'aspect_es', 'presence', 'presence_es',
    'sighted_far', 'reading',
})


def tag_family(tag):
    """The registry family a mind tag belongs to: 'tag:weather:wet' →
    'weather', 'entity:foxes' → 'entity', a bare 'tag:omen' → 'tag'."""
    if tag.startswith('tag:'):
        rest = tag[4:]
        return rest.split(':', 1)[0] if ':' in rest else 'tag'
    return tag.split(':', 1)[0]


def tag_is(tag, cls):
    return cls in TAG_CLASSES.get(tag_family(tag), ())


def contact_tags(tags):
    """The tags that can make a memory TOUCH today: the story's nouns —
    entity, kind, form, topic, name, need — never the weather, the
    ration, the mileage or the region it all happened in."""
    return {t for t in (tags or []) if not tag_is(t, 'ambient')}


def subject_tags(tags):
    """The tags that can bear a Relation — who or what the Mind holds a
    feeling about."""
    return {t for t in (tags or []) if tag_is(t, 'subject')}


def pattern_tag(tag):
    """A recurring theme must be a named thing: a pattern-classed tag,
    or a single-segment host tag ('tag:omen'). 'type:*' is too generic
    and 'tag:<field>:<value>' is raw bookkeeping — 'food: lembas' every
    day is what happened, not what means anything."""
    if tag_is(tag, 'pattern'):
        return True
    return tag.startswith('tag:') and ':' not in tag[4:]


def cause_tags(tags):
    """The tags that can stand as a Mood's cause — letting the brief
    connect the carried mood to today's Focus (orc tracks yesterday,
    orcs today)."""
    return [t for t in (tags or []) if tag_is(t, 'cause')]
