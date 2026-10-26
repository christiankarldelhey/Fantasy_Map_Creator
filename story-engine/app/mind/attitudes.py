# ============================================================================
# Attitudes — the prehistory every encounter carries (CONTEXT.md · Attitude)
# ----------------------------------------------------------------------------
# An Attitude is a Belief with a Subject (the tags this mind counts as 'the
# same kind of being') and a Stance (-1 loathing .. +1 love). It acts on
# the mind three ways:
#
#   felt      the encounter's valence leans toward the stance
#             (attitude_affect_gain) — the same deer is a gladness to one
#             mind and nothing to another;
#   noticed   |stance| adds attention to the subject's tags
#             (attitude_attention_gain) — love and loathing both watch;
#   moved     at close, how the encounter went in the WORLD (valence before
#             the attitude coloured it — never its own echo) nudges the
#             stance: attitude_drift per encounter, attitude_drift_marked
#             when it marked the character deeply (|world valence| >=
#             attitude_marked_valence).
#
# Most specific wins: when several attitudes touch one encounter, the one
# whose subject matched the narrowest tag (entity > family > type) speaks
# for it — Celebrian loves horses, and the horses of Mordor are not that.
#
# Drift never carries a stance across zero: the prose of the belief would
# lie ('I do not trust dwarves' at +0.2). Encounters can wear a prejudice
# down to almost nothing; turning it is reflection's work (invert), which
# rewrites the words with the stance.
# ============================================================================
from app.mind.provisioning import DEFAULT_WIRING
from app.mind.tables import Belief

# Narrowest first: a match on an entity outranks a family, a family a type.
_LEVELS = (('entity:', 3), ('tag:family:', 2), ('tag:entity_type:', 1))
_FLOOR = 0.05  # how close to zero drift may wear a stance


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
    """How narrowly this attitude's subject meets the tags; 0 = no touch."""
    hits = set(belief.subject or []) & set(tags or [])
    return max((subject_level(t) for t in hits), default=0)


def attitude_for(tags, beliefs):
    """The attitude that speaks for an encounter with these tags: the
    narrowest subject match, then the strongest stance. None if no
    attitude touches it."""
    best, best_key = None, None
    for b in beliefs or []:
        if not is_attitude(b):
            continue
        level = match_level(b, tags)
        if not level:
            continue
        key = (level, abs(b.stance or 0.0))
        if best_key is None or key > best_key:
            best, best_key = b, key
    return best


def active_attitudes(session, brain):
    return [
        b for b in (
            session.query(Belief)
            .filter_by(character_id=brain.character_id, status='active')
            .filter(Belief.subject.isnot(None))
            .all()
        )
        if is_attitude(b)
    ]


def felt_valence(world_valence, attitude, w):
    """The encounter as this mind feels it: the world's valence leaning
    toward the attitude's stance."""
    gain = float(w.get('attitude_affect_gain', 0.5))
    v = world_valence + (attitude.stance or 0.0) * gain
    return max(-1.0, min(1.0, v))


def attention_weights(beliefs, w):
    """{tag: weight} the attitudes add to what this mind notices."""
    gain = float(w.get('attitude_attention_gain', 0.3))
    out = {}
    for b in beliefs or []:
        if not is_attitude(b):
            continue
        for tag in b.subject:
            out[tag] = max(out.get(tag, 0.0), abs(b.stance) * gain)
    return out


def drift(session, brain, episode):
    """Move each attitude by how its encounters went in the world.
    Returns [{belief_id, from, to}] for the close summary."""
    w = {**DEFAULT_WIRING, **(brain.wiring or {})}
    step = float(w.get('attitude_drift', 0.05))
    marked_step = float(w.get('attitude_drift_marked', 0.25))
    marked_at = float(w.get('attitude_marked_valence', 0.6))
    quiet = float(w.get('attitude_drift_min_valence', 0.05))
    by_id = {b.id: b for b in active_attitudes(session, brain)}
    if not by_id:
        return []
    before = {bid: b.stance for bid, b in by_id.items()}
    for item in episode.perceived_day or []:
        if item.get('perception') == 'unnoticed':
            continue
        b = by_id.get(item.get('attitude'))
        wv = item.get('world_valence')
        if b is None or wv is None or abs(wv) < quiet:
            continue
        delta = (marked_step if abs(wv) >= marked_at else step)
        delta = delta if wv > 0 else -delta
        old = b.stance
        new = max(-1.0, min(1.0, old + delta))
        if old * new <= 0 and old != 0:
            new = _FLOOR if old > 0 else -_FLOOR
        b.stance = round(new, 3)
        b.updated_episode = episode.episode_idx
    return [
        {'belief_id': bid, 'from': before[bid], 'to': b.stance}
        for bid, b in by_id.items() if b.stance != before[bid]
    ]
