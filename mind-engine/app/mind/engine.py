# ============================================================================
# Engine — the vector substrate's arithmetic (ADR 0017)
# ----------------------------------------------------------------------------
# Pure functions over sparse dict vectors. The alphabet:
#   relations {affection, trust} −1..1 (hatred, active distrust)
#             {fear, familiarity} 0..1 (fear has no single opposite)
#   mood      {valence, arousal, dominance} −1..1
#   body      {hunger, thirst, cold, fatigue, pain, illness…} 0..1
#   temperament — a point in mood space the mood regresses to
#
# Two channels per perceived event: the *world* delta sediments the
# Relation (what objectively happened — a favour sediments as trust);
# a `felt:*` word pulls the Mood toward its wheel point, refracted by
# the standing Relation (the rain-lover's melancholy lands as comfort,
# the hater's as dread — the tag names the tone, the bond where it
# lands).
# ============================================================================
import math

from app.mind.util import OPS

RELATION_DIMS = ('affection', 'trust', 'fear', 'familiarity')
MOOD_DIMS = ('valence', 'arousal', 'dominance')
_BIPOLAR = frozenset({'affection', 'trust'})
# The share of an entity-level delta that splashes onto the broader
# subject (the elf you met sediments 'entity:her' whole, 'entity_type:
# elves' at this share — loving her slowly softens the race).
CATEGORY_SPLASH = 0.3
# The share of a memory's imprint that re-fires on evocation — a
# recollection is felt, never as much as living it.
EVOKE_SHARE = 0.3

# Relation → Mood coupling: what a moved dim feels like.
W_RM = {
    'affection':   {'valence': 1.0},
    'trust':       {'valence': 0.5, 'dominance': 0.5},
    'fear':        {'arousal': 0.8, 'dominance': -0.4, 'valence': -0.6},
    'familiarity': {'arousal': -0.3},
}

# The body's load on mood — each projected dim drags valence down by
# its share and raises arousal a little (a hard body is a loud body).
W_BODY = {
    'default': {'valence': -0.4, 'arousal': 0.1},
}

# The feeling lexicon, evaluated in order — first match wins. Patterns
# are over a flat vector (relation dims, mood dims and held counts can
# all appear); longer-held feelings win by appearing earlier here.
FEELING_LEXICON = [
    {'feeling': 'dread',
     'when': {'fear': ('>=', 0.7), 'dominance': ('<=', -0.3)}},
    {'feeling': 'deep friendship',
     'when': {'affection': ('>=', 0.6), 'trust': ('>=', 0.6),
              'familiarity': ('>=', 0.6)}},
    {'feeling': 'feared and hated',
     'when': {'fear': ('>=', 0.4), 'affection': ('<=', -0.4)}},
    {'feeling': 'hatred',
     'when': {'affection': ('<=', -0.6)}},
    {'feeling': 'distrust',
     'when': {'trust': ('<=', -0.4)}},
    {'feeling': 'fear',
     'when': {'fear': ('>=', 0.5)}},
    {'feeling': 'wary',
     'when': {'fear': ('>=', 0.2)}},
    {'feeling': 'fondness',
     'when': {'affection': ('>=', 0.4)}},
    {'feeling': 'gratitude',
     'when': {'affection': ('>=', 0.2), 'trust': ('>=', 0.2)}},
    {'feeling': 'warmth',
     'when': {'affection': ('>=', 0.2)}},
    {'feeling': 'melancholy',
     'when': {'valence': ('<=', -0.5), 'arousal': ('<=', -0.2)}},
]


def _clip(dim, v):
    """A dim's legal range — bipolar dims live in −1..1, the rest 0..1."""
    lo = -1.0 if dim in _BIPOLAR or dim in MOOD_DIMS else 0.0
    return max(lo, min(1.0, v))


def add_delta(vec, delta, scale=1.0):
    """vec += delta * scale, clipped per dim. Sparse in, sparse out."""
    for dim, v in (delta or {}).items():
        vec[dim] = _clip(dim, vec.get(dim, 0.0) + v * scale)
    return vec


# ---- felt pull (event -> mood, #184) --------------------------------
# A `felt:*` tag names a point on the mood wheel; the Mood is PULLED
# toward it — never a blind delta, never past the point. The standing
# Relation refracts where the tone lands and how hard: `rel_point` is
# what the source already feels like to this mind (W_RM read over the
# standing vector, same projection), and the pull's target blends the
# declared tone with it, weighted by how much the source matters.
#
# gain = salience × (PULL_BASE + |standing|) × moodiness × (1+affinity)
#   salience  — the event's own weight
#   |standing| — how much the source means to this mind (unknown things
#                still register at PULL_BASE)
#   moodiness — the Personality's susceptibility (same alpha as regress:
#                a moody mind chases pulls and drifts back fast)
#   affinity  — cosine Temperament↔target: a melancholic yields more
#                easily toward melancholy, resists being cheered up
PULL_BASE = 0.7


def mood_position(relation):
    """The standing Relation read as a mood-space point — W_RM · vec,
    the same projection, reading WHERE a subject sits for this mind
    (its refracto point)."""
    p = mood_delta(relation or {})
    return {
        'valence': p.get('valence', 0.0),
        'arousal': p.get('arousal', 0.0),
    }


def standing_magnitude(relation):
    """How much a subject means to this mind, 0..1 — ||standing||/2
    (all four dims at full give 1.0)."""
    return min(1.0, math.sqrt(sum(
        (relation or {}).get(d, 0.0) ** 2 for d in RELATION_DIMS
    )) / 2.0)


def pull_target(tag_point, rel_point, standing_mag):
    """The event's felt word refracted through the bond: w = |standing|
    blends the declared tone toward what the source already feels like
    — unknown things land as authored, loved/hated things refract."""
    w = min(1.0, standing_mag)
    return {
        d: tag_point[d] * (1.0 - w) + rel_point.get(d, 0.0) * w
        for d in ('valence', 'arousal')
    }


def pull_affinity(temperament, target):
    """Cosine between the Temperament's direction and the target's —
    a moody pull lands easier where the mind already leans."""
    tm = math.hypot(
        (temperament or {}).get('valence', 0.0),
        (temperament or {}).get('arousal', 0.0))
    tt = math.hypot(target.get('valence', 0.0), target.get('arousal', 0.0))
    if tm < 1e-6 or tt < 1e-6:
        return 0.0
    dot = sum(
        (temperament or {}).get(d, 0.0) * target.get(d, 0.0)
        for d in ('valence', 'arousal'))
    return dot / (tm * tt)


def pull_gain(salience, standing_mag, moodiness, affinity):
    """The pull's step 0..1 — the event's weight through the bond's
    hold and the Personality's yield."""
    return min(1.0, max(0.0,
        salience * (PULL_BASE + standing_mag) * moodiness
        * (1.0 + affinity)))


def apply_pull(mood, target, gain):
    """Move the mood a share of the way toward the target — proportional,
    bounded, never overshooting: a light tug gets closer but not there."""
    for dim in MOOD_DIMS:
        if dim not in target:
            continue
        mood[dim] = _clip(
            dim,
            mood.get(dim, 0.0)
            + (target[dim] - mood.get(dim, 0.0)) * gain)
    return mood


def sediment(vec, delta, resistance=0.0):
    """The world delta lands on the Relation. Asymmetric resistance: a
    delta that CONTRADICTS the standing feeling is damped by the
    Personality's resistance; one that confirms it enters whole — a
    stubborn mind is slow to learn it was wrong, quick to be proven
    right."""
    for dim, v in (delta or {}).items():
        standing = vec.get(dim, 0.0)
        factor = (1.0 - resistance) if v * standing < 0 else 1.0
        vec[dim] = _clip(dim, standing + v * factor)
    return vec


def mood_delta(felt):
    """A relation-dim vector read in mood space: W_RM · vec, clipped —
    what those dims sit as on the mood plane. Reads both a felt delta
    and a standing Relation (mood_position's projection)."""
    out = {}
    for dim, v in (felt or {}).items():
        for mdim, w in (W_RM.get(dim) or {}).items():
            out[mdim] = out.get(mdim, 0.0) + v * w
    return {d: _clip(d, v) for d, v in out.items()}


def weigh_body(mood, body):
    """The projected body drags the mood — hunger, cold and pain pull
    valence down by their share."""
    for dim, v in (body or {}).items():
        w = W_BODY.get(dim) or W_BODY['default']
        for mdim, gain in w.items():
            mood[mdim] = _clip(mdim, mood.get(mdim, 0.0) + v * gain)
    return mood


def regress(mood, temperament, alpha):
    """Inertia: each quiet episode the mood drifts a share α (the
    Personality's moodiness) back toward the Temperament."""
    for dim in MOOD_DIMS:
        rest = (temperament or {}).get(dim, 0.0)
        mood[dim] = _clip(dim, mood.get(dim, 0.0) + alpha * (rest - mood.get(dim, 0.0)))
    return mood


def decay(vec, rate):
    """Relations cool toward indifference — every dim shrinks toward
    zero, never crossing its sign: the fear lets go, the love stays
    love."""
    for dim in list(vec):
        vec[dim] = _clip(dim, vec[dim] * rate)
    return vec


def project_body(condition, mapping):
    """Condition → body dims: a declared field→dim map ({'hunger':
    {'field': 'days_without_food', 'scale': 5}}) — scale is how many
    units saturate the dim, so 3 days without food at scale 5 is 0.6.
    Detectors evolve into this mapping. `invert` reads a resource-style
    field the other way — 'energy' 35 is fatigue .65."""
    body = {}
    for dim, spec in (mapping or {}).items():
        raw = (condition or {}).get(spec['field'])
        if isinstance(raw, (int, float)) and not isinstance(raw, bool):
            v = raw / (spec.get('scale') or 1.0)
            body[dim] = _clip(dim, (1.0 - v) if spec.get('invert') else v)
    return body


def acute_hit(body, hit):
    """The one exception to projected body: an Event lands a direct
    blow ('wounded' → pain:+0.4) that decays back to what the next
    Condition reports."""
    return add_delta(body, hit)


def feeling_lexicon(session, game_id):
    """The game's declared feeling vocabulary — a 'mind.feeling_lexicon'
    pack_entries row replaces the built-in list wholesale."""
    from app.mind.voice import pack_value
    return pack_value(
        session, game_id, 'mind.feeling_lexicon', FEELING_LEXICON
    ) or []


def derive_feeling(vector, lexicon=None):
    """The first lexicon pattern the live state satisfies — numbers
    stay physics; the word is what the narration carries."""
    for entry in lexicon or FEELING_LEXICON:
        if all(_holds(vector.get(dim, 0.0), rule)
               for dim, rule in (entry.get('when') or {}).items()):
            return entry['feeling']
    return None


def _holds(v, rule):
    op, expected = rule
    fn = OPS.get(op)
    return bool(fn and fn(v, expected))
