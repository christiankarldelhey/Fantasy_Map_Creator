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
    'retrieval_boost': 0.1,
    'retrieval_min_score': 0.5,
    'evocations_to_fix': 3,
    # Gates & rolls (B1) — see app/mind/checks.py. Per-skill gate floors may
    # override via 'gate_min.<skill>'; below the floor there is no roll.
    'gate_default_min': 0.0,
    'check_die_sides': 10,
    'check_default_difficulty': 8.0,
    # success on a hard roll feeds w_perception: bonus = difficulty/scale.
    'check_difficulty_scale': 10.0,
    # State modifiers mirror the host's bands (skills are 0-10, d10 rolls).
    # Calibrated against the host's real scale: energy ends ~0.45 after a
    # 12h day on foot; shadow hovers ~0.2-0.3 camping under Dol Guldur —
    # thresholds at 0.7/0.45 were unreachable (the mind never felt worn
    # or shadowed no matter what the world did).
    'energy_worn_below': 0.6,
    'energy_spent_below': 0.35,
    'mod_energy_worn': -1.0,
    'mod_energy_spent': -2.0,
    'shadow_shadowed_min': 0.25,
    'shadow_burdened_min': 0.5,
    'mod_shadow_shadowed': -1.0,
    'mod_shadow_burdened': -2.0,
    'mod_wounded': -1.0,
    # Failure while altered (shadow >= this, or an altered-state condition)
    # turns unnoticed into misread; unnoticed keeps a dampened salience so a
    # "difuso" unease may still lodge in memory.
    'misread_shadow_min': 0.25,
    'unnoticed_salience': 0.5,
    # Sleep/wake (C4) — during a sleep phase the mind is unconscious:
    # checked events pass unheard unless the form physically wakes the
    # sleeper or the outcome is harm already done. All wiring — a nocturnal
    # creature mold empties sleep_phases entirely.
    'sleep_phases': ['night'],
    'sleep_wake_forms': ['attacks', 'confronts', 'sudden_peril'],
    'sleep_wake_outcomes': ['wounded', 'badly wounded'],
    # Needs engine (B2) — detector triggers; urgency formulas live in
    # app/mind/needs.py.
    'need_hunger_days': 1.0,
    'need_thirst_days': 1.0,
    'need_exhaustion_below': 0.4,
    'need_unrest_shadow_min': 0.25,
    'need_weather_streak': 3.0,
    # Pattern memories (B3): a non-type tag seen in N of the last W
    # episodes consolidates into a fixed pattern memory.
    'pattern_window': 4,
    'pattern_min_episodes': 3,
    # Repetition pressure + breaks (C5): a content tag perceived in this
    # many consecutive episodes starts weighing on the mood — valence
    # grows per day over the minimum, capped; a dead streak becomes a
    # one-day 'first dry day' item worth relief_valence.
    'repetition_min_streak': 3,
    'repetition_growth': 0.08,
    'repetition_valence_cap': 0.3,
    'repetition_salience': 0.3,
    'repetition_relief': 0.15,
    'repetition_relief_salience': 0.45,
    # Base routine never grates: 'tag:drink:*' is hydration, not
    # monotony (its absence is the thirst need's job), 'tag:form:*' is
    # how contact happened, not content that repeats.
    'repetition_exempt_tags': ['tag:drink:*', 'tag:form:*'],
    # Reflection (B4) — the mind's only LLM call, at close: every N
    # episodes or on a salience spike. Reconciliation deltas, active cap
    # and the decay of unreinforced beliefs.
    'reflection_every': 5,
    'reflection_importance_min': 0.85,
    'reflection_memory_top': 20,
    'belief_reinforce_delta': 0.1,
    'belief_contradict_delta': 0.15,
    'belief_weaken_below': 0.3,
    'belief_confidence_decay': 0.95,
    'belief_trauma_min': 0.9,
    'belief_cap': 12,
    # Evidence gate (C7): beliefs need lived weight — a memory reaches
    # the reflection prompt only if it mattered (importance) or was felt
    # (|valence|); drizzle never becomes conviction. And a worldview
    # accretes slowly: at most this many new beliefs per reflection.
    'belief_evidence_importance_min': 0.4,
    'belief_evidence_valence_min': 0.2,
    'belief_new_per_reflection': 2,
    # B6: a belief only bends theme_weights while it stays confident.
    'belief_boost_min_confidence': 0.6,
    # B8: semantic similarity joins the retrieval score —
    # score += delta_embedding * cosine(episode, memory). 0 disables.
    'delta_embedding': 0.25,
    # Affect channel: 'affect.<tag>' keys are signed valence (-1..1) an
    # event contributes when that tag is present — wildcards allowed
    # ('affect.tag:outcome:*'). 'affect.field:<name>' scales a numeric
    # data field per unit. An explicit data.valence from the host always
    # wins; these defaults are the generic emotional floor molds refine.
    'affect.tag:form:attacks': -0.5,
    'affect.tag:form:sudden_peril': -0.5,
    'affect.tag:form:confronts': -0.35,
    'affect.tag:form:stalks': -0.25,
    'affect.tag:form:hinders_passage': -0.15,
    'affect.tag:form:aid_or_trade': 0.2,
    'affect.tag:outcome:wounded': -0.5,
    'affect.tag:outcome:badly wounded': -0.7,
    'affect.tag:outcome:unscathed': 0.1,
    'affect.tag:weather:freezing': -0.15,
    'affect.tag:weather:storm': -0.3,
    'affect.tag:weather:snow': -0.1,
    'affect.tag:weather:deep_cold': -0.3,
    'affect.tag:weather:scorching': -0.2,
    'affect.field:shadow_effect': -0.15,
    # Host-declared entity danger (0-5 game scale) is felt as continuous
    # menace — distinct from detectability (check difficulty, host-side):
    # a harmless thing is easy to notice AND easy to ignore.
    'affect.field:danger': -0.1,
    # Severity floors by tag (C6): severe weather tiers make the climate
    # an *event* in the salience arithmetic — a storm day encodes, a
    # drizzle day stays background. 'severity.<tag>' works for any tag.
    'severity.tag:weather:storm': 0.6,
    'severity.tag:weather:snow': 0.45,
    'severity.tag:weather:deep_cold': 0.55,
    'severity.tag:weather:scorching': 0.5,
    'severity.tag:weather:freezing': 0.3,
    # B10: degraded brains (NPCs) still perceive and encode — they remember
    # the protagonist — but never reflect (LLM stays a protagonist cost)
    # and defer decay/pattern consolidation to POST /maintenance/consolidate.
    'degraded': False,
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
                tags=list(sb.tags or []), boosts=dict(sb.boosts or {}),
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
