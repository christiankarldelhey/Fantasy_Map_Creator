# ============================================================================
# Mind provisioning — presets -> living clones
# ----------------------------------------------------------------------------
# Clone-and-own (PRD §7): the first open for a (game_id, character_id) lazily
# materialises a mind as a copy of its preset's config. From then on the mind
# diverges only by content (memories, beliefs, mood) and admin edits — a preset
# edit never reconfigures an existing mind.
#
# Hint: the character snapshot may carry `preset: "<slug>"`; consulted
# only at creation, falls back to 'default', and never overrides an existing
# assignment. Reassignment is admin territory: POST /mind/minds/{id}/preset.
# ============================================================================
from app.mind.engine import derive_feeling, feeling_lexicon
from app.mind.relations import seed_relations
from app.mind.tables import (
    Memory, Mind, MindPreset, Character, Musing,
)

DEFAULT_PRESET_SLUG = 'default'

# Guide values from spec §7/§8 — the default preset ships these, and they are
# the code fallback when a game has no presets seeded at all.
DEFAULT_WIRING = {
    'decay': 0.85,
    'forget_threshold': 0.2,
    'fixed_threshold': 0.8,
    'w_severity': 0.35,
    'w_novelty': 0.25,
    'w_emotional': 0.15,
    'w_attention': 0.15,
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
    # Facet-aware matching (ADR-0016): an exact tag hit weighs 1.0; a
    # shared coarse facet — 'tag:food:bread' meeting 'tag:food:lembas' —
    # weighs this much. The kind is connection, the value is detail.
    # One-segment tags ('entity:orcs', 'tag:given') have no facet: 'some
    # entity' or 'some flag' is too broad to connect anything.
    'retrieval_facet_weight': 0.4,
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
    # ('check_mod' kind). Per-mind overrides use 'detector.<key>.<param>'.
    'unnoticed_salience': 0.5,
    # Sleep/wake (C4) — during a sleep phase the mind is unconscious:
    # checked events pass unheard unless contact is intrusive enough to
    # wake the sleeper. WHEN the mind sleeps is wiring — a nocturnal
    # creature preset empties sleep_phases entirely; WHICH kinds wake it
    # is the contact's own meaning — 'wakes' on the semantic row (C16).
    'sleep_phases': ['night'],
    # Needs engine (B2) — detector triggers live in the detectors pack
    # ('need' kind, ADR 0005); the streak knob stays here for B9 composite
    # rules.
    'need_weather_streak': 3.0,
    # Thread pressure (C24): open non-physiological needs — intentions,
    # promises — press the mood urgency-scaled, capped. Physiological
    # needs never press this way: they already speak through their
    # perceived items and the body's drag.
    'thread_pressure_scale': 0.3,
    'thread_pressure_cap': 0.4,
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
    # A salient novel event owns the day (#149): when the loudest
    # noticed thing that is not the streak reaches this salience, the
    # sameness still erodes but does not spend the day's words.
    'recurrence_yield_salience': 0.45,
    # Breaks that end badly (C12): when a watched streak dies while the
    # linked need is open, the break is warning, not relief — 'the bread
    # ran out' is no dry-day news when the body is already counting meals.
    'break_need_watch': {'tag:food:*': 'hunger'},
    'break_loss_valence': -0.1,
    'repetition_relief_salience': 0.45,
    # The break's sign follows standing (#148): relief_val minus
    # like*scale — losing a loved streak reads as a gap, losing a hated
    # one as deeper relief. 0.3 makes like=+1 a small loss.
    'break_standing_scale': 0.3,
    # Base routine never grates: 'tag:drink:*' is hydration, not
    # monotony (its absence is the thirst need's job); 'tag:form:*',
    # 'tag:given' and 'tag:changed' are mechanical stamps from the
    # interaction wire, not lived repetition. Only pattern-classed
    # families can form a streak at all (#147), so these are belts
    # around an already-closed door.
    'repetition_exempt_tags': [
        'tag:drink:*', 'tag:form:*',
        'tag:given', 'tag:changed',
    ],
    # Reflection (B4) — the mind's only LLM call, at close: every N
    # episodes or on a salience spike. Reconciliation deltas, active cap
    # and the decay of unreinforced beliefs.
    'reflection_every': 5,
    'reflection_importance_min': 0.85,
    'reflection_memory_top': 20,
    'belief_reinforce_delta': 0.5,
    'belief_contradict_delta': 0.75,
    'belief_weaken_below': 1.5,
    'belief_strength_decay': 0.95,
    'belief_trauma_min': 4.5,
    'belief_cap': 12,
    # Seeds shown to a reflection: only those the evidence bears on
    # (touch its memories, or voiced since the last reflection), at most
    # this many — a rich seed library must not flood the prompt.
    'reflection_seed_cap': 25,
    # Lens: each extra tag a belief or musing shares with the moment it
    # touches multiplies its score by (1 + bonus) — the specific line
    # (orc SIGNS) outranks the generic one (orcs); rotation breaks ties.
    'belief_specificity_bonus': 0.25,
    # Inner voice refractory (#86): a Musing that spoke this many
    # episodes ago (or fewer) stays quiet — the thought needs time to
    # gather before it can be the mind's reply again. 0 disables.
    'musing_refractory_episodes': 2,
    # Relations (ADR 0017 · Relation): the sediment watches what it
    # loves or fears — max|dim| * gain lands on the subject's tags each
    # perception pass; and each closed episode every Relation cools
    # toward indifference (dims shrink, never crossing their sign).
    'relation_attention_gain': 0.3,
    'relation_decay': 0.98,
    # Evidence gate (C7): beliefs need lived weight — a memory reaches
    # the reflection prompt only if it mattered (importance) or was felt
    # (|valence|); drizzle never becomes conviction. And a worldview
    # accretes slowly: at most this many new beliefs per reflection.
    'belief_evidence_importance_min': 0.4,
    'belief_evidence_valence_min': 0.2,
    'belief_new_per_reflection': 2,
    # C14: a transient belief also fades each closed episode it is not
    # refreshed (episode fade in memory.py); a reflection that ignores
    # it decays it faster still (circumstances unstated are
    # circumstances gone). Enduring beliefs only know evidence.
    'belief_transient_decay': 0.8,
    'belief_transient_episode_decay': 0.9,
    # B8: semantic similarity joins the retrieval score —
    # score += delta_embedding * cosine(episode, memory). 0 disables.
    'delta_embedding': 0.25,
    # The old affect channel is dead (ADR 0017): what a tag means lives
    # in the semantics pack (semantics.DEFAULT_SEMANTICS + the game's
    # `semantics` rows), and how this mind feels it in its Relations —
    # the host never declares valence any more. The salience_min and
    # severity tag floors live there too (C6/C16): a floor is meaning —
    # a storm IS severe, thinking company IS never background — so it
    # sits on the semantic row next to delta/weight/body, per-game
    # overridable like the rest of the pack.
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
    # B10: degraded minds (NPCs) still perceive and encode — they remember
    # the protagonist — but never reflect (LLM stays a protagonist cost)
    # and defer decay/pattern consolidation to POST /maintenance/consolidate.
    'degraded': False,
}

NEUTRAL_MOOD = {'valence': 0.0, 'arousal': 0.0, 'dominant': 'neutral'}


def _find_preset(session, game_id, *slugs):
    for slug in slugs:
        if not slug:
            continue
        preset = (
            session.query(MindPreset)
            .filter_by(game_id=game_id, slug=slug)
            .one_or_none()
        )
        if preset is not None:
            return preset
    return None


def _preset_wiring(preset):
    """Materialise a preset's wiring rows over the engine defaults."""
    if preset is None:
        return dict(DEFAULT_WIRING)
    return {**DEFAULT_WIRING, **{r.key: r.value for r in preset.wiring}}


def seed_starter_beliefs(session, game_id, character_id, preset):
    """Clone a preset's starter beliefs into the character as conviction
    memories (origin='seed': backstory, exempt from the evidence rule).
    One row, one truth (#168): the statement is the desc, the stance is
    the imprint — the impression 'I grew up hearing this' IS the belief,
    born consolidated, never forgotten by disuse, echoing its imprint
    back into the Relation on evocation."""
    if preset is None:
        return []
    seeds = []
    for sb in preset.starter_beliefs:
        imprint = (
            {'affection': float(sb.stance)}
            if sb.stance is not None else None
        )
        b = Memory(
            game_id=game_id, character_id=character_id,
            kind='conviction', depth='conviction', mutable=True,
            consolidated=True, strength=1.0,
            desc=sb.statement,
            tags=list(sb.tags or []),
            valence=sb.stance or 0.0,
            importance=max(abs(sb.stance or 0.0), 0.4),
            imprint=imprint,
            subjects=list(sb.subject) if sb.subject else None,
            feeling=derive_feeling(
                imprint or {}, feeling_lexicon(session, game_id)),
            origin='seed',
            conviction={
                'kind': sb.kind, 'horizon': 'enduring',
                'status': 'active', 'strength': sb.strength,
                'evidence': [], 'source': sb.source,
            },
        )
        session.add(b)
        seeds.append(b)
    return seeds


def seed_musings(session, game_id, character_id, preset):
    """Clone the preset's musings — the character's authored inner voice.
    Not beliefs: voice only, seeded alongside them at mind creation and
    restored by the same reset."""
    seeds = []
    for m in (preset.musings if preset else []):
        mu = Musing(
            game_id=game_id, character_id=character_id,
            statement=m.statement, tags=list(m.tags or []), origin='seed',
        )
        session.add(mu)
        seeds.append(mu)
    return seeds


def get_or_create_mind(session, game_id, character_id, hint_slug=None):
    """The character's living mind, cloning its preset on first contact.

    hint_slug applies only at creation; an existing mind is returned
    untouched — reassignment is an explicit admin act.
    """
    mind = (
        session.query(Mind)
        .filter_by(game_id=game_id, character_id=character_id)
        .one_or_none()
    )
    if mind is not None:
        return mind

    preset = _find_preset(session, game_id, hint_slug, DEFAULT_PRESET_SLUG)
    wiring = _preset_wiring(preset)

    mind = Mind(
        game_id=game_id,
        character_id=character_id,
        preset_id=preset.id if preset else None,
        preset_slug=preset.slug if preset else (hint_slug or DEFAULT_PRESET_SLUG),
        wiring=wiring,
        mood=dict(NEUTRAL_MOOD),
        counters={},
        # ADR 0017: the preset's authored resting point and couplings —
        # empty dicts read as neutral/default everywhere downstream.
        temperament=dict(preset.temperament or {}) if preset else {},
        personality=dict(preset.personality or {}) if preset else {},
    )
    session.add(mind)
    session.flush()
    seed_starter_beliefs(session, game_id, character_id, preset)
    seed_musings(session, game_id, character_id, preset)
    # The character's authored dispositions land as seed Relations —
    # the preset's leans plus the numeric shadow of its stanced beliefs.
    seed_relations(session, game_id, character_id, preset)
    return mind


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


def reassign_preset(session, game_id, character_id, slug, reclone=False):
    """Admin reassignment. reclone=True also resets the mind's wiring
    to the new preset's — memories and beliefs are
    content and are never touched."""
    mind = (
        session.query(Mind)
        .filter_by(game_id=game_id, character_id=character_id)
        .one_or_none()
    )
    if mind is None:
        return None
    preset = _find_preset(session, game_id, slug, DEFAULT_PRESET_SLUG)
    mind.preset_id = preset.id if preset else None
    mind.preset_slug = preset.slug if preset else slug
    if reclone:
        mind.wiring = _preset_wiring(preset)
    return mind
