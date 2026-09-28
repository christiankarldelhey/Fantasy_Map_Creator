# ============================================================================
# Memory — the hippocampus: close-episode encodes, decays and forgets
# ----------------------------------------------------------------------------
# Encoding: each perceived event above zero salience becomes a memory —
# `consolidated` at birth when importance >= fixed_threshold, otherwise
# volatile with strength = importance. Re-close is deduplicated by
# (episode, tag signature): never encodes twice.
#
# Decay: volatile memories not evoked this episode lose strength *= decay;
# below forget_threshold they die. evocations >= evocations_to_fix promotes
# to consolidated. Memories born this episode are exempt from the pass.
# ============================================================================
from app.mind.provisioning import DEFAULT_WIRING
from app.mind.tables import Memory


def _wiring(brain):
    return {**DEFAULT_WIRING, **(brain.wiring or {})}


def episode_index(episode):
    """The host's episode number, from the events' when.episode."""
    nums = [
        (e.get('when') or {}).get('episode')
        for e in (episode.events or [])
    ]
    nums = [n for n in nums if isinstance(n, int)]
    return max(nums) if nums else None


def _signature(item):
    """Dedup key for re-close: the event's tag-set + entity + region."""
    return (
        tuple(sorted(item.get('tags') or [])),
        item.get('entity_id') or _entity_of(item),
        (item.get('where') or {}).get('region'),
    )


def _entity_of(item):
    data = item.get('data') or {}
    return data.get('entity') or data.get('entity_id')


def _describe(item):
    data = item.get('data') or {}
    subject = data.get('entity') or data.get('entity_id') or data.get('name')
    return item.get('reading') or (str(subject) if subject else f"a {item.get('type')}")


def encode_episode(session, brain, episode):
    """Turn this episode's perceived_day into memories. Idempotent: items
    already encoded for this episode are refreshed, never duplicated."""
    w = _wiring(brain)
    fixed = w.get('fixed_threshold', 0.8)
    idx = episode_index(episode)

    # Memories already written for this episode -> the dedup baseline.
    prior = (
        session.query(Memory)
        .filter(
            Memory.character_id == episode.character_id,
            Memory.episode_ids.contains([episode.id]),
        )
        .all()
    )
    by_sig = {_signature_from_memory(m): m for m in prior}

    encoded = 0
    born_consolidated = 0
    for item in episode.perceived_day or []:
        importance = item.get('salience') or 0.0
        if importance <= 0:
            continue
        sig = _signature(item)
        consolidated = importance >= fixed
        desc = _describe(item)
        if sig in by_sig:
            mem = by_sig[sig]
            mem.desc = desc
            mem.importance = importance
            continue
        data = item.get('data') or {}
        session.add(Memory(
            game_id=episode.game_id,
            character_id=episode.character_id,
            episode_ids=[episode.id],
            kind='episodic',
            tags=item.get('tags') or [],
            entity_id=_entity_of(item),
            region=(item.get('where') or {}).get('region'),
            desc=desc,
            valence=float(data.get('valence') or 0.0),
            importance=importance,
            strength=importance,
            evocations=0,
            consolidated=consolidated,
            origin='experience',
            created_episode=idx,
        ))
        encoded += 1
        born_consolidated += int(consolidated)
    return {'encoded': encoded, 'born_consolidated': born_consolidated}


def _signature_from_memory(memory):
    return (
        tuple(sorted(memory.tags or [])),
        memory.entity_id,
        memory.region,
    )


def decay_pass(session, brain, current_episode_index):
    """One forgetting pass over the character's volatile memories."""
    w = _wiring(brain)
    decay = w.get('decay', 0.85)
    forget = w.get('forget_threshold', 0.2)
    fix_k = int(w.get('evocations_to_fix', 3))

    volatiles = (
        session.query(Memory)
        .filter_by(character_id=brain.character_id, consolidated=False)
        .all()
    )
    forgotten = 0
    consolidated = 0
    for mem in volatiles:
        if mem.evocations >= fix_k:
            mem.consolidated = True
            consolidated += 1
            continue
        # None-safe: an episodeless index must never match a NULL marker.
        born_this_episode = (
            current_episode_index is not None
            and mem.created_episode == current_episode_index
        )
        evoked_this_episode = (
            current_episode_index is not None
            and mem.last_evoked_episode == current_episode_index
        )
        if born_this_episode or evoked_this_episode:
            continue
        mem.strength = (mem.strength or 0.0) * decay
        if mem.strength < forget:
            session.delete(mem)
            forgotten += 1
    return {'forgotten': forgotten, 'consolidated': consolidated}


def close_episode_memory(session, brain, episode):
    """Full consolidation pass for one close: encode then decay."""
    idx = episode_index(episode)
    enc = encode_episode(session, brain, episode)
    decayed = decay_pass(session, brain, idx)
    return {
        'encoded': enc['encoded'],
        'forgotten': decayed['forgotten'],
        'consolidated': enc['born_consolidated'] + decayed['consolidated'],
    }
