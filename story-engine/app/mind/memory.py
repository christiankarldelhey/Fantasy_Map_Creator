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
from app.mind.embeddings import embed
from app.mind.nl_resolver import _humanize, phrases as nl_phrases
from app.mind.provisioning import DEFAULT_WIRING
from app.mind.tables import Belief, Episode, Memory, Need


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


def _describe(session, game_id, item, brain=None):
    # An unnoticed event never resolved into a reading — what may lodge in
    # memory is only the difuso it left behind (editable 'mind.unnoticed').
    if item.get('perception') == 'unnoticed':
        vague = nl_phrases(session, game_id, 'mind.unnoticed', brain=brain)
        return vague[0] if vague else 'a faint unease, its source unclear'
    data = item.get('data') or {}
    subject = (
        data.get('entity_name') or data.get('name')
        or _humanize(data.get('entity') or data.get('entity_id'))
    )
    desc = item.get('reading') or (str(subject) if subject else None)
    # Unwordable items — 'body'/'travel' resolve no reading by design
    # (vitals speak through needs/mood) and carry no subject. Without
    # words there is no impression to keep; 'a body' is not a memory.
    return desc


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
        # Synthetic repetition-pressure items (C5) weigh on the mood but
        # are bookkeeping, not lived content — the rain days themselves
        # are the memory. Break items DO encode: 'the first dry day' is
        # news, volatile, and fades like anything else.
        if (item.get('data') or {}).get('synthetic'):
            continue
        importance = item.get('salience') or 0.0
        if importance <= 0:
            continue
        sig = _signature(item)
        consolidated = importance >= fixed
        desc = _describe(session, episode.game_id, item, brain=brain)
        if desc is None:
            continue
        # A need speaks in one voice across its whole arc: 'the hunger'
        # is one memory that gains days, not a fresh copy per dawn
        # (C15). The row absorbs this episode, refreshes its urgency and
        # adopts the current reading — a deep-tier rewording re-embeds.
        if item.get('type') == 'need':
            key = (item.get('data') or {}).get('need')
            existing = (
                session.query(Memory)
                .filter_by(character_id=episode.character_id)
                .filter(Memory.tags.op('?')(f'need:{key}'))
                .order_by(Memory.created_episode.desc())
                .first()
            )
            if existing is not None:
                if episode.id not in (existing.episode_ids or []):
                    existing.episode_ids = [
                        *(existing.episode_ids or []), episode.id,
                    ]
                existing.importance = max(existing.importance or 0.0, importance)
                existing.strength = max(existing.strength or 0.0, importance)
                if existing.desc != desc:
                    existing.desc = desc
                    existing.embedding = embed(desc)
                continue
        if sig in by_sig:
            mem = by_sig[sig]
            if mem.desc != desc:
                mem.desc = desc
                mem.embedding = embed(desc)  # re-embed on rewording
            mem.importance = importance
            continue
        session.add(Memory(
            game_id=episode.game_id,
            character_id=episode.character_id,
            episode_ids=[episode.id],
            kind='episodic',
            tags=item.get('tags') or [],
            entity_id=_entity_of(item),
            region=(item.get('where') or {}).get('region'),
            desc=desc,
            # The perceived valence — already derived by this mind's
            # affect wiring, or the host's explicit data.valence.
            valence=float(item.get('valence') or 0.0),
            importance=importance,
            strength=importance,
            evocations=0,
            consolidated=consolidated,
            origin='experience',
            created_episode=idx,
            embedding=embed(desc),
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


def _exempt_this_episode(mem, current_episode_index):
    """Born or stirred this episode — forgetting never eats fresh content."""
    return (
        current_episode_index is not None
        and (
            mem.created_episode == current_episode_index
            or mem.last_evoked_episode == current_episode_index
        )
    )


def decay_pass(session, brain, current_episode_index):
    """One forgetting pass over the character's memories (C16 tiers).

    Volatiles decay — but intensity sticks: a memory of strong feeling
    or real importance fades at the slower sticky rate, so a warg
    attack outlives a hare by weeks. Consolidation by recall requires
    an importance floor: trivia evoked daily strengthens yet never
    fixes. Consolidated rows fade at a crawl (consolidated_decay) —
    long-term is months, not eternity; patterns keep their own
    recurrence lifecycle in detect_patterns.
    """
    w = _wiring(brain)
    decay = w.get('decay', 0.85)
    forget = w.get('forget_threshold', 0.2)
    fix_k = int(w.get('evocations_to_fix', 3))
    fix_min = w.get('consolidate_min_importance', 0.3)
    sticky = w.get('decay_sticky', 0.95)
    sticky_val = w.get('decay_sticky_valence', 0.4)
    sticky_imp = w.get('decay_sticky_importance', 0.5)
    slow = w.get('consolidated_decay', 0.98)

    forgotten = 0
    consolidated = 0
    for mem in (
        session.query(Memory)
        .filter_by(character_id=brain.character_id, consolidated=False)
        .all()
    ):
        if (
            mem.evocations >= fix_k
            and (mem.importance or 0.0) >= fix_min
        ):
            mem.consolidated = True
            consolidated += 1
            continue
        if _exempt_this_episode(mem, current_episode_index):
            continue
        rate = (
            sticky
            if (
                abs(mem.valence or 0.0) >= sticky_val
                or (mem.importance or 0.0) >= sticky_imp
            )
            else decay
        )
        mem.strength = (mem.strength or 0.0) * rate
        if mem.strength < forget:
            session.delete(mem)
            forgotten += 1

    for mem in (
        session.query(Memory)
        .filter_by(character_id=brain.character_id, consolidated=True)
        .all()
    ):
        if mem.kind == 'pattern':
            continue
        if _exempt_this_episode(mem, current_episode_index):
            continue
        mem.strength = (mem.strength or 0.0) * slow
        if mem.strength < forget:
            session.delete(mem)
            forgotten += 1
    # autoflush is off: without this a deleted row stays visible to the
    # next query in the same close and gets forgotten twice.
    session.flush()
    return {'forgotten': forgotten, 'consolidated': consolidated}


def _release_resolved_needs(session, brain):
    """A closed chapter leaves a fading trace, not a fixed anchor
    (C16): a need memory stays consolidated only while the need is
    open — once resolved it rejoins the volatile pool and wears away
    over the following weeks."""
    resolved_keys = {
        n.key for n in session.query(Need).filter_by(
            character_id=brain.character_id, status='resolved'
        )
    }
    if not resolved_keys:
        return 0
    released = 0
    for mem in (
        session.query(Memory)
        .filter_by(character_id=brain.character_id, consolidated=True)
        .all()
    ):
        need_tag = next(
            (t for t in (mem.tags or []) if t.startswith('need:')),
            None,
        )
        if need_tag and need_tag[len('need:'):] in resolved_keys:
            mem.consolidated = False
            released += 1
    return released


def _compact_duplicates(session, brain):
    """Limpieza (C16): copies of the same memory fold into one — need
    arcs written before the merge existed, or rows that only ever
    differed by id. The newest row keeps the union of episodes and the
    sum of recall. Runs every close; the table stays small."""
    groups = {}
    for mem in (
        session.query(Memory)
        .filter_by(character_id=brain.character_id)
        .all()
    ):
        need_tag = next(
            (t for t in (mem.tags or []) if t.startswith('need:')),
            None,
        )
        key = need_tag or (
            mem.kind,
            (mem.desc or '').strip().lower(),
            mem.entity_id,
        )
        groups.setdefault(key, []).append(mem)

    merged = 0
    for group in groups.values():
        if len(group) < 2:
            continue
        group.sort(
            key=lambda m: (m.created_episode or 0), reverse=True
        )
        keep = group[0]
        for dup in group[1:]:
            keep.episode_ids = sorted(set(
                (keep.episode_ids or []) + (dup.episode_ids or [])
            ))
            keep.evocations = (keep.evocations or 0) + (dup.evocations or 0)
            keep.importance = max(
                keep.importance or 0.0, dup.importance or 0.0
            )
            keep.strength = max(keep.strength or 0.0, dup.strength or 0.0)
            last = max(
                keep.last_evoked_episode or 0,
                dup.last_evoked_episode or 0,
            )
            keep.last_evoked_episode = last or None
            keep.consolidated = keep.consolidated or dup.consolidated
            session.delete(dup)
            merged += 1
    session.flush()
    return merged


def belief_fade_pass(session, brain, current_episode_index):
    """C14: transient beliefs fade with time, not just reflection —
    'this ford is dangerous these days' stops being true when the days
    move on. Each closed episode the belief was not refreshed (a
    reflection that touched it sets updated_episode), confidence decays;
    below the weaken floor it goes quiet like any ignored conviction."""
    if current_episode_index is None:
        return {'beliefs_faded': 0}
    w = _wiring(brain)
    decay = w.get('belief_transient_episode_decay', 0.9)
    weaken_below = w.get('belief_weaken_below', 0.3)
    faded = 0
    beliefs = (
        session.query(Belief)
        .filter_by(
            character_id=brain.character_id,
            horizon='transient',
            status='active',
        )
        .all()
    )
    for belief in beliefs:
        if belief.updated_episode == current_episode_index:
            continue
        belief.confidence = (belief.confidence or 0.0) * decay
        if belief.confidence < weaken_below:
            belief.status = 'weakened'
        faded += 1
    return {'beliefs_faded': faded}


def _pattern_desc(session, game_id, tag, count, brain=None):
    """A theme worded by the NL pack ('mind.pattern'), {subject} = the
    human end of the tag ('tag:food:lembas' -> 'lembas')."""
    subject = tag.rsplit(':', 1)[-1].replace('_', ' ').replace('-', ' ')
    options = nl_phrases(session, game_id, 'mind.pattern', brain=brain)
    if options:
        return options[0].format(subject=subject, count=count)
    return f'{subject} keeps recurring'


def _pattern_eligible(tag):
    """A recurring theme must be a named thing: an entity, a region, a
    curated semantic tag ('tag:weather:*'), or a single-segment host tag
    ('tag:omen'). 'type:*' is too generic — every day has travel and
    meals — and 'tag:<field>:<value>' is raw bookkeeping: 'food: lembas'
    every day is what happened, not what means anything."""
    if tag.startswith(('entity:', 'region:', 'tag:weather:')):
        return True
    return tag.startswith('tag:') and ':' not in tag[len('tag:'):]


def detect_patterns(session, brain, episode, idx, w):
    """Second path to permanence (spec §7.3): a theme-eligible tag
    perceived in >= pattern_min_episodes of the last pattern_window
    episodes consolidates into a fixed kind='pattern' memory.

    Counts *perceived* tags (episodes.perceived_day), not memories — the
    trivial-but-repeated is exactly what never encoded. Unnoticed events
    don't count: the mind never registered them.

    Patterns live by recurrence: one whose theme stops appearing (or
    whose tag is no longer eligible) fades like any volatile memory."""
    if idx is None:
        return {'formed': 0, 'faded': 0}
    window = int(w.get('pattern_window', 4))
    min_hits = int(w.get('pattern_min_episodes', 3))
    recent = (
        session.query(Episode)
        .filter_by(character_id=brain.character_id)
        .order_by(Episode.created_at.desc())
        .limit(window * 2)
        .all()
    )
    tag_episodes = {}
    for ep in recent:
        ep_idx = episode_index(ep)
        if ep_idx is None or not (idx - window + 1 <= ep_idx <= idx):
            continue
        for item in ep.perceived_day or []:
            if item.get('perception') == 'unnoticed':
                continue
            for tag in item.get('tags') or []:
                if not _pattern_eligible(tag):
                    continue
                tag_episodes.setdefault(tag, set()).add(ep_idx)

    existing = {
        (m.tags or [None])[0]: m
        for m in session.query(Memory)
        .filter_by(character_id=brain.character_id, kind='pattern')
        .all()
    }
    formed = 0
    for tag, eps in tag_episodes.items():
        if len(eps) < min_hits:
            continue
        pat = existing.get(tag)
        if pat is not None:
            # The theme is still alive — a touch of strength, no duplicate.
            pat.strength = 1.0
            pat.last_evoked_episode = idx
            continue
        desc = _pattern_desc(session, brain.game_id, tag, len(eps),
                             brain=brain)
        session.add(Memory(
            game_id=brain.game_id,
            character_id=brain.character_id,
            episode_ids=[],
            kind='pattern',
            tags=[tag],
            entity_id=(
                tag.split('entity:', 1)[1] if tag.startswith('entity:')
                else None
            ),
            region=(
                tag.split('region:', 1)[1] if tag.startswith('region:')
                else None
            ),
            desc=desc,
            valence=0.0,
            importance=min(1.0, len(eps) / window),
            strength=1.0,
            evocations=0,
            last_evoked_episode=idx,
            consolidated=True,
            origin='experience',
            created_episode=idx,
            embedding=embed(desc),
        ))
        formed += 1

    # A pattern whose theme did not recur this window dissolves back into
    # routine, fading like a volatile memory — a genuine recall this
    # episode suspends that. One whose tag is no longer eligible is an
    # artifact of older rules (e.g. 'tag:wounded:none'): it was never a
    # theme, so it is evicted outright even if just stirred.
    decay = w.get('decay', 0.85)
    forget = w.get('forget_threshold', 0.2)
    faded = 0
    for tag, pat in existing.items():
        eps = tag_episodes.get(tag)
        if eps is not None and len(eps) >= min_hits:
            continue  # refreshed above — tag_episodes holds eligible tags only
        if not _pattern_eligible(tag):
            session.delete(pat)
            faded += 1
            continue
        if pat.last_evoked_episode == idx:
            continue
        pat.strength = (pat.strength or 0.0) * decay
        if pat.strength < forget:
            session.delete(pat)
            faded += 1
    return {'formed': formed, 'faded': faded}


def close_episode_memory(session, brain, episode):
    """Full consolidation pass for one close: encode, detect the recurring
    themes, then decay the volatiles. Degraded brains (B10: NPCs) only
    encode — their forgetting runs in batch via /maintenance/consolidate."""
    idx = episode_index(episode)
    w = _wiring(brain)
    enc = encode_episode(session, brain, episode)
    if w.get('degraded'):
        return {
            'encoded': enc['encoded'],
            'forgotten': 0,
            'consolidated': enc['born_consolidated'],
            'patterns': 0,
            'patterns_faded': 0,
            'degraded': True,
        }
    released = _release_resolved_needs(session, brain)
    merged = _compact_duplicates(session, brain)
    patterns = detect_patterns(session, brain, episode, idx, w)
    decayed = decay_pass(session, brain, idx)
    beliefs = belief_fade_pass(session, brain, idx)
    return {
        'encoded': enc['encoded'],
        'forgotten': decayed['forgotten'],
        'consolidated': enc['born_consolidated'] + decayed['consolidated'],
        'patterns': patterns['formed'],
        'patterns_faded': patterns['faded'],
        'beliefs_faded': beliefs['beliefs_faded'],
        'needs_released': released,
        'memories_merged': merged,
    }
