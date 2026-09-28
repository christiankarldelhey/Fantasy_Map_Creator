# ============================================================================
# Brain provisioning — molds -> living clones
# ----------------------------------------------------------------------------
# Clone-and-own (PRD §7): the first open for a (game_id, character_id) lazily
# materialises a brain as a copy of its mold's config. From then on the brain
# diverges only by content (memories, beliefs, mood) and admin edits — a mold
# edit never reconfigures an existing brain.
#
# Hint: the character snapshot may carry `brain_profile: "<slug>"`; consulted
# only at creation, falls back to 'default', and never overrides an existing
# assignment. Reassignment is admin territory: POST /mind/brains/{id}/mold.
# ============================================================================
from app.mind.tables import Belief, Brain, BrainMold

DEFAULT_MOLD_SLUG = 'default'

# Guide values from spec §7/§8 — the default mold ships these, and they are
# the code fallback when a game has no molds seeded at all.
DEFAULT_WIRING = {
    'decay': 0.85,
    'forget_threshold': 0.2,
    'fixed_threshold': 0.8,
    'w_severity': 0.35,
    'w_novelty': 0.25,
    'w_emotional': 0.15,
    'w_theme': 0.15,
    'w_perception': 0.10,
    'alpha': 0.4,
    'beta': 0.4,
    'gamma': 0.2,
    'lambda_recency': 0.3,
    'retrieval_top_k': 5,
    'evocations_to_fix': 3,
}

NEUTRAL_MOOD = {'valence': 0.0, 'arousal': 0.0, 'dominant': 'neutral'}


def _find_mold(session, game_id, *slugs):
    for slug in slugs:
        if not slug:
            continue
        mold = (
            session.query(BrainMold)
            .filter_by(game_id=game_id, slug=slug)
            .one_or_none()
        )
        if mold is not None:
            return mold
    return None


def _mold_config(mold):
    """Materialise a mold's child rows into the brain's config dicts."""
    if mold is None:
        return {}, dict(DEFAULT_WIRING)
    theme_weights = {r.key: r.weight for r in mold.theme_weights}
    wiring = {**DEFAULT_WIRING, **{r.key: r.value for r in mold.wiring}}
    return theme_weights, wiring


def get_or_create_brain(session, game_id, character_id, hint_slug=None):
    """The character's living brain, cloning its mold on first contact.

    hint_slug applies only at creation; an existing brain is returned
    untouched — reassignment is an explicit admin act.
    """
    brain = (
        session.query(Brain)
        .filter_by(game_id=game_id, character_id=character_id)
        .one_or_none()
    )
    if brain is not None:
        return brain

    mold = _find_mold(session, game_id, hint_slug, DEFAULT_MOLD_SLUG)
    theme_weights, wiring = _mold_config(mold)

    brain = Brain(
        game_id=game_id,
        character_id=character_id,
        mold_id=mold.id if mold else None,
        mold_slug=mold.slug if mold else (hint_slug or DEFAULT_MOLD_SLUG),
        theme_weights=theme_weights,
        wiring=wiring,
        mood=dict(NEUTRAL_MOOD),
        counters={},
    )
    session.add(brain)
    session.flush()

    # Starter beliefs are seeded content (origin='seed': backstory, exempt
    # from the evidence rule) — they stay mutable like any belief.
    if mold is not None:
        for sb in mold.starter_beliefs:
            session.add(Belief(
                game_id=game_id, character_id=character_id, kind=sb.kind,
                statement=sb.statement, confidence=sb.confidence,
                evidence=[], origin='seed', status='active',
            ))
    return brain


def reassign_mold(session, game_id, character_id, slug, reclone=False):
    """Admin reassignment. reclone=True also resets the brain's config
    (theme_weights + wiring) to the new mold's — memories and beliefs are
    content and are never touched."""
    brain = (
        session.query(Brain)
        .filter_by(game_id=game_id, character_id=character_id)
        .one_or_none()
    )
    if brain is None:
        return None
    mold = _find_mold(session, game_id, slug, DEFAULT_MOLD_SLUG)
    brain.mold_id = mold.id if mold else None
    brain.mold_slug = mold.slug if mold else slug
    if reclone:
        theme_weights, wiring = _mold_config(mold)
        brain.theme_weights = theme_weights
        brain.wiring = wiring
    return brain
