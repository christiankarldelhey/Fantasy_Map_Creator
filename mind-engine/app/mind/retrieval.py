# ============================================================================
# Retrieval — what the episode stirs up
# ----------------------------------------------------------------------------
# Deterministic scoring:
#   score = α·recency(e^-λ·Δepisodes) + β·importance + γ·relevance
#           + δ·semantic_similarity   (B8 — embeddings, JSONB + Python)
# relevance = share of the memory's tags that appear in the episode's
# context — perceived event tags ∪ active belief tags (a belief about orcs
# makes orc-memories easier to stir). Top-K (wiring) become CANDIDATES:
# observable but inert — the only writes are evocations++ /
# last_evoked_episode / last_evoked_date. A candidate changes the mind's
# persistent state only when the Lens voices it into the brief
# (voice_memories): then it strengthens, its imprint re-feeds the
# touched Relations and pulls the Mood back toward it.
#
# Contact gate (C20): freshness alone never evokes. A memory must touch
# THIS day's story — a shared tag with what was actually perceived, or
# semantic similarity above the wiring floor — otherwise it stays a
# memory, unevoked. On a day that touches nothing, nothing stirs.
#
# TODO(jev): the gate is the crudest judgment in the engine — tag overlap
# plus hash-embedding cosine. Evaluate TypeSafe's Jev (Noul: "does this
# memory touch this episode?") as a bounded rerank over the top-K
# candidates, keeping this rule path as the deterministic fallback and
# logging each verdict on the episode for replay honesty. Until then,
# semantic judgment calls in the mind go through the LLM call pattern
# already used by the lens director — never a full scan per memory.
# ============================================================================
import math

from app.mind.attitudes import active_convictions
from app.mind.embeddings import cosine, embed, ensure_embedding, episode_embedding
from app.mind.engine import (
    EVOKE_SHARE, MOOD_DIMS, apply_pull, mood_delta,
)
from app.mind.memory import episode_date, episode_index
from app.mind.provisioning import DEFAULT_WIRING
from app.mind.relations import feed
from app.mind.steps import step
from app.mind.tables import Memory
from app.mind.tags import (
    contact_tags as _contact_tags,
    tag_facet as _tag_facet,
)


def _context_tags(perceived_day, beliefs):
    """The day's tags plus those of the beliefs the day ACTIVATED (share a
    tag with it). Only those: a mind with a rich seed library holds a
    belief about nearly everything, and folding all of them in made
    relevance ~1.0 for every memory — 'what this mind believes about
    what is happening today' is the signal, not 'everything it believes'."""
    tags = set()
    for item in perceived_day or []:
        tags.update(item.get('tags') or [])
    day = set(tags)
    for belief in beliefs:
        btags = set(belief.tags or [])
        if btags & day:
            tags.update(btags)
    return tags


def _relevance(memory_tags, context_tags, facet_weight=0.0):
    """Share of the memory's tags touching the context: an exact tag hit
    weighs 1.0, a shared coarse facet weighs `facet_weight` (ADR-0016)."""
    tags = set(memory_tags or [])
    if not tags:
        return 0.0
    context = set(context_tags or [])
    context_facets = {
        f for f in (_tag_facet(t) for t in context) if f
    }
    hit = 0.0
    for t in tags:
        if t in context:
            hit += 1.0
        elif facet_weight and _tag_facet(t) in context_facets:
            hit += facet_weight
    return min(1.0, hit / len(tags))


# C20 gate refinement: contact must be about WHAT happened, not the
# day's weather report, menu, mileage or coordinates. Ambient tags —
# the event's own class, the sky, the ration, the region — are
# background: without them, the same rain 'evokes' every past rain and
# the road-bread out-recalls every encounter. The ambient/content split
# is declared once in tags.py (TAG_CLASSES).

_MOOD_SPAN = math.sqrt(len(MOOD_DIMS) * 4)  # dims span [-1, 1]


def felt_proximity(mem_felt, day_targets):
    """How close the day's pulls came to how this memory felt — the
    wheel distance between targets normalized to [0, 1]; the closest
    pair wins (one rhyming moment of the day is enough)."""
    best = 0.0
    for pull in mem_felt or []:
        t = pull.get('target') or {}
        for dt in day_targets:
            dist = math.sqrt(
                sum((t.get(d, 0.0) - dt.get(d, 0.0)) ** 2
                    for d in MOOD_DIMS))
            best = max(best, 1.0 - dist / _MOOD_SPAN)
    return best


@step('Evocation')
def retrieve(session, mind, episode, perceived_day):
    """Score the character's memories against this episode's context and
    evoke the top-K. Returns the evoked Memory rows (highest score first).
    Called once, at episode creation — re-open replays stored annotations."""
    w = {**DEFAULT_WIRING, **(mind.wiring or {})}
    idx = episode_index(episode)
    ep_date = episode_date(episode)

    beliefs = active_convictions(session, mind.character_id)
    context = _context_tags(perceived_day, beliefs)
    # C20: the gate listens only to the day itself — beliefs soften the
    # score but do not make yesterday's people relevant to today's road.
    # And only content tags count: 'same wet sky' is ambience, not story.
    day_tags = set()
    for item in perceived_day or []:
        day_tags.update(_contact_tags(item.get('tags') or []))

    candidates = (
        session.query(Memory)
        .filter_by(character_id=mind.character_id)
        .all()
    )
    if not candidates:
        return []

    alpha = w.get('alpha', 0.4)
    beta = w.get('beta', 0.4)
    gamma = w.get('gamma', 0.2)
    lam = w.get('lambda_recency', 0.3)
    # B8: semantic similarity — embed the day's readings once, compare
    # against each memory's stored vector (backfilled lazily).
    delta_w = w.get('delta_embedding', 0.25)
    episode_vec = episode_embedding(perceived_day) if delta_w else None
    # The day's own pulls: how today actually felt, for the felt
    # proximity term — 'this felt like that one' discriminates between
    # memories that connect, never opens the gate alone.
    felt_w = w.get('delta_felt', 0.2)
    day_targets = [
        p['target']
        for item in perceived_day or []
        for p in (item.get('mood_pull') or [])
        if p.get('target')
    ]

    scored = []
    imp_min = w.get('retrieval_importance_min', 0.15)
    sem_min = w.get('retrieval_semantic_min', 0.5)
    facet_w = w.get('retrieval_facet_weight', 0.4)
    refractory = int(w.get('refractory_episodes', 1))
    # C2 — the depth channels: a FRESH memory (N1) presents itself on
    # recency alone inside `fresh_episodes` lived days — yesterday's
    # storm colours today even under clear skies. A CONSOLIDATED one
    # (N2/N3) needs contact, semantics, or feeling-as-the-day — the
    # felt gate (`felt_gate_min`): old grief surfaces on a grey day
    # without a single shared tag. Volatiles past their window go back
    # to needing connection like anything else.
    fresh_episodes = int(w.get('fresh_episodes', 2))
    felt_gate = float(w.get('felt_gate_min', 0.7))
    for mem in candidates:
        # Patterns are background bookkeeping, not impressions (C5):
        # they live and die by recurrence and their voice is the
        # recurrence channel — ambient recall only ever re-strengthened
        # them and crowned the lens with 'the shape of these days'.
        if mem.kind == 'pattern':
            continue
        # What barely registered is never what the day stirs (C16):
        # otherwise daily trivia re-evokes itself forever and the
        # road-bread out-recalls the warg attack.
        if (mem.importance or 0.0) < imp_min:
            continue
        # C23 refractory: a memory dwelt on yesterday sits quiet today.
        # Dwelling must not re-summon itself, or the mind chews the
        # same sighting forever.
        last_evoked = mem.last_evoked_episode
        if (
            refractory and idx is not None and last_evoked is not None
            and 1 <= idx - last_evoked <= refractory
        ):
            continue
        mem_contact = _contact_tags(mem.tags)
        # C2: the age that matters is days LIVED (episode_idx) — a month
        # of rest between journeys does not age the memory a month; the
        # calendar stays for how the lens says 'a month ago'.
        delta = memory_age_episodes(episode, mem)
        fresh = (
            not mem.consolidated and delta is not None
            and delta <= fresh_episodes
        )
        sim = (
            cosine(episode_vec, ensure_embedding(mem))
            if episode_vec is not None else 0.0
        )
        fp = (
            felt_proximity(getattr(mem, 'felt', None), day_targets)
            if day_targets else 0.0
        )
        if not fresh:
            # A memory whose tags are ALL ambient never stirs: the day's
            # bread and the day's sky belong to the recurrence channel,
            # not to evocation — otherwise the ration out-thinks the
            # warg. (Tag-less memories keep the semantic door, B8.)
            if mem.tags and not mem_contact:
                continue
            # Contact gate: no content tag shared with today — exact or
            # through a shared coarse facet — no semantic overlap
            # either: no evocation, however fresh or important the
            # memory. Except the consolidated: they may also enter on
            # felt — how the day feels can wake what nothing in it
            # mentions.
            if (
                _relevance(mem_contact, day_tags, facet_w) <= 0.0
                and sim < sem_min
                and not (mem.consolidated and fp >= felt_gate)
            ):
                continue
        # C23: recency ages from when the event HAPPENED, never from
        # when it was last recalled — evoking the fox does not make
        # the fox newer; it only strengthens the trace. C2: the term is
        # the volatile channel's own — a consolidated memory competes on
        # connection alone; being old is no longer a penalty and being
        # recent no longer a reason.
        recency = (
            math.exp(-lam * delta)
            if delta is not None and not mem.consolidated
            else 0.0
        )
        score = (
            alpha * recency
            + beta * (mem.importance or 0.0)
            + gamma * _relevance(mem.tags, context, facet_w)
        )
        if episode_vec is not None:
            score += delta_w * sim
        if felt_w:
            score += felt_w * fp
        scored.append((score, mem))

    scored.sort(key=lambda t: t[0], reverse=True)
    top_k = int(w.get('retrieval_top_k', 5))
    # Evocation asks for a minimum score — otherwise a mind with few
    # memories would stir every one of them each episode and nothing
    # would ever fade.
    min_score = w.get('retrieval_min_score', 0.5)

    evoked = []
    for score, mem in scored[:top_k]:
        if score < min_score:
            break
        # A candidate stirs: observable bookkeeping only. It re-feels —
        # strength, Relations, Mood — only if the Lens voices it.
        mem.evocations = (mem.evocations or 0) + 1
        if idx is not None:
            mem.last_evoked_episode = idx
        if ep_date is not None:
            mem.last_evoked_date = ep_date
        evoked.append(mem)
    return evoked


@step('Evocation')
def voice_memories(session, mind, memories, idx):
    """The voiced consolidation (ADR 0017, #184): only a memory the Lens
    carried into the brief bleeds back into the mind — it strengthens,
    its imprint lands again at EVOKE_SHARE on each touched subject's
    Relation through the same sediment rule, and it pulls the mood
    toward its own felt point (remembering the dark ford draws the mood
    back toward it). A candidate never re-feels: what the Episode did
    not voice cannot move the mind's weather or its standings."""
    w = {**DEFAULT_WIRING, **(mind.wiring or {})}
    boost = w.get('retrieval_boost', 0.1)
    personality = getattr(mind, 'personality', None) or {}
    resistance = personality.get('resistance')
    resistance = 0.5 if resistance is None else resistance
    moodiness = personality.get('moodiness', 0.3)
    mood = {
        d: ((getattr(mind, 'mood', None) or {}).get(d) or 0.0)
        for d in MOOD_DIMS
    }
    mood_moved = False
    for mem in memories:
        mem.strength = min(1.0, (mem.strength or 0.0) + boost)
        mem.voiced = (mem.voiced or 0) + 1
        if idx is not None:
            mem.last_voiced_episode = idx
        imprint = getattr(mem, 'imprint', None) or {}
        if imprint:
            share = {d: v * EVOKE_SHARE for d, v in imprint.items()}
            for subject in (mem.subjects or []):
                feed(
                    session, mind.game_id, mind.character_id, subject,
                    share, resistance=resistance, episode_idx=idx,
                )
        # Re-feeling reads the felt as it actually landed — the pull the
        # personality refracted — before the world's suggestion: imprint
        # feeds Relations, felt feeds mood, each its own channel.
        felt = getattr(mem, 'felt', None) or []
        target = (felt[0].get('target') or {}) if felt else {}
        if not target:
            target = mood_delta(imprint)
        if target:
            apply_pull(
                mood, target, min(1.0, EVOKE_SHARE * (1.0 + moodiness)))
            mood_moved = True
    if mood_moved:
        prior = getattr(mind, 'mood', None) or {}
        mind.mood = {
            **prior,
            **{d: round(mood.get(d, 0.0), 3) for d in MOOD_DIMS},
        }


@step('Evocation')
def dialogue_recall(session, mind, item, idx, exclude_ids=()):
    """Focused recall for a spoken encounter (C23): embed what was
    actually asked/said and return the memory that best answers it —
    the traveller may reply from what they retained, not from nowhere.

    One probe text (topic + content + tension), one cosine pass over
    the mind's memories, best hit above dialogue_recall_min wins.
    Same gates as retrieve(): no patterns, importance floor, refractory.
    The caller does the evocation bookkeeping."""
    data = item.get('data') or {}
    substance = data.get('substance') or {}
    text = ' '.join(
        t for t in (
            data.get('topic'),
            substance.get('content'),
            substance.get('tension'),
        )
        if isinstance(t, str)
    )
    vec = embed(text)
    if vec is None:
        return None

    w = {**DEFAULT_WIRING, **(mind.wiring or {})}
    floor = float(w.get('dialogue_recall_min', 0.4))
    imp_min = w.get('retrieval_importance_min', 0.15)
    refractory = int(w.get('refractory_episodes', 1))

    best = None
    best_sim = floor
    for mem in (
        session.query(Memory)
        .filter_by(character_id=mind.character_id)
        .all()
    ):
        if mem.kind == 'pattern' or mem.id in exclude_ids:
            continue
        if (mem.importance or 0.0) < imp_min:
            continue
        last_evoked = mem.last_evoked_episode
        if (
            refractory and idx is not None and last_evoked is not None
            and 1 <= idx - last_evoked <= refractory
        ):
            continue
        sim = cosine(vec, ensure_embedding(mem))
        if sim > best_sim:
            best, best_sim = mem, sim
    return best


def memory_age_episodes(episode, mem):
    """How long ago this memory happened, in days LIVED (C2): the
    episode_idx distance — the mind's own clock. A month of rest
    between journeys is no age at all; the calendar stays for the
    lens's 'a month ago'."""
    idx = episode_index(episode)
    if idx is None or getattr(mem, 'created_episode', None) is None:
        return None
    return max(0, idx - mem.created_episode)


def memory_age_days(episode, mem):
    """How long ago this memory happened, in calendar days (C30):
    episode_date − created_date. Display clock — how the lens says
    'a month ago'; mechanics use memory_age_episodes instead.
    Falls back to lived-episode distance for rows that predate the
    calendar columns."""
    ep_date = episode_date(episode)
    if ep_date is not None and getattr(mem, 'created_date', None):
        return max(0, (ep_date - mem.created_date).days)
    idx = episode_index(episode)
    if idx is None or getattr(mem, 'created_episode', None) is None:
        return None
    return max(0, idx - mem.created_episode)


def link_evoked(perceived_day, evoked):
    """Attach each evoked memory to the perceived items it relates to —
    traceability for the lens and for debugging. Content tags only:
    intersecting ambient tags (same region, same event type) would fake
    an anchor for a memory that actually surfaced on semantic vibe."""
    for item in perceived_day or []:
        item_contact = _contact_tags(item.get('tags') or [])
        item['evoked'] = [
            m.id for m in evoked
            if item_contact & _contact_tags(m.tags or [])
        ]
    return perceived_day
