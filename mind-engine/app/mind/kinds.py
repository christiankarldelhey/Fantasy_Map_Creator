"""Kind Registry — the declared contract of event types (#167).

`EventIn.type` and `EventIn.data` are open on the wire on purpose: the
world invents kinds, the Mind consumes them through declarations, not
conditionals. This registry is the declaration point. Each kind says:

- `role`      — 'frame' (day context, never the Focus), 'moment'
                (something that happened, Focus-eligible) or 'voice'
                (the mind's own body speaking, e.g. needs).
- `source`    — 'world' | 'ambient' | 'mind' | 'decision'. World and
                ambient items are evidence of the day; 'mind' items are
                the Mind's bookkeeping (needs, recurrence) — they feel
                and speak but never count as world-evidence for
                reflection or streak detection.
- `reading`   — how `resolve_event_reading` words it: 'declared'
                (host's data.reading, else the subject's name — the
                default for every undeclared kind), 'silent' (never a
                line of prose: travel mileage, body reports), or one of
                the named strategies ('meal', 'terrain', 'rest', 'note',
                'encounter').
- `mood_cause`— whether the item may be named what moved the mood
                (needs cannot — 'the hunger' is the lens's own voice,
                not a cause of the day).
- `encodes`   — whether the item may consolidate as a memory
                (default true; `data.synthetic` remains the per-item
                veto for bookkeeping like repetition pressure).
- `fields`    — the data keys the kind expects (documentation of the
                contract; host-declared fields always pass through).
- `subjects`  — which fields/tags of this kind are meant to feed
                Relations when present (documentation; subject
                extraction itself stays generic in `derive_tags`).

The built-in registry below is the pack default. A game overrides or
extends it through pack_entries key 'mind.kinds' — a dict of
{kind: partial entry} merged per-kind over these defaults. Adding a new
kind is data: declare it in the pack (or in the event's own payload —
see `kind_of`), never in engine code.
"""
from .voice import pack_value

KINDS_KEY = 'mind.kinds'

# The three roles an item can play in the day.
ROLE_FRAME = 'frame'    # context — narrates, never takes the Focus
ROLE_MOMENT = 'moment'  # something that happened — Focus-eligible
ROLE_VOICE = 'voice'    # the mind's own body speaking (needs)

SOURCE_WORLD = 'world'
SOURCE_AMBIENT = 'ambient'
SOURCE_MIND = 'mind'
SOURCE_DECISION = 'decision'

# The fallback every undeclared kind gets: a worldly moment whose words
# are the host's reading or the subject's name.
_UNKNOWN_KIND = {
    'role': ROLE_MOMENT, 'source': SOURCE_WORLD, 'reading': 'declared',
}

DEFAULT_KINDS = {
    # --- the day's frame: weather, land, mileage. They colour every
    # moment but never take the Focus (absorbs mind.focus_excluded's
    # built-in list and the engine frame types).
    'climate': {
        'role': ROLE_FRAME, 'source': SOURCE_AMBIENT,
        'reading': 'declared',
        'fields': ['weather', 'cold', 'wind', 'reading'],
        'subjects': ['weather'],
    },
    'terrain': {
        'role': ROLE_FRAME, 'source': SOURCE_AMBIENT,
        'reading': 'terrain',
        'fields': ['subtype', 'terrain_phrases', 'biomes', 'difficulty'],
        'subjects': ['place'],
    },
    # 'land' and 'water' are moments: a crossing or a stretch of country
    # can take the Focus. Only their 'terrain' SUBTYPE frames them —
    # matching the pre-registry subtype exclusion.
    'land': {
        'role': ROLE_MOMENT, 'source': SOURCE_AMBIENT,
        'reading': 'declared',
        'fields': ['subtype', 'terrain_phrases', 'biomes', 'place'],
        'subjects': ['place'],
    },
    'water': {
        'role': ROLE_MOMENT, 'source': SOURCE_AMBIENT,
        'reading': 'declared',
        'fields': ['subtype', 'place', 'reading'],
        'subjects': ['place'],
    },
    'travel': {
        'role': ROLE_FRAME, 'source': SOURCE_WORLD,
        'reading': 'silent',
        'fields': ['distance_km', 'pace', 'difficulty'],
        'subjects': [],
    },
    'body': {
        'role': ROLE_FRAME, 'source': SOURCE_WORLD,
        'reading': 'silent',
        'fields': ['pain', 'fever', 'exhaustion'],
        'subjects': [],
    },
    # --- moments: what happened, Focus-eligible, encodable.
    'encounter': {
        'role': ROLE_MOMENT, 'source': SOURCE_WORLD,
        'reading': 'encounter',
        'fields': ['entity', 'entity_name', 'npc', 'npc_name', 'form',
                   'substance', 'prose_hint', 'danger', 'outcome'],
        'subjects': ['entity', 'npc', 'family', 'race', 'entity_type'],
    },
    'contact': {
        'role': ROLE_MOMENT, 'source': SOURCE_WORLD,
        'reading': 'encounter',
        'fields': ['entity', 'entity_name', 'form', 'substance'],
        'subjects': ['entity', 'npc', 'family', 'race', 'entity_type'],
    },
    'meal': {
        'role': ROLE_MOMENT, 'source': SOURCE_WORLD,
        'reading': 'meal',
        'fields': ['food', 'drink', 'reading', 'entity_name', 'place'],
        'subjects': ['food', 'drink'],
    },
    'rest': {
        'role': ROLE_MOMENT, 'source': SOURCE_WORLD,
        'reading': 'rest',
        'fields': ['place', 'description', 'quality', 'shelter'],
        'subjects': ['place'],
    },
    'note': {
        'role': ROLE_MOMENT, 'source': SOURCE_WORLD,
        'reading': 'note',
        'fields': ['note', 'text'],
        'subjects': [],
    },
    'place': {
        'role': ROLE_MOMENT, 'source': SOURCE_WORLD,
        'reading': 'declared',
        'fields': ['place', 'name', 'subtype', 'description'],
        'subjects': ['place'],
    },
    'moment': {
        'role': ROLE_MOMENT, 'source': SOURCE_WORLD,
        'reading': 'declared',
        'fields': ['reading', 'subtype', 'entity', 'place'],
        'subjects': ['entity', 'place'],
    },
    # --- the mind's own items: they feel and speak but are never
    # world-evidence — no streaks, no reflection spikes, no Focus.
    'need': {
        'role': ROLE_VOICE, 'source': SOURCE_MIND,
        'reading': 'declared', 'mood_cause': False,
        'fields': ['need', 'urgency'],
        'subjects': [],
    },
    'recurrence': {
        'role': ROLE_MOMENT, 'source': SOURCE_MIND,
        'reading': 'declared',
        'fields': ['kind', 'anchor', 'streak', 'synthetic'],
        'subjects': [],
    },
}


def kinds(session=None, game_id=None):
    """The game's kind registry: the built-in defaults merged per-kind
    with the pack's 'mind.kinds' entries. A pack row for kind 'meal'
    overrides only the keys it declares."""
    merged = {k: dict(v) for k, v in DEFAULT_KINDS.items()}
    pack = pack_value(session, game_id, KINDS_KEY, {}) or {}
    if isinstance(pack, dict):
        for kind, entry in pack.items():
            if isinstance(entry, dict):
                merged.setdefault(kind, {}).update(entry)
    return merged


def kind_of(session, game_id, etype):
    """The registry entry for one kind; undeclared kinds are worldly
    moments by default — the contract's open door."""
    if not etype:
        return dict(_UNKNOWN_KIND)
    entry = kinds(session, game_id).get(etype)
    return dict(entry) if entry else dict(_UNKNOWN_KIND)


def is_mind_item(item):
    """The item is the Mind's own bookkeeping, not world-evidence —
    needs, recurrence pressure and breaks. `source` is stamped at
    perceive time; the type check covers rows persisted before the
    stamp existed."""
    if not item:
        return False
    return (
        item.get('source') == SOURCE_MIND
        or item.get('type') in ('need', 'recurrence')
    )
