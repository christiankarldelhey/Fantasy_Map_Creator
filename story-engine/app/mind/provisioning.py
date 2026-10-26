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
from app.mind.tables import Belief, Brain, BrainMold, Character

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
    # C20 contact gate: a memory evokes only if it shares a tag with
    # today's perceived items OR its embedding cosine clears this floor.
    # Bucket-embedder cosine: unrelated pairs sit ~0.2-0.3, genuine
    # resonance ≥0.45 — at 0.3 the semantic door let memories in on
    # 'vibe' alone and they arrived in the lens with nothing to say.
    'retrieval_semantic_min': 0.45,
    # A memory that barely registered at encoding is never what a new
    # day stirs up — otherwise the daily bread out-recalls a warg
    # attack (C16).
    'retrieval_importance_min': 0.15,
    # C23 refractory: a memory evoked within this many episodes sits
    # quiet — dwelling must not re-summon itself. Recency also ages from
    # when the event happened, never from when it was last recalled.
    'refractory_episodes': 1,
    # C23: a spoken encounter probes memory on its own terms — the
    # question's text embeds against the corpus and the best hit may
    # inform the answer. Below retrieval_semantic_min because the probe
    # is one sentence, not the whole day.
    'dialogue_recall_min': 0.4,
    'evocations_to_fix': 3,
    # Gates & rolls (B1) — see app/mind/checks.py. Per-skill gate floors may
    # override via 'gate_min.<skill>'; below the floor there is no roll.
    'gate_default_min': 0.0,
    'check_die_sides': 10,
    'check_default_difficulty': 8.0,
    # success on a hard roll feeds w_perception: bonus = difficulty/scale.
    'check_difficulty_scale': 10.0,
    # State modifiers (ADR 0005): thresholds and magnitudes live in the
    # detectors pack — mind.detectors rows or detectors.DEFAULT_DETECTORS
    # ('check_mod' kind). Per-brain overrides use 'detector.<key>.<param>';
    # legacy wiring keys (energy_worn_below, mod_energy_spent, ...) still
    # read on brains authored before the move.
    'unnoticed_salience': 0.5,
    # Sleep/wake (C4) — during a sleep phase the mind is unconscious:
    # checked events pass unheard unless the form physically wakes the
    # sleeper or the outcome is harm already done. All wiring — a nocturnal
    # creature mold empties sleep_phases entirely.
    'sleep_phases': ['night'],
    # Contact forms wake the sleeper (C16): if the world resolved a
    # brief exchange or an offered bed, contact already happened —
    # the mind cannot sleep through what canonically occurred (the
    # tracking roll still runs; waking is not auto-noticing). Distant
    # perception events — signs, sounds, a far-off shape — stay
    # sleep-missable.
    'sleep_wake_forms': [
        'attacks', 'confronts', 'sudden_peril',
        'brief_exchange', 'aid_or_trade', 'harvest_shelter',
        'reacts_withdraws', 'hinders_passage', 'mistaken_for_object',
        'drifts_closer',
    ],
    'sleep_wake_outcomes': ['wounded', 'badly wounded'],
    # Needs engine (B2) — detector triggers live in the detectors pack
    # ('need' kind, ADR 0005); the streak knob stays here for B9 composite
    # rules.
    'need_weather_streak': 3.0,
    # Homeostasis (C9): open needs weigh on the episode mood — each
    # contributes -urgency * scale, the day's total capped. Hunger at
    # day 3 (-0.27) doesn't need a bad event to darken the day.
    'need_affect_scale': 0.3,
    'need_affect_cap': 0.4,
    # A need this urgent speaks from its '.deep' phrase tier (C11) —
    # hunger crosses it around day 3, unrest past shadow ~0.6.
    'need_deep_urgency': 0.6,
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
    # Breaks that end badly (C12): when a watched streak dies while the
    # linked need is open, the break is warning, not relief — 'the bread
    # ran out' is no dry-day news when the body is already counting meals.
    'break_need_watch': {'tag:food:*': 'hunger'},
    'break_loss_valence': -0.1,
    'repetition_relief_salience': 0.45,
    # Base routine never grates: 'tag:drink:*' is hydration, not
    # monotony (its absence is the thirst need's job), 'tag:form:*' is
    # how contact happened, not content that repeats. The C28 weight
    # markers are meta-signal, not content — a day without a gift is
    # ordinary, not a pattern break worth a 'no given today' reading.
    'repetition_exempt_tags': [
        'tag:drink:*', 'tag:form:*',
        'tag:given', 'tag:changed', 'tag:decision',
    ],
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
    # Seeds shown to a reflection: only those the evidence bears on
    # (touch its memories, or voiced since the last reflection), at most
    # this many — a rich seed library must not flood the prompt.
    'reflection_seed_cap': 25,
    # Evidence gate (C7): beliefs need lived weight — a memory reaches
    # the reflection prompt only if it mattered (importance) or was felt
    # (|valence|); drizzle never becomes conviction. And a worldview
    # accretes slowly: at most this many new beliefs per reflection.
    'belief_evidence_importance_min': 0.4,
    'belief_evidence_valence_min': 0.2,
    'belief_new_per_reflection': 2,
    # C14: transient beliefs (circumstances, not nature) fade each closed
    # episode they are not refreshed, and faster still when a reflection
    # ignores them; enduring ones keep the reflection-only decay above.
    'belief_transient_episode_decay': 0.9,
    'belief_transient_decay': 0.8,
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
    # Company on the road is felt, however mildly (C16) — a real
    # exchange registers as something, never nothing.
    'affect.tag:form:brief_exchange': 0.15,
    'affect.tag:form:reacts_withdraws': 0.1,
    'affect.tag:outcome:wounded': -0.5,
    'affect.tag:outcome:badly wounded': -0.7,
    'affect.tag:outcome:unscathed': 0.1,
    # C28: an unsolicited gift is felt as kindness — the farm wife's soup
    # warms the day it landed in, not just the ledger.
    'affect.tag:given': 0.25,
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
    # People weight (C16): 'salience_min.<tag>' floors lift a noticed
    # event carrying that tag — a conversation with thinking company
    # must outweigh the drizzle. Two channels: the FORM says how close
    # contact came, the entity_type who it was. A mold re-weights
    # either (a people-shy brain lowers the whole channel).
    'salience_min.entity:*': 0.12,
    'salience_min.tag:form:brief_exchange': 0.45,
    'salience_min.tag:form:aid_or_trade': 0.5,
    'salience_min.tag:form:harvest_shelter': 0.45,
    'salience_min.tag:form:confronts': 0.5,
    'salience_min.tag:form:attacks': 0.6,
    'salience_min.tag:form:sudden_peril': 0.55,
    'salience_min.tag:form:hinders_passage': 0.4,
    'salience_min.tag:form:reacts_withdraws': 0.35,
    'salience_min.tag:form:drifts_closer': 0.3,
    'salience_min.tag:form:stalks': 0.35,
    'salience_min.tag:form:watches': 0.3,
    'salience_min.tag:entity_type:humans': 0.35,
    'salience_min.tag:entity_type:hobbits': 0.35,
    'salience_min.tag:entity_type:elves': 0.35,
    'salience_min.tag:entity_type:dwarves': 0.35,
    'salience_min.tag:entity_type:woses': 0.35,
    'salience_min.tag:entity_type:orcs': 0.45,
    'salience_min.tag:entity_type:trolls': 0.45,
    'salience_min.tag:entity_type:giants': 0.45,
    'salience_min.tag:entity_type:undead': 0.5,
    'salience_min.tag:entity_type:demons': 0.5,
    'salience_min.tag:entity_type:maiar': 0.5,
    'salience_min.tag:entity_type:living_trees': 0.4,
    'salience_min.tag:entity_type:pukel_constructs': 0.35,
    # C28: what touched the mechanics outranks ambience. 'given' — the
    # world handed something (authored commands, a provided meal);
    # 'decision' — a fork stood in the day; 'changed' — a decided option
    # applied. Tiers so an offer declined still registers under the day
    # that took the bed. A dull brain may lower the whole channel.
    'salience_min.tag:given': 0.6,
    'salience_min.tag:decision': 0.5,
    'salience_min.tag:changed': 0.65,
    # Places lived, not just passed: 'entered' marks the settlement the
    # traveller actually stopped at — its name and streets should reach
    # the lens. 'hostile' is an enemy place skirted from outside — fear
    # keeps it noticed. 'charity'/'turned_away' carry the night's social
    # truth: a stranger's mercy or a door shut in the face.
    'salience_min.tag:settlement': 0.3,
    'salience_min.tag:entered': 0.55,
    'salience_min.tag:hostile': 0.45,
    'salience_min.tag:charity': 0.5,
    'salience_min.tag:turned_away': 0.5,
    'salience_min.tag:indoor': 0.3,
    'salience_min.tag:paid': 0.35,
    # The Episode brief (C35): an event needs focus_min_salience to be the
    # Focus and focus_candidate_min_salience to be considered at all; a
    # memory takes the centre past focus_memory_min; a mood this strong
    # speaks unconnected. The Focus encodes focus_memory_boost stronger.
    'focus_min_salience': 0.45,
    'focus_candidate_min_salience': 0.3,
    'focus_memory_min': 0.8,
    'focus_mood_strong': 0.4,
    'focus_memory_boost': 0.15,
    # Retention (C16) — nothing is immortal, but intensity sticks:
    # a memory of strong feeling or real importance decays at the
    # sticky rate; consolidation by recall needs an importance floor
    # so daily trivia never fixes; consolidated rows still fade at a
    # crawl — long-term is months, not forever.
    'decay_sticky_valence': 0.4,
    'decay_sticky_importance': 0.5,
    'decay_sticky': 0.95,
    'consolidate_min_importance': 0.3,
    'consolidated_decay': 0.98,
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


def seed_starter_beliefs(session, game_id, character_id, mold):
    """Clone a mold's starter beliefs into the character (origin='seed':
    backstory, exempt from the evidence rule) — mutable like any belief.
    Used at brain creation and again when a brain is wiped: the defaults
    are the one content a reset restores."""
    if mold is None:
        return []
    seeds = []
    for sb in mold.starter_beliefs:
        b = Belief(
            game_id=game_id, character_id=character_id, kind=sb.kind,
            statement=sb.statement, confidence=sb.confidence,
            tags=list(sb.tags or []), boosts=dict(sb.boosts or {}),
            evidence=[], origin='seed', status='active',
        )
        session.add(b)
        seeds.append(b)
    return seeds


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
    seed_starter_beliefs(session, game_id, character_id, mold)
    return brain


def get_or_create_character(session, game_id, card):
    """The Mind-owned card for this character (ADR 0001). Adopted from
    the Host's first payload — from then on the Mind's copy is
    authoritative and later wire values for identity fields are ignored;
    the Studio edits this row."""
    row = (
        session.query(Character)
        .filter_by(game_id=game_id, character_id=card.get('id'))
        .one_or_none()
    )
    if row is not None:
        # Fill-once: a card adopted before the wire carried the field still
        # gets it (identity fields are otherwise Mind-authoritative).
        if row.portrait_url is None and card.get('portrait_url'):
            row.portrait_url = card['portrait_url']
            session.flush()
        return row
    row = Character(
        game_id=game_id,
        character_id=card['id'],
        kind='copy',
        name=card.get('name'),
        entity_name=card.get('entity_name'),
        portrait_url=card.get('portrait_url'),
        description=card.get('description'),
        foundational_phrase=card.get('system_prompt'),
        voice_instructions=card.get('introduction_instructions'),
        skills=card.get('skills') or {},
    )
    session.add(row)
    session.flush()
    return row


def effective_character(row, wire_card):
    """Identity from the Mind's card, Condition from the wire: energy,
    shadow, conditions and wounded are the Host's live report and always
    pass through. An identity field the card lacks falls back to the
    wire value, so a bare adoption still narrates."""
    merged = dict(wire_card)
    merged.update({
        'name': row.name or wire_card.get('name'),
        'skills': row.skills or wire_card.get('skills') or {},
        'description': row.description or wire_card.get('description'),
        'entity_name': row.entity_name or wire_card.get('entity_name'),
        'portrait_url': row.portrait_url or wire_card.get('portrait_url'),
        'system_prompt': (
            row.foundational_phrase or wire_card.get('system_prompt')
        ),
        'introduction_instructions': (
            row.voice_instructions
            or wire_card.get('introduction_instructions')
        ),
    })
    return merged


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
