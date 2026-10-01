# ============================================================================
# Retrieval — what the episode stirs up
# ----------------------------------------------------------------------------
# Deterministic scoring:
#   score = α·recency(e^-λ·Δepisodes) + β·importance + γ·relevance
#           + δ·semantic_similarity   (B8 — embeddings, JSONB + Python)
# relevance = share of the memory's tags that appear in the episode's
# context — perceived event tags ∪ active belief tags (a belief about orcs
# makes orc-memories easier to stir). Top-K (wiring) get evoked: the single
# write of this read path is evocations++ / last_evoked_episode /
# strength += retrieval_boost — evoking a memory strengthens it.
#
# Contact gate (C20): freshness alone never evokes. A memory must touch
# THIS day's story — a shared tag with what was actually perceived, or
# semantic similarity above the wiring floor — otherwise it stays a
# memory, unevoked. On a day that touches nothing, nothing stirs.
# ============================================================================
import math

from app.mind.embeddings import cosine, embed, ensure_embedding, episode_embedding
from app.mind.provisioning import DEFAULT_WIRING
from app.mind.tables import Belief, Memory


def _context_tags(perceived_day, beliefs):
    tags = set()
    for item in perceived_day or []:
        tags.update(item.get('tags') or [])
    for belief in beliefs:
        tags.update(belief.tags or [])
    return tags


def _relevance(memory_tags, context_tags):
    tags = set(memory_tags or [])
    if not tags:
        return 0.0
    return min(1.0, len(tags & context_tags) / len(tags))


# C20 gate refinement: contact must be about WHAT happened, not the
# day's weather report, menu, mileage or coordinates. Ambient tags —
# the event's own class, the sky, the ration, the region — are
# background: without them, the same rain 'evokes' every past rain and
# the road-bread out-recalls every encounter.
_CONTACT_AMBIENT_PREFIXES = (
    'type:', 'tag:weather:', 'tag:food:', 'tag:drink:', 'region:',
)


def _contact_tags(tags):
    """The subset of tags that can make a memory TOUCH today: entity,
    entity_type, form, topic, name, need — the story's nouns, not its
    weather."""
    return {
        t for t in (tags or [])
        if not t.startswith(_CONTACT_AMBIENT_PREFIXES)
    }


def rank_beliefs(beliefs, perceived_day):
    """Order active beliefs for the lens (C18): a belief speaks when the
    day touches it. rank = confidence × (1 + tag-overlap with what was
    perceived) — untagged convictions keep their baseline so the core
    personality still competes, but a belief about people surfaces on
    people-days and stays quiet on empty moorland."""
    day_tags = set()
    for item in perceived_day or []:
        day_tags.update(item.get('tags') or [])
    return sorted(
        beliefs,
        key=lambda b: (b.confidence or 0.0)
        * (1.0 + _relevance(b.tags, day_tags)),
        reverse=True,
    )


def retrieve(session, brain, episode, perceived_day):
    """Score the character's memories against this episode's context and
    evoke the top-K. Returns the evoked Memory rows (highest score first).
    Called once, at episode creation — re-open replays stored annotations."""
    w = {**DEFAULT_WIRING, **(brain.wiring or {})}
    idx = episode_index_of(episode)

    beliefs = (
        session.query(Belief)
        .filter_by(character_id=brain.character_id, status='active')
        .all()
    )
    context = _context_tags(perceived_day, beliefs)
    # C20: the gate listens only to the day itself — beliefs soften the
    # score but do not make yesterday's people relevant to today's road.
    # And only content tags count: 'same wet sky' is ambience, not story.
    day_tags = set()
    for item in perceived_day or []:
        day_tags.update(_contact_tags(item.get('tags') or []))

    candidates = (
        session.query(Memory)
        .filter_by(character_id=brain.character_id)
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

    scored = []
    imp_min = w.get('retrieval_importance_min', 0.15)
    sem_min = w.get('retrieval_semantic_min', 0.5)
    refractory = int(w.get('refractory_episodes', 1))
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
        # A memory whose tags are ALL ambient never stirs: the day's
        # bread and the day's sky belong to the recurrence channel, not
        # to evocation — otherwise the ration out-thinks the warg.
        # (Tag-less memories keep the semantic door, B8.)
        mem_contact = _contact_tags(mem.tags)
        if mem.tags and not mem_contact:
            continue
        sim = (
            cosine(episode_vec, ensure_embedding(mem))
            if episode_vec is not None else 0.0
        )
        # Contact gate: no content tag shared with today, no semantic
        # overlap — no evocation, however fresh or important the memory.
        if _relevance(mem_contact, day_tags) <= 0.0 and sim < sem_min:
            continue
        # C23: recency ages from when the event HAPPENED, never from
        # when it was last recalled — evoking the fox does not make
        # the fox newer; it only strengthens the trace.
        delta = max(0, (idx or 0) - (mem.created_episode or 0))
        recency = math.exp(-lam * delta)
        score = (
            alpha * recency
            + beta * (mem.importance or 0.0)
            + gamma * _relevance(mem.tags, context)
        )
        if episode_vec is not None:
            score += delta_w * sim
        scored.append((score, mem))

    scored.sort(key=lambda t: t[0], reverse=True)
    top_k = int(w.get('retrieval_top_k', 5))
    boost = w.get('retrieval_boost', 0.1)
    # Evocation asks for a minimum score — otherwise a mind with few
    # memories would stir every one of them each episode and nothing
    # would ever fade.
    min_score = w.get('retrieval_min_score', 0.5)

    evoked = []
    for score, mem in scored[:top_k]:
        if score < min_score:
            break
        mem.evocations = (mem.evocations or 0) + 1
        if idx is not None:
            mem.last_evoked_episode = idx
        mem.strength = min(1.0, (mem.strength or 0.0) + boost)
        evoked.append(mem)
    return evoked


def dialogue_recall(session, brain, item, idx, exclude_ids=()):
    """Focused recall for a spoken encounter (C23): embed what was
    actually asked/said and return the memory that best answers it —
    the traveller may reply from what they retained, not from nowhere.

    One probe text (topic + content + tension), one cosine pass over
    the brain's memories, best hit above dialogue_recall_min wins.
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

    w = {**DEFAULT_WIRING, **(brain.wiring or {})}
    floor = float(w.get('dialogue_recall_min', 0.4))
    imp_min = w.get('retrieval_importance_min', 0.15)
    refractory = int(w.get('refractory_episodes', 1))

    best = None
    best_sim = floor
    for mem in (
        session.query(Memory)
        .filter_by(character_id=brain.character_id)
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


def episode_index_of(episode):
    nums = [
        (e.get('when') or {}).get('episode')
        for e in (episode.events or [])
    ]
    nums = [n for n in nums if isinstance(n, int)]
    return max(nums) if nums else None


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
