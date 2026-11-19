# ============================================================================
# Semantic pack — what a form of contact means (ADR 0017)
# ----------------------------------------------------------------------------
# The shared dictionary word->numbers. Events travel clean — facts and
# words, never feelings; a row here says what that word objectively means
# (`aid_or_trade` sediments trust, `attacks` sediments fear). The SAME
# row lands on every mind; the mind's Relations and Personality bend the
# landing — two characters read the same aid differently because of who
# they are, not because the aid meant something else.
#
# A row:
#   key    a tag pattern ('tag:form:attacks', wildcards allowed)
#   delta  the sparse relation-dim delta the world objectively carried
#   weight how strongly this kind of contact lands — seeing a city from
#          afar (sighted_far .15) is not walking its streets (entered .5);
#          the matched rows' max weight is the event's contact weight
#   body   an acute hit — the one exception to projected body ('wounded'
#          literally hurts)
#   salience_min / severity  the kind's declared floors — how much
#          contact of this kind must matter once noticed; what a tag IS,
#          not how loud it arrived. A floor-only row sets weight 0: it
#          declares meaning without claiming contact.
#
# `SEMANTIC_FIELDS` does for numeric data what tag rows do for tags:
# 'danger' is a host-declared fact (0-5) that objectively reads as menace
# — the same number scares one mind and bores another only downstream.
#
# Game-level overrides live in the `semantics` table, declared like
# Detectors: DEFAULT_SEMANTICS is the built-in pack.
# ============================================================================
from app.mind.util import tag_matches

DEFAULT_SEMANTICS = {
    # Contact forms — how the meeting happened.
    'tag:form:attacks': {
        'delta': {'fear': 0.5, 'affection': -0.2, 'trust': -0.1},
        'weight': 0.9, 'body': {'pain': 0.15}, 'salience_min': 0.6,
    },
    'tag:form:sudden_peril': {
        'delta': {'fear': 0.5, 'trust': -0.1}, 'weight': 0.8,
        'salience_min': 0.55,
    },
    'tag:form:confronts': {
        'delta': {'fear': 0.3, 'affection': -0.1, 'trust': -0.1},
        'weight': 0.6, 'salience_min': 0.5,
    },
    'tag:form:stalks': {
        'delta': {'fear': 0.25}, 'weight': 0.4, 'salience_min': 0.35,
    },
    'tag:form:hinders_passage': {
        'delta': {'affection': -0.15, 'trust': -0.05}, 'weight': 0.45,
        'salience_min': 0.4,
    },
    'tag:form:aid_or_trade': {
        'delta': {'affection': 0.15, 'trust': 0.3}, 'weight': 0.5,
        'salience_min': 0.5,
    },
    'tag:form:harvest_shelter': {
        'delta': {'affection': 0.25, 'trust': 0.3, 'familiarity': 0.15},
        'weight': 0.5, 'body': {'cold': -0.4}, 'salience_min': 0.45,
    },
    'tag:form:brief_exchange': {
        'delta': {'affection': 0.1, 'trust': 0.1, 'familiarity': 0.15},
        'weight': 0.45, 'salience_min': 0.45,
    },
    'tag:form:reacts_withdraws': {
        'delta': {'affection': 0.05, 'familiarity': 0.1}, 'weight': 0.35,
        'salience_min': 0.35,
    },
    'tag:form:drifts_closer': {
        'delta': {'familiarity': 0.1}, 'weight': 0.3,
        'salience_min': 0.3,
    },
    'tag:form:watches': {
        'delta': {'fear': 0.1, 'familiarity': 0.05}, 'weight': 0.3,
        'salience_min': 0.3,
    },
    # Contact without touch — the thing was registered, not met: signs,
    # glimpses, sounds, a presence felt. All of it is the familiarity
    # root ('I know this thing lives here'), the unseen ones carry a
    # touch of the uncanny — the howl unnerves, the footprint warns.
    'tag:form:observed_activity': {
        'delta': {'familiarity': 0.12}, 'weight': 0.3,
    },
    'tag:form:sign_only': {
        'delta': {'familiarity': 0.1, 'fear': 0.05}, 'weight': 0.25,
    },
    'tag:form:glimpsed_far': {
        'delta': {'familiarity': 0.08}, 'weight': 0.2,
    },
    'tag:form:sound_only': {
        'delta': {'familiarity': 0.06, 'fear': 0.08}, 'weight': 0.3,
    },
    'tag:form:presence_felt': {
        'delta': {'familiarity': 0.04, 'fear': 0.12}, 'weight': 0.35,
    },
    'tag:form:scenery': {
        'delta': {'familiarity': 0.05}, 'weight': 0.15,
    },
    'tag:form:passed_by': {
        'delta': {'familiarity': 0.06}, 'weight': 0.2,
    },
    'tag:form:mistaken_for_object': {
        'delta': {'familiarity': 0.08}, 'weight': 0.2,
    },
    # 'topic' is the generic contact fallback — words traded without an
    # authored form: a shade of an exchange.
    'tag:form:topic': {
        'delta': {'familiarity': 0.1, 'affection': 0.03}, 'weight': 0.3,
    },
    # Outcomes — how the meeting resolved.
    'tag:outcome:wounded': {
        'delta': {'fear': 0.3, 'trust': -0.1},
        'weight': 0.7, 'body': {'pain': 0.4},
    },
    'tag:outcome:badly wounded': {
        'delta': {'fear': 0.4, 'trust': -0.15},
        'weight': 0.85, 'body': {'pain': 0.6},
    },
    'tag:outcome:unscathed': {'delta': {'affection': 0.05}, 'weight': 0.3},
    'tag:outcome:slain': {
        'delta': {'fear': 0.6, 'trust': -0.2},
        'weight': 1.0, 'body': {'pain': 0.9},
    },
    # Sustenance — a meal is comfort AND it feeds the body.
    'type:meal': {
        'delta': {'affection': 0.15, 'trust': 0.05},
        'weight': 0.4, 'body': {'hunger': -0.5},
    },
    'tag:food:*': {'delta': {'affection': 0.15}, 'weight': 0.3},
    'tag:drink:*': {
        'delta': {'affection': 0.05}, 'weight': 0.25,
        'body': {'thirst': -0.4},
    },
    'type:rest': {
        'delta': {'affection': 0.05}, 'weight': 0.3,
        'body': {'fatigue': -0.4, 'cold': -0.1},
    },
    # What touched the mechanics: the world handed something over. A
    # decision stood in the day ('decision'); an applied command made
    # the contact no longer an offer ('changed'). Tiers so an offer
    # declined still registers under the day that took the bed.
    'tag:given': {
        'delta': {'affection': 0.25, 'trust': 0.25}, 'weight': 0.6,
        'salience_min': 0.6,
    },
    'tag:decision': {
        'delta': {}, 'weight': 0.0, 'salience_min': 0.5,
    },
    'tag:changed': {
        'delta': {}, 'weight': 0.0, 'salience_min': 0.65,
    },
    'tag:lodging:charity': {
        'delta': {'affection': 0.35, 'trust': 0.3},
        'weight': 0.5, 'body': {'cold': -0.3}, 'salience_min': 0.5,
    },
    'tag:lodging:shelter': {
        'delta': {}, 'weight': 0.0, 'salience_min': 0.45,
    },
    'tag:lodging:turned_away': {
        'delta': {'affection': -0.2, 'trust': -0.2}, 'weight': 0.5,
        'salience_min': 0.5,
    },
    # Weather — climate as contact: it presses the body, and the severe
    # tiers carry honest fear too. The severity floor makes the hard
    # day an *event* in the salience arithmetic — a storm day encodes,
    # a drizzle day stays background.
    'tag:weather:storm': {
        'delta': {'fear': 0.3, 'affection': -0.1},
        'weight': 0.4, 'body': {'cold': 0.1}, 'severity': 0.6,
    },
    'tag:weather:freezing': {
        'delta': {'affection': -0.1}, 'weight': 0.35, 'body': {'cold': 0.25},
        'severity': 0.3,
    },
    'tag:weather:snow': {
        'delta': {'affection': -0.05}, 'weight': 0.35, 'body': {'cold': 0.2},
        'severity': 0.45,
    },
    'tag:weather:deep_cold': {
        'delta': {'fear': 0.3, 'affection': -0.15},
        'weight': 0.5, 'body': {'cold': 0.3}, 'severity': 0.55,
    },
    'tag:weather:scorching': {
        'delta': {'affection': -0.1}, 'weight': 0.4, 'body': {'fatigue': 0.15},
        'severity': 0.5,
    },
    # The milder tiers the host also declares: a wet road, a gusty
    # ridge, a grey sky — small miseries, still honest.
    'tag:weather:wet': {
        'delta': {'affection': -0.05}, 'weight': 0.25,
        'body': {'cold': 0.1},
    },
    'tag:weather:windy': {
        'delta': {'affection': -0.03}, 'weight': 0.2,
        'body': {'cold': 0.05},
    },
    'tag:weather:overcast': {
        'delta': {'affection': -0.02}, 'weight': 0.15,
    },
    # Presence vs sighting — the distance IS the meaning: a city seen
    # from afar touches familiarity a little and nothing else.
    'tag:sighted_far': {'delta': {'familiarity': 0.05}, 'weight': 0.15},
    'tag:sighted': {'delta': {'familiarity': 0.1}, 'weight': 0.3},
    'tag:visited': {'delta': {'familiarity': 0.2}, 'weight': 0.4},
    'tag:entered': {
        'delta': {'familiarity': 0.3}, 'weight': 0.5,
        'salience_min': 0.55,
    },
    'tag:region_entered': {
        'delta': {'familiarity': 0.2}, 'weight': 0.55,
        'salience_min': 0.55,
    },
    'tag:settlement': {
        'delta': {'familiarity': 0.1}, 'weight': 0.3,
        'salience_min': 0.3,
    },
    'tag:hostile': {
        'delta': {'fear': 0.2}, 'weight': 0.45, 'salience_min': 0.45,
    },
    # What a place's nature gives away at a distance (the record's own
    # tags): a dead place is read by its absence, a dangerous one by its
    # warning, a sheltered one by its promise. Light shares — a sighting
    # tints the Relation, it does not fill it.
    'tag:dead_place': {
        'delta': {'fear': 0.07, 'affection': -0.04, 'familiarity': 0.05},
        'weight': 0.25,
    },
    'tag:danger': {'delta': {'fear': 0.12}, 'weight': 0.3},
    'tag:uncanny': {
        'delta': {'fear': 0.08, 'familiarity': 0.05}, 'weight': 0.25,
    },
    'tag:melancholy': {
        'delta': {'affection': -0.05, 'familiarity': 0.04},
        'weight': 0.2,
    },
    'tag:shelter': {
        'delta': {'affection': 0.05, 'trust': 0.04, 'familiarity': 0.05},
        'weight': 0.2,
    },
    'tag:sacred': {
        'delta': {'trust': 0.04, 'familiarity': 0.05}, 'weight': 0.2,
    },
    # The night itself, as the wire classifies it: how it rested and
    # how it was secured. Indoor muffles, open sky exposes, a poor
    # night costs the body what a good one returns.
    'tag:rest:indoor': {
        'delta': {}, 'weight': 0.2, 'body': {'cold': -0.2},
        'salience_min': 0.3,
    },
    'tag:rest:open_sky': {
        'delta': {'affection': -0.03}, 'weight': 0.2,
        'body': {'cold': 0.1},
    },
    'tag:rest:poor': {
        'delta': {'affection': -0.05}, 'weight': 0.3,
        'body': {'fatigue': 0.15}, 'salience_min': 0.3,
    },
    'tag:rest:good': {
        'delta': {'affection': 0.05}, 'weight': 0.25,
        'body': {'fatigue': -0.15},
    },
    'tag:lodging:paid': {
        'delta': {'affection': 0.1, 'familiarity': 0.1},
        'weight': 0.3, 'body': {'cold': -0.2}, 'salience_min': 0.35,
    },
    # The bare contact shapes — every perceived day touches where it
    # happened, even when nothing about it was an event in itself. A
    # light familiarity share is the "I know this stretch" channel:
    # useful without being valent. The land subtypes discriminate the
    # 'land' umbrella (place/terrain/region/water on the wire).
    'type:climate': {'delta': {'familiarity': 0.02}, 'weight': 0.1},
    'type:moment': {'delta': {'familiarity': 0.03}, 'weight': 0.15},
    'tag:subtype:terrain': {'delta': {'familiarity': 0.05}, 'weight': 0.2},
    'tag:subtype:water': {'delta': {'familiarity': 0.1}, 'weight': 0.3},
    'tag:subtype:place': {'delta': {'familiarity': 0.08}, 'weight': 0.25},
    'tag:subtype:region': {'delta': {'familiarity': 0.05}, 'weight': 0.2},
    # A being registered at all means it can be met again — the root of
    # familiarity growing by contact alone. And thinking company is
    # never background: entity_type floors lift a noticed encounter by
    # who it was — the base tier is people, monsters weight more,
    # mythic things most of all.
    'entity:*': {
        'delta': {'familiarity': 0.1}, 'weight': 0.3,
        'salience_min': 0.12,
    },
    'tag:entity_type:*': {
        'delta': {}, 'weight': 0.0, 'salience_min': 0.35,
    },
    'tag:entity_type:orcs': {
        'delta': {}, 'weight': 0.0, 'salience_min': 0.45,
    },
    'tag:entity_type:trolls': {
        'delta': {}, 'weight': 0.0, 'salience_min': 0.45,
    },
    'tag:entity_type:giants': {
        'delta': {}, 'weight': 0.0, 'salience_min': 0.45,
    },
    'tag:entity_type:living_trees': {
        'delta': {}, 'weight': 0.0, 'salience_min': 0.4,
    },
    'tag:entity_type:undead': {
        'delta': {}, 'weight': 0.0, 'salience_min': 0.5,
    },
    'tag:entity_type:demons': {
        'delta': {}, 'weight': 0.0, 'salience_min': 0.5,
    },
    'tag:entity_type:maiar': {
        'delta': {}, 'weight': 0.0, 'salience_min': 0.5,
    },
}

# Numeric data fields that carry objective meaning per unit — scaled by
# the event's contact weight like any tag delta.
DEFAULT_SEMANTIC_FIELDS = {
    'danger': {'fear': 0.1, 'affection': -0.05},
    'shadow_effect': {'fear': 0.1, 'affection': -0.1},
}

# A sighting is never full contact — however severe the thing seen.
SIGHTED_FAR_CAP = 0.15

# Condition -> body (ADR 0017): the continuous projection — the host's
# scalars read through this declared map, scale = units that saturate
# the dim. Detectors stay the need-firing vocabulary; this is the felt
# body. `invert` reads a resource field backwards (energy 35 = fatigue
# .65). Acute event hits land on top, next Condition resets the base.
BODY_PROJECTION = {
    'hunger':  {'field': 'days_without_food', 'scale': 5.0},
    'thirst':  {'field': 'days_without_water', 'scale': 3.0},
    'fatigue': {'field': 'energy', 'scale': 100.0, 'invert': True},
    'unrest':  {'field': 'shadow', 'scale': 100.0},
    'cold':    {'field': 'cold', 'scale': 1.0},
    'pain':    {'field': 'pain', 'scale': 1.0},
    'illness': {'field': 'illness', 'scale': 1.0},
}


def load_semantics(session, game_id):
    """The game's semantic pack: built-in defaults overridden/extended by
    `semantics` rows (per-game declared meaning, like Detectors)."""
    from app.mind.tables import Semantic
    pack = {k: dict(v) for k, v in DEFAULT_SEMANTICS.items()}
    for row in (
        session.query(Semantic)
        .filter_by(game_id=game_id, enabled=True)
        .all()
    ):
        pack[row.key] = {
            'delta': dict(row.delta or {}),
            'weight': row.weight,
            'body': dict(row.body or {}),
            'salience_min': row.salience_min,
            'severity': row.severity,
        }
    return pack


def tag_floors(tags, semantics):
    """The kind's declared floors (C6/C16): the strongest salience_min
    and severity across the pack rows these tags match. What a tag IS —
    thinking company is never background, a declared storm tier is an
    *event* — regardless of how quietly it arrived."""
    salience_min = severity = 0.0
    for key, row in (semantics or {}).items():
        if not any(tag_matches(t, key) for t in tags or []):
            continue
        salience_min = max(salience_min, row.get('salience_min') or 0.0)
        severity = max(severity, row.get('severity') or 0.0)
    return salience_min, severity


def semantic_delta(tags, data, semantics):
    """The event's objective reading: the summed sparse delta its matched
    semantic rows declare (each scaled by its row's contact weight), plus
    numeric fields at the event's overall contact weight.
    Returns (world_delta, contact_weight, body_hit)."""
    world, body_hit = {}, {}
    weight = 0.0
    for key, row in (semantics or {}).items():
        if not any(tag_matches(t, key) for t in tags or []):
            continue
        row_w = row.get('weight')
        weight = max(weight, row_w if row_w is not None else 0.5)
        for dim, v in (row.get('delta') or {}).items():
            world[dim] = world.get(dim, 0.0) + v * (row_w or 0.5)
        for dim, v in (row.get('body') or {}).items():
            body_hit[dim] = body_hit.get(dim, 0.0) + v
    contact = weight or 0.5
    for field, delta in DEFAULT_SEMANTIC_FIELDS.items():
        raw = (data or {}).get(field)
        if isinstance(raw, (int, float)) and not isinstance(raw, bool):
            for dim, v in delta.items():
                world[dim] = world.get(dim, 0.0) + v * raw * contact
    if (data or {}).get('sighted_far') and contact > SIGHTED_FAR_CAP:
        # Seen from afar: whatever heavier row matched, the sighting
        # carries only a sighting's share of it.
        scale = SIGHTED_FAR_CAP / contact
        world = {d: v * scale for d, v in world.items()}
        contact = SIGHTED_FAR_CAP
    return world, contact, body_hit
