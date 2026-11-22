# ============================================================================
# Voice — the mind's own words
# ----------------------------------------------------------------------------
# The phrase bank the mind uses to speak about ITSELF: needs, moods,
# misreads, repetitions, decisions. The constants here are the built-in
# pack; a game's `pack_entries` row replaces any key's value wholesale
# ('mind.need.hunger' -> variants, 'mind.mood_bands' -> bands,
# 'mind.mood_wheel' -> mood-space sectors, 'mind.feeling_lexicon'
# -> entries, 'mind.disposition_render' -> map)
# and enabled=False silences the key entirely.
#
# The world's words never live here: the host declares prose and tags on
# the wire (issues #52/#53 — `day.world_notes`, `event.data.reading`) and
# the mind consumes them verbatim. What remains is interiority only.
# ============================================================================
import logging
import math
import time

from app.mind.events import flat_data
from app.mind.tables import PackEntry
from app.mind.util import tag_matches

log = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 30
_entry_cache = {}
_SILENCED = object()


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
    'mind.need.gloom': [
        'day upon day beneath a sunless sky — the light itself is missed',
    ],
    'mind.need.thread': [
        'unfinished business with {subject} — the matter will not stay quiet',
    ],
    # Where a need comes from (the Lens brief): a Need always speaks with
    # its cause. {days} from the detector; {cause} is what the entering
    # mood carries — the shadow is told through what fed it.
    'mind.need_origin.hunger': ['{days_text} without a proper meal'],
    'mind.need_origin.thirst': ['{days_text} without enough water'],
    'mind.need_origin.exhaustion': ['the body has been spent faster than it rests'],
    'mind.need_origin.unrest': ['it has gathered since {cause}'],
    'mind.need_origin.unrest.nameless': ['the shadow has been gathering, nameless'],
    'mind.need_origin.wound': ['since the wound was taken'],
    'mind.need_origin.gloom': ['{days_text} beneath a sunless sky'],
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
    # C12/#148: the streak that ended was loved or needed — the bread
    # ran out, the good rain stopped. The gap is felt, not the relief.
    'mind.pattern_break_loss': [
        'no {subject} today — and the gap of it is felt',
        'the {subject} is gone now; something steady went with it',
    ],
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
# falls under. A game declares its own under 'mind.mood_bands'.
MOOD_BANDS_KEY = 'mind.mood_bands'
MOOD_BANDS = [
    {'below': -0.6, 'phrase': 'despairing'},
    {'below': -0.25, 'phrase': 'troubled'},
    {'below': 0.25, 'phrase': 'steady'},
    {'below': 0.6, 'phrase': 'heartened'},
    {'below': None, 'phrase': 'exultant'},
]

# The point's name in mood space (valence × arousal) — a wheel of
# twelve sectors matching the Studio circumplex: the sector's word at
# full strength in the outer ring, softened near the centre, 'steady'
# inside the Neutral core. 'mind.mood_wheel' replaces it per game.
MOOD_WHEEL_KEY = 'mind.mood_wheel'
# (centre angle ° from +valence, counterclockwise → outer word, inner)
MOOD_WHEEL = [
    ( 16, 'happy',      'heartened'),
    ( 45, 'excited',    'eager'),
    ( 74, 'alert',      'watchful'),
    (106, 'afraid',     'uneasy'),
    (135, 'angry',      'irritated'),
    (164, 'distressed', 'worried'),
    (196, 'sad',        'melancholy'),
    (225, 'depressed',  'melancholy'),
    (254, 'bored',      'listless'),
    (286, 'calm',       'settled'),
    (315, 'relaxed',    'mellow'),
    (344, 'content',    'pleased'),
]
# Inside the Neutral core the word is always 'steady'; past the inner
# ring (0.5R on the disc) the sector speaks at full strength, and past
# 0.8R the extremes take over — despairing and exultant are depths of
# the whole state, not angles of it.
MOOD_NEUTRAL_R = 0.22
MOOD_FULL_R = 0.5
MOOD_EXTREME_R = 0.8

# Old words that land on a canonical wheel point (#184): 'tense' is
# human-felt 'afraid' — hundreds of authored `tag:felt:tense` rows and
# stored pulls still say it, and every one aterriza en el mismo punto.
FELT_ALIAS = {
    'tense': 'afraid',
}

# Where a felt word pulls TO: the soft ring's centre, the strong
# ring's centre, the rim for extremes, the origin for 'steady'.
_PULL_SOFT_R = (MOOD_NEUTRAL_R + MOOD_FULL_R) / 2.0   # 0.36
_PULL_STRONG_R = (MOOD_FULL_R + MOOD_EXTREME_R) / 2.0  # 0.65
_PULL_EXTREME_R = 0.9

# Which wheel word a contact kind pulls toward (the felt channel as
# pack data, #184): a tag pattern -> the word its events carry. A
# 'mind.felt_map' pack_entries row replaces it wholesale per game.
# Host-authored `tag:felt:*` tags never need a row — the tag names
# the word itself.
FELT_MAP_KEY = 'mind.felt_map'
# One word per event — order IS precedence: the body's verdict
# outranks the manner, the manner outranks the choice, and a plain
# 'it worked' says least of all.
FELT_MAP = {
    # The body's verdicts — wounds and death are the day's real tone.
    'tag:outcome:slain': 'despairing',
    'tag:outcome:badly wounded': 'distressed',
    'tag:outcome:wounded': 'distressed',
    # A failed pick worries before anything else about it.
    'tag:outcome:failure': 'worried',
    # Contact forms — how the meeting happened feels.
    'tag:form:attacks': 'distressed',
    'tag:form:sudden_peril': 'afraid',
    'tag:form:confronts': 'afraid',
    'tag:form:stalks': 'uneasy',
    'tag:form:hinders_passage': 'irritated',
    'tag:form:aid_or_trade': 'heartened',
    'tag:form:harvest_shelter': 'settled',
    'tag:form:brief_exchange': 'pleased',
    'tag:form:watches': 'uneasy',
    'tag:form:sign_only': 'watchful',
    'tag:form:sound_only': 'uneasy',
    'tag:form:presence_felt': 'uneasy',
    'tag:form:glimpsed_far': 'watchful',
    'tag:form:observed_activity': 'watchful',
    'tag:form:drifts_closer': 'watchful',
    'tag:form:reacts_withdraws': 'relaxed',
    'tag:form:scenery': 'calm',
    'tag:form:mistaken_for_object': 'pleased',
    # Acts — the choice's own tone when the row declares no felt:* of
    # its own; 'avoided it' relieves more than 'it worked' pleases.
    'tag:act:rest': 'settled',
    'tag:act:talk': 'pleased',
    'tag:act:trade': 'pleased',
    'tag:act:accept': 'pleased',
    'tag:act:help': 'heartened',
    'tag:act:approach': 'eager',
    'tag:act:avoid': 'settled',
    'tag:act:defy': 'afraid',
    # Bare success — the weakest verdict, last so any real tone wins.
    'tag:outcome:unscathed': 'heartened',
    'tag:outcome:success': 'pleased',
    # Sustenance and beds — the comfort channel. The bare types carry
    # no tone (a haunted rest is not 'settled'); quality tags decide.
    'tag:food:*': 'settled',
    'tag:drink:*': 'settled',
    'tag:given': 'heartened',
    'tag:lodging:charity': 'content',
    'tag:lodging:shelter': 'settled',
    'tag:lodging:paid': 'settled',
    'tag:lodging:turned_away': 'sad',
    'tag:rest:indoor': 'settled',
    'tag:rest:good': 'settled',
    'tag:rest:poor': 'listless',
    'tag:rest:open_sky': 'uneasy',
    # Weather — the sky's tone.
    'tag:weather:storm': 'afraid',
    'tag:weather:deep_cold': 'afraid',
    'tag:weather:freezing': 'uneasy',
    'tag:weather:scorching': 'irritated',
    # Menace declared.
    'tag:hostile': 'afraid',
}

# Streak subjects that are not the tag's tail (#147): non-noun tags need
# a worded subject — 'the poor let up at last' is broken English, 'the
# sleepless nights let up' is the thought the streak carries.
STREAK_SUBJECTS_KEY = 'mind.streak_subjects'
STREAK_SUBJECTS = {
    'tag:rest:poor': 'sleepless nights',
}


def _game_entries(session, game_id):
    """All pack_entries for a game, cached briefly — pack data is config,
    not hot data (same TTL discipline as detectors)."""
    entry = _entry_cache.get(game_id)
    if entry and time.monotonic() - entry['at'] < CACHE_TTL_SECONDS:
        return entry['values']
    values = {}
    if session is not None and game_id:
        try:
            for row in (
                session.query(PackEntry).filter_by(game_id=game_id).all()
            ):
                values[row.key] = row.value if row.enabled else _SILENCED
        except Exception as exc:  # DB down: run on the built-in pack
            log.warning('pack entries load failed for %s: %s', game_id, exc)
    _entry_cache[game_id] = {'at': time.monotonic(), 'values': values}
    return values


def invalidate_entries(game_id=None):
    """Drop cached pack entries — call after admin edits."""
    if game_id is None:
        _entry_cache.clear()
    else:
        _entry_cache.pop(game_id, None)


def pack_value(session, game_id, key, default):
    """One pack key's value: the game's declared row wins wholesale, a
    disabled row silences the key (None), no row keeps the default."""
    values = _game_entries(session, game_id)
    if key not in values:
        return default
    v = values[key]
    return None if v is _SILENCED else v


def phrases(key, session=None, game_id=None):
    """The variants the mind has for a phrase key ([] when undeclared
    or silenced)."""
    return list(pack_value(session, game_id, key, PHRASES.get(key) or []) or [])


def streak_subjects(session=None, game_id=None):
    """{tag: worded subject} — exact-tag overrides for streak readings."""
    return dict(
        pack_value(session, game_id, STREAK_SUBJECTS_KEY, STREAK_SUBJECTS)
        or {}
    )


def mood_phrase(valence, session=None, game_id=None):
    """First mood band whose threshold the valence falls under."""
    if valence is None:
        return None
    bands = pack_value(session, game_id, MOOD_BANDS_KEY, MOOD_BANDS) or []
    for band in bands:
        if band.get('below') is None or valence < band['below']:
            return band.get('phrase')
    return None


def mood_name(mood, session=None, game_id=None):
    """The word for a point in mood space — the sector of the wheel it
    sits in (the same names the Studio disc draws), softened inside the
    inner ring and 'steady' at the Neutral core. Valence bands remain
    the fallback for a game without a wheel."""
    mood = mood or {}
    v = mood.get('valence') or 0.0
    a = mood.get('arousal') or 0.0
    wheel = pack_value(session, game_id, MOOD_WHEEL_KEY, MOOD_WHEEL) or []
    if not wheel:
        return mood_phrase(v, session, game_id)
    r = math.hypot(v, a)
    if r < MOOD_NEUTRAL_R:
        return 'steady'
    if r >= MOOD_EXTREME_R:
        if v <= -0.45:
            return 'despairing'
        if v >= 0.6:
            return 'exultant'
    deg = math.degrees(math.atan2(a, v)) % 360
    _, strong, soft = min(
        wheel, key=lambda w: abs((deg - w[0] + 180) % 360 - 180))
    return strong if r >= MOOD_FULL_R else soft


def _polar(deg, r):
    rad = math.radians(deg)
    return {'valence': r * math.cos(rad), 'arousal': r * math.sin(rad)}


def mood_point(word, session=None, game_id=None):
    """The wheel point a felt word pulls toward (#184): soft words sit
    at the inner ring's centre, strong at the outer's, the extremes at
    the rim, 'steady' at the origin. None for words off the wheel."""
    if not word:
        return None
    word = FELT_ALIAS.get(word, word)
    if word == 'steady':
        return {'valence': 0.0, 'arousal': 0.0}
    if word == 'despairing':
        return _polar(180, _PULL_EXTREME_R)
    if word == 'exultant':
        return _polar(0, _PULL_EXTREME_R)
    wheel = pack_value(session, game_id, MOOD_WHEEL_KEY, MOOD_WHEEL) or []
    for deg, strong, soft in wheel:
        if word == strong:
            return _polar(deg, _PULL_STRONG_R)
        if word == soft:
            return _polar(deg, _PULL_SOFT_R)
    return None


def felt_word(tags, session=None, game_id=None):
    """THE felt pull the event carries (#184) — one word, not a chord:
    a `tag:felt:<word>` tag names its word outright and beats the pack
    (the host's declared tone over the generic map's); the felt_map
    fills in the tone of contacts that declare none ('attacks' →
    afraid). Blending two tones produced mud — one event, one pull."""
    for t in tags or []:
        if t.startswith('tag:felt:'):
            return FELT_ALIAS.get(
                t[len('tag:felt:'):], t[len('tag:felt:'):])
    felt_map = pack_value(session, game_id, FELT_MAP_KEY, FELT_MAP) or {}
    for key, word in felt_map.items():
        if any(tag_matches(t, key) for t in tags or []):
            word = word if isinstance(word, str) else word[0]
            return FELT_ALIAS.get(word, word)
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


def resolve_event_reading(event, session=None, game_id=None):
    """One-line natural-language reading of an event's data — what the mind
    would say it noticed. A host-declared `data.reading` always wins (#53:
    the world says what it was; the mind consumes it). Undeclared events
    fall back to their subject — a name, never an invented sentence."""
    data = flat_data(event)
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
    # The kind registry declares how each type is worded — a new kind is
    # a registry entry (or a pack 'mind.kinds' row), not an engine
    # branch here (#167). Lazy import: kinds.py reads pack_value.
    from app.mind.kinds import kind_of
    strategy = kind_of(session, game_id, etype).get('reading', 'declared')
    if strategy == 'silent':
        # Mileage and body reports speak through the condition, never a
        # reading.
        return None
    if strategy == 'meal':
        # A meal's name is what was served — slugs read as words, never
        # invented prose (declared readings win above, #53).
        return ', '.join(
            x for x in (humanize(data.get('food')),
                        humanize(data.get('drink'))) if x
        ) or subject
    if strategy == 'terrain' or data.get('subtype') == 'terrain':
        return _first_string(
            data.get('terrain_phrases') or data.get('biomes')
        )
    if strategy == 'rest':
        # The night is best told by the place's own authored description;
        # the bed's name is the fallback when the host sends none.
        place = data.get('place')
        return (
            data.get('description') or subject
            or (place if isinstance(place, str) else None)
        )
    if strategy == 'note':
        # A note IS prose — the data field is already words.
        return _first_string(data.get('note') or data.get('text'))
    if strategy == 'encounter':
        # An encounter is a happening, not a noun (C16): the host's
        # resolved substance — what passed between them — leads; the
        # form's prose hint carries contact that had no words. The
        # pack owns the glue ({subject}, {detail}).
        substance = data.get('substance') or {}
        detail = substance.get('content') or data.get('prose_hint')
        if subject and detail:
            opts = phrases('mind.encounter', session, game_id)
            template = opts[0] if opts else '{subject} — {detail}'
            line = template.format(subject=subject, detail=detail)
            stance = substance.get('stance')
            return f'{line} {stance}' if stance else line
        return (str(subject) if subject else None) or detail
    return str(subject) if subject else None
