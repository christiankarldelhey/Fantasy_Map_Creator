# ============================================================================
# Retrieval — what the episode stirs up
# ----------------------------------------------------------------------------
# Deterministic scoring (embeddings are B8):
#   score = α·recency(e^-λ·Δepisodes) + β·importance + γ·relevance
# relevance = share of the memory's tags that appear in the episode's
# context — perceived event tags ∪ active belief tags (a belief about orcs
# makes orc-memories easier to stir). Top-K (wiring) get evoked: the single
# write of this read path is evocations++ / last_evoked_episode /
# strength += retrieval_boost — evoking a memory strengthens it.
# ============================================================================
import math

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

    scored = []
    for mem in candidates:
        anchor = mem.last_evoked_episode or mem.created_episode or 0
        delta = max(0, (idx or 0) - anchor)
        recency = math.exp(-lam * delta)
        score = (
            alpha * recency
            + beta * (mem.importance or 0.0)
            + gamma * _relevance(mem.tags, context)
        )
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


def episode_index_of(episode):
    nums = [
        (e.get('when') or {}).get('episode')
        for e in (episode.events or [])
    ]
    nums = [n for n in nums if isinstance(n, int)]
    return max(nums) if nums else None


def link_evoked(perceived_day, evoked):
    """Attach each evoked memory to the perceived items it relates to —
    traceability for the lens and for debugging."""
    for item in perceived_day or []:
        item_tags = set(item.get('tags') or [])
        item['evoked'] = [
            m.id for m in evoked if item_tags & set(m.tags or [])
        ]
    return perceived_day
