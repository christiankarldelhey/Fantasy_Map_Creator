# ============================================================================
# Relations — the subject-level emotional sediment (ADR 0017)
# ----------------------------------------------------------------------------
# One row per (character, subject tag); the only channels that move it
# are perceived events (sediment) and evocation (re-felt imprints).
# Seeding IS allowed at provisioning — a preset's leans and the numeric
# shadow of its authored beliefs (subject+stance) — but after creation
# nothing declares a Relation; it only accretes or decays.
# ============================================================================
from app.mind.engine import (
    CATEGORY_SPLASH, decay, derive_feeling, feeling_lexicon, sediment,
)
from app.mind.tables import Relation
from app.mind.tags import tag_family

# How specific a subject is — the narrowest match owns the felt reading
# and sediments whole; the rest get CATEGORY_SPLASH. Meeting THAT elf
# moves her Relation fully, 'elves' only by splash. The region is the
# broadest shelf — any narrower subject present speaks first.
_SPECIFICITY = {
    'entity': 4, 'family': 3, 'race': 3, 'entity_type': 2,
    # Food outranks drink at the same table — the meal is about the
    # bread, the ale goes along. Both beat the kind of place and the
    # land itself.
    'place': 2, 'food': 2, 'drink': 1, 'kind': 1, 'region': 0,
}


def relation_vector(row):
    # `or 0.0`: column defaults land at flush — a fresh row still reads 0.
    return {d: (getattr(row, d) or 0.0) for d in
            ('affection', 'trust', 'fear', 'familiarity')}


def _specificity(tag):
    return _SPECIFICITY.get(tag_family(tag), 0)


def _get(session, game_id, character_id, subject):
    return (
        session.query(Relation)
        .filter_by(
            game_id=game_id, character_id=character_id, subject=subject,
        )
        .one_or_none()
    )


def _write(row, vec, lexicon=None, episode_idx=None):
    row.affection = vec.get('affection', 0.0)
    row.trust = vec.get('trust', 0.0)
    row.fear = vec.get('fear', 0.0)
    row.familiarity = vec.get('familiarity', 0.0)
    row.feeling = derive_feeling(vec, lexicon)
    if episode_idx is not None:
        row.last_fed_episode = episode_idx


def standing(session, game_id, character_id, subject):
    """The vector a subject's Relation currently holds — None when this
    mind has no standing on it yet."""
    row = _get(session, game_id, character_id, subject)
    return relation_vector(row) if row is not None else None


def feed(session, game_id, character_id, subject, delta, *,
         resistance=0.0, origin='lived', episode_idx=None, create=True,
         display_name=None):
    """Sediment one subject's Relation by a world delta (already contact-
    weighted). Returns the row — None when the subject had no row and an
    empty delta asked for none to be created."""
    if display_name and ':' in display_name:
        # A display_name carrying the tag separator is the tag itself
        # passed off as a name — keep no wording rather than a raw slug.
        display_name = None
    row = _get(session, game_id, character_id, subject)
    if row is None:
        if not create or not delta:
            return None
        row = Relation(
            game_id=game_id, character_id=character_id, subject=subject,
            origin=origin, display_name=display_name,
        )
        session.add(row)
        # autoflush is off: a second subject touching this relation in
        # the same perception pass must find the row or INSERT twice.
        session.flush()
    elif display_name and not row.display_name:
        # The slug met its name late — the row keeps the first wording
        # the host gave it.
        row.display_name = display_name
    vec = sediment(relation_vector(row), delta, resistance=resistance)
    _write(row, vec, feeling_lexicon(session, game_id), episode_idx)
    return row


def feed_event(session, mind, subjects, world_delta, episode_idx=None,
               displays=None):
    """One perceived event's sediment pass over its subject tags: the
    narrowest subject takes the whole delta, broader ones the splash.
    Returns (primary_subject, standing_relation_vector) — the relation
    the event's felt delta must be read through (pre-sediment, so the
    landing is bent by what WAS felt, never by the echo). `displays`
    maps subject -> the name the host worded it with ('The Prancing
    Pony'), so narration never has to guess from the slug."""
    resistance = ((mind.personality or {}).get('resistance'))
    resistance = 0.5 if resistance is None else resistance
    ranked = sorted(subjects or [], key=_specificity, reverse=True)
    primary = ranked[0] if ranked else None
    # The felt reading bends through the narrowest subject that HAS a
    # Relation — an elf never met still lands through 'elves' (the
    # prejudice), a known friend through her own row.
    standing = {}
    for subject in ranked:
        row = _get(session, mind.game_id, mind.character_id, subject)
        if row is not None:
            standing = relation_vector(row)
            break
    displays = displays or {}
    for subject in ranked:
        scale = 1.0 if subject == primary else CATEGORY_SPLASH
        feed(
            session, mind.game_id, mind.character_id, subject,
            {d: v * scale for d, v in (world_delta or {}).items()},
            resistance=resistance, episode_idx=episode_idx,
            display_name=displays.get(subject),
        )
    return primary, standing


def standing_relation(session, game_id, character_id, subjects):
    """(primary_subject, standing_vector) without sedimenting — for
    already-felt events the open pass re-reads through the standing the
    interim sediment built, never double-feeds."""
    ranked = sorted(subjects or [], key=_specificity, reverse=True)
    for subject in ranked:
        row = _get(session, game_id, character_id, subject)
        if row is not None:
            return subject, relation_vector(row)
    return (ranked[0] if ranked else None), {}



def seed_relations(session, game_id, character_id, preset):
    """The mind's authored starting feelings: preset lean rows (the full
    vector — 'orcs' can be feared AND hated) plus each starter belief's
    numeric shadow (subject+stance -> affection). Seeded rows start where
    the authoring put them and from then on only sediment/decay move."""
    if preset is None:
        return []
    made = []
    vectors = {}
    origins = {}
    for lean in (preset.leans or []):
        vec = vectors.setdefault(lean.subject, {})
        for dim in ('affection', 'trust', 'fear', 'familiarity'):
            v = getattr(lean, dim)
            if v:
                vec[dim] = vec.get(dim, 0.0) + v
        origins[lean.subject] = 'seed'
    for sb in (preset.starter_beliefs or []):
        if not sb.subject or sb.stance is None:
            continue
        for subject in sb.subject:
            vec = vectors.setdefault(subject, {})
            vec['affection'] = vec.get('affection', 0.0) + sb.stance
            origins.setdefault(
                subject,
                'heard' if sb.source in ('heard', 'legend') else 'seed',
            )
    for subject, vec in vectors.items():
        row = Relation(
            game_id=game_id, character_id=character_id, subject=subject,
            origin=origins[subject],
        )
        session.add(row)
        _write(row, vec, feeling_lexicon(session, game_id))
        made.append(row)
    return made


def attention_weights(session, mind, gain=0.3):
    """{subject_tag: added salience weight} — a Relation, loved or hated,
    keeps its subject watched: max|dim| * gain. This is the Relations'
    form of what attitudes used to add to theme_weights."""
    out = {}
    rows = session.query(Relation).filter_by(
        character_id=mind.character_id,
    ).all()
    for r in rows:
        mag = max(abs(v) for v in relation_vector(r).values())
        if mag:
            out[r.subject] = max(out.get(r.subject, 0.0), mag * gain)
    return out


def decay_all(session, mind, rate=0.98):
    """The quiet-episode tick: every Relation cools toward indifference —
    dims shrink, never crossing their sign. The fear lets go; the love
    stays love."""
    for r in session.query(Relation).filter_by(
        character_id=mind.character_id
    ).all():
        _write(
            r, decay(relation_vector(r), rate),
            feeling_lexicon(session, getattr(mind, 'game_id', None)),
        )
