# ============================================================================
# Voice — the mind's own words
# ----------------------------------------------------------------------------
# The phrase bank the mind uses to speak about ITSELF: needs, moods,
# misreads, repetitions, decisions. Plain constants — no session, no
# per-game pack, no overrides.
#
# The world's words never live here: the host declares prose and tags on
# the wire (issues #52/#53 — `day.world_notes`, `event.data.reading`) and
# the mind consumes them verbatim. What remains is interiority only.
# ============================================================================

PHRASES = {
    # Gates & rolls (B1): wrong readings for `misread` ({subject} = entity or
    # true reading when present), the condition names that count as an
    # altered state (fear/shadow), and the vague desc an unnoticed event
    # leaves in memory — the "malestar difuso" of the spec.
    'mind.misread': [
        'read the signs of {subject} as an omen',
        'was certain {subject} meant them harm',
        'mistook {subject} for eyes watching from the dark',
        'saw {subject} and felt sure it was a warning',
        '{subject} — or what the fear made of it',
        'the mind twisted what passed into something watching',
        'a shape misread, menace where there was none',
    ],
    'mind.altered_states': [
        'afraid', 'terrified', 'panicked', 'maddened',
        'shadow-sick', 'delirious', 'haunted',
    ],
    'mind.unnoticed': [
        'a vague unease, its source already forgotten',
        'something passed unnoticed, leaving only restlessness',
        'a dull disquiet with no name to put to it',
    ],
    # Needs (B2): one entry per detector key; 'mind.need.thread' is the
    # generic fallback for narrative threads ({subject} = entity/region).
    # Tiers (C11): '<key>' speaks while the need is young, '<key>.deep'
    # once urgency crosses need_deep_urgency. Several variants per tier —
    # the description rotates by episode so the same need does not always
    # wear the same words, while a replay says the same thing every time.
    'mind.need.hunger': [
        'the thought of a hot meal keeps drifting back unasked',
        'something warm and filling would not be unwelcome',
        'the belly has begun to wonder when the next meal comes',
    ],
    'mind.need.hunger.deep': [
        'the hunger has gone from ache to companion — food is owed',
        'the stomach aches as if it were gnawing on itself',
        'food crowds every thought; the road is only the space between meals',
    ],
    'mind.need.thirst': [
        'the mouth keeps asking for the waterskin',
        'a cool stream would be the day\'s best gift',
        'each swallow has started to feel counted',
    ],
    'mind.need.thirst.deep': [
        'the throat is dry as bone — water cannot wait much longer',
        'the tongue cleaves to the roof of the mouth; the memory of rain is a cruelty',
        'every thought of water arrives with wanting attached',
    ],
    'mind.need.exhaustion': [
        'the legs ask for the day\'s end a little earlier each hour',
        'the body moves on credit, and the debt is showing',
    ],
    'mind.need.exhaustion.deep': [
        'the body is spent past caution — rest is no longer optional',
        'each step is borrowed from tomorrow, and tomorrow is already owed',
        'to stop moving and to fall asleep would be the same thing now',
    ],
    # The shadow's own arc: vague watchfulness first, then the dark starts
    # speaking in first person — suspicion, despair, the pull toward the
    # self over the company. How it gets in is quiet; where it points is not.
    'mind.need.unrest': [
        'a nameless watchfulness — the land seems to dislike being crossed',
        'the old songs sound hollower lately, and silence easier',
        'small kindnesses have started costing more effort than they should',
    ],
    'mind.need.unrest.deep': [
        'the shadow on the heart wants answering — solace, or an end to fear',
        'dark thoughts come unbidden — the company would move faster alone',
        'kindness begins to look like a trap laid slowly',
        'the dark at least is honest; it is the light that lies',
        'an ugly little voice keeps score of every slight',
    ],
    'mind.need.wound': [
        'a wound still unhealed — it wants tending before the road asks more',
        'the wound throbs with the pulse — it has not forgotten being made',
        'each mile reminds the flesh it is torn',
    ],
    'mind.need.wound.deep': [
        'the wound is worse than pain now — it is becoming the whole of the day',
        'the body can no longer pretend the wound is a passing thing',
    ],
    'mind.need.exposure': [
        'day upon day of hostile weather has worn the spirit thin — shelter is needed',
    ],
    'mind.need.thread': [
        'unfinished business with {subject} — the matter will not stay quiet',
    ],
    # Where a need comes from (the Lens brief): a Need always speaks with
    # its cause. {days} from the detector; {cause} is what the entering
    # mood carries — the shadow is told through what fed it.
    'mind.need_origin.hunger': ['{days} days without a proper meal'],
    'mind.need_origin.thirst': ['{days} days without enough water'],
    'mind.need_origin.exhaustion': ['the body has been spent faster than it rests'],
    'mind.need_origin.unrest': ['it has gathered since {cause}'],
    'mind.need_origin.unrest.nameless': ['the shadow has been gathering, nameless'],
    'mind.need_origin.wound': ['since the wound was taken'],
    # Event types that frame every Episode and never take the Focus
    # (ADR 0005): the engine's own items ('body', 'need') are excluded in
    # code; the world's frame types are declared here, per game.
    'mind.focus_excluded': ['travel', 'terrain', 'climate'],
    # Encounter readings (C16): the mind's one-line memory of contact —
    # {subject} the entity met, {detail} what passed (the host's resolved
    # substance, or the form's prose seed). A bare name is a census
    # entry, not a memory.
    'mind.encounter': [
        '{subject} — {detail}',
    ],
    # Pattern memories (B3): {subject} is the human end of the recurring
    # tag ('lembas', 'wolves', 'eriador'), {count} the episodes it hit.
    'mind.pattern': [
        '{subject} again — it is becoming the shape of these days',
        'another day of {subject}; the pattern is unmistakable now',
    ],
    # Recurrence channel (C5): repetition pressure is the wear of
    # sameness itself ({subject} = the human end of the tag, {count} =
    # consecutive episodes); a pattern break is the first day the
    # streak dies.
    'mind.repetition': [
        '{subject} again — the sameness is starting to wear',
        'another day of {subject}; it grates a little more',
    ],
    'mind.pattern_break': [
        'no {subject} today — the first break in the stretch',
        'the {subject} let up at last; the change itself is noticed',
    ],
    # C12: the streak broke the wrong way — what fed it ran out while a
    # need was already open. Warning, not relief.
    'mind.pattern_break_need': [
        'no {subject} today — the stretch ended the wrong way',
        'the {subject} is gone now; the days of it ended badly',
    ],
    # Decisions (B5): resolution line returned by /decide. {choice} is
    # the option label, {name} the character.
    'mind.decision': [
        'The choice is made: {choice}.',
        '{name} takes {choice}.',
    ],
}

# The Lens' word for how the day finds them — first band the valence
# falls under.
MOOD_BANDS = [
    {'below': -0.6, 'phrase': 'despairing'},
    {'below': -0.25, 'phrase': 'troubled'},
    {'below': 0.25, 'phrase': 'steady'},
    {'below': 0.6, 'phrase': 'heartened'},
    {'below': None, 'phrase': 'exultant'},
]


def phrases(key):
    """The variants the mind has for a phrase key ([] when undeclared)."""
    return list(PHRASES.get(key) or [])


def mood_phrase(valence):
    """First mood band whose threshold the valence falls under."""
    if valence is None:
        return None
    for band in MOOD_BANDS:
        if band['below'] is None or valence < band['below']:
            return band['phrase']
    return None


def humanize(value):
    """A slug is a key, not a name (C16): 'large_patrol' -> 'large
    patrol'. Applied only to slug fallbacks — authored names pass
    through upstream untouched."""
    if value is None:
        return None
    s = str(value).strip()
    return s.replace('_', ' ').replace('-', ' ') if s else None


def _first_string(values):
    """First non-empty string in an arbitrarily nested list/dict — event
    payloads flatten differently across hosts; readings dig until prose."""
    if isinstance(values, str):
        return values or None
    for v in values or []:
        if isinstance(v, str) and v:
            return v
        if isinstance(v, dict):
            found = _first_string(v.values())
        elif isinstance(v, list):
            found = _first_string(v)
        else:
            continue
        if found:
            return found
    return None


def resolve_event_reading(event):
    """One-line natural-language reading of an event's data — what the mind
    would say it noticed. A host-declared `data.reading` always wins (#53:
    the world says what it was; the mind consumes it). Undeclared events
    fall back to their subject — a name, never an invented sentence."""
    data = (event or {}).get('data') or {}
    etype = (event or {}).get('type')

    reading = data.get('reading')
    if reading:
        return reading

    if not data:
        return None
    # Readings are prose or nothing: raw fields are inputs to salience and
    # memory, never words. Host names outrank slugs.
    subject = (
        data.get('entity_name') or data.get('name') or data.get('title')
        or humanize(data.get('entity') or data.get('entity_id'))
    )
    if etype == 'meal':
        # A meal's name is what was served — slugs read as words, never
        # invented prose (declared readings win above, #53).
        return ', '.join(
            x for x in (humanize(data.get('food')),
                        humanize(data.get('drink'))) if x
        ) or subject
    if etype == 'terrain':
        return _first_string(
            data.get('terrain_phrases') or data.get('biomes')
        )
    if etype == 'rest':
        # The night is best told by the place's own authored description;
        # the bed's name is the fallback when the host sends none.
        place = data.get('place')
        return (
            data.get('description') or subject
            or (place if isinstance(place, str) else None)
        )
    if etype in ('travel', 'body'):
        # Vitals and mileage speak through needs/mood, never a reading.
        return None
    if etype == 'note':
        # A note IS prose — the data field is already words.
        return _first_string(data.get('note') or data.get('text'))
    if etype == 'encounter':
        # An encounter is a happening, not a noun (C16): the host's
        # resolved substance — what passed between them — leads; the
        # form's prose hint carries contact that had no words. The
        # pack owns the glue ({subject}, {detail}).
        substance = data.get('substance') or {}
        detail = substance.get('content') or data.get('prose_hint')
        if subject and detail:
            opts = phrases('mind.encounter')
            template = opts[0] if opts else '{subject} — {detail}'
            line = template.format(subject=subject, detail=detail)
            stance = substance.get('stance')
            return f'{line} {stance}' if stance else line
        return (str(subject) if subject else None) or detail
    return str(subject) if subject else None
