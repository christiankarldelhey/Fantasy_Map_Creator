# ============================================================================
# Needs engine (B2) — open intentions of the mind
# ----------------------------------------------------------------------------
# Two deterministic sources, per spec §9:
#
#   Detectors ('physiological') — read the character state (snapshot or the
#   episode's body event): days without food/water, spent energy, rising
#   shadow, hostile-weather streaks (brain.counters). They fire each open;
#   urgency recomputes and grows with the underlying state; when the state
#   clears, the need resolves itself at the next open.
#
#   Threads ('thread') — the host marks an event `data.thread: "<slug>"`
#   (optionally thread_desc / urgency); it becomes an open intention
#   anchored to entity/region. Threads never self-resolve: they close via
#   `data.resolves` on a later event or `outcome.resolved_needs` at close.
#
# Needs surface as needs_active in the packet and the lens' Needs section —
# intentions the narrator may voice, never mechanics.
# ============================================================================
from app.mind.checks import _num, character_state
from app.mind.detectors import detector_needs
from app.mind.memory import episode_index
from app.mind.nl_resolver import phrases as nl_phrases
from app.mind.provisioning import DEFAULT_WIRING
from app.mind.rules import rule_needs, update_rule_streaks
from app.mind.tables import Need

NEED_PHRASE_PREFIX = 'mind.need.'
THREAD_PREFIX = 'thread:'


def _phrase(session, game_id, key, subject=None, brain=None, urgency=0.0,
            idx=0, wiring=None):
    """Tiered + rotating voice for 'mind.need.<key>'. Urgency past
    need_deep_urgency speaks from '<key>.deep' instead; several variants
    per tier rotate by episode so a lasting need does not always wear the
    same words — but a replay says the same thing every time.
    Threads fall back to the generic 'mind.need.thread' entry."""
    deep_min = (wiring or {}).get('need_deep_urgency', 0.6)
    base = NEED_PHRASE_PREFIX + key
    options = []
    if urgency >= deep_min:
        options = nl_phrases(
            session, game_id, base + '.deep', brain=brain
        )
    if not options:
        options = nl_phrases(session, game_id, base, brain=brain)
    if not options and key.startswith(THREAD_PREFIX):
        options = nl_phrases(
            session, game_id, NEED_PHRASE_PREFIX + 'thread', brain=brain
        )
    if not options:
        return key
    return options[idx % len(options)].format(
        subject=subject or 'something unresolved'
    )


def update_streak_counters(session, brain, episode):
    """Close-time bookkeeping (B9): per-rule streaks only count episodes
    the host actually persisted (close), never abandoned opens."""
    update_rule_streaks(session, brain, episode)


def _detectors(session, game_id, state, w):
    """Physiological detectors — declared rows/defaults, never hardcoded
    fields (ADR 0005). Keys double as NL phrase keys ('mind.need.hunger')
    and dedup keys. Multi-day states (exposure, snowbound...) are B9
    composite rules, not detectors."""
    return detector_needs(session, game_id, state, w)


def _threads(perceived):
    """Thread needs declared on events + explicit resolves."""
    fired = []
    resolved = []
    for i, item in enumerate(perceived or []):
        # Unnoticed events can't open threads — the mind never saw them.
        if item.get('perception') == 'unnoticed':
            continue
        data = item.get('data') or {}
        slug = data.get('thread')
        if isinstance(slug, str) and slug:
            subject = data.get('entity') or data.get('entity_id') or data.get('name')
            fired.append({
                'key': f'{THREAD_PREFIX}{slug}', 'type': 'thread',
                'urgency': min(1.0, _num(data.get('urgency')) or 0.5),
                'desc': data.get('thread_desc'),
                'subject': subject,
                'entity': subject,
                'region': (item.get('where') or {}).get('region'),
                'source': {'event_index': i, 'event_type': item.get('type')},
            })
        resolves = data.get('resolves')
        if isinstance(resolves, str):
            resolves = [resolves]
        resolved.extend(resolves or [])
    return fired, resolved


def _resolve(need, reason, idx):
    need.status = 'resolved'
    need.updated_episode = idx
    need.resolution = reason


def needs_pass(session, game_id, brain, episode, perceived, character=None):
    """Open-time pass: fire detectors + threads, refresh urgency, close what
    cleared. Returns the character's open needs (urgency desc)."""
    w = {**DEFAULT_WIRING, **(brain.wiring or {})}
    idx = episode_index(episode)
    state = character_state(character, episode.events)

    fired = _detectors(session, game_id, state, w)
    # B9: declarative multi-day rules (exposure, snowbound, ...) — the
    # streak counter is bumped at close; today counts optimistically.
    fired += rule_needs(session, brain, episode, w=w)
    threads, resolved_refs = _threads(perceived)
    fired += threads

    existing = {
        n.key: n
        for n in session.query(Need).filter_by(
            game_id=game_id, character_id=brain.character_id
        ).all()
    }
    touched = set()
    for spec in fired:
        key = spec['key']
        desc = spec.get('desc') or _phrase(
            session, game_id, key, spec.get('subject'), brain=brain,
            urgency=spec.get('urgency') or 0.0, idx=idx, wiring=w,
        )
        need = existing.get(key)
        # The brief speaks a need when it is new or worsening — remember
        # where it stood before this episode refreshed it.
        was_open = need is not None and need.status == 'open'
        prior_urgency = need.urgency if was_open else None
        if need is None:
            need = Need(
                game_id=game_id, character_id=brain.character_id, key=key,
                type=spec['type'], description=desc,
                urgency=spec['urgency'], status='open',
                source=spec.get('source'),
                linked_entity=spec.get('entity'),
                linked_region=spec.get('region'),
                opened_episode=idx, updated_episode=idx,
            )
            session.add(need)
            existing[key] = need
        else:
            need.status = 'open'
            need.urgency = spec['urgency']
            need.description = desc
            need.updated_episode = idx
            need.resolution = None
            if need.opened_episode is None:
                need.opened_episode = idx
        need.is_new = not was_open
        need.worsening = (
            prior_urgency is not None
            and (spec['urgency'] or 0.0) > (prior_urgency or 0.0) + 1e-6
        )
        touched.add(key)

    # Detector needs that stopped firing resolved themselves — the state
    # that fed them is gone. Threads never auto-resolve.
    for key, need in existing.items():
        if (
            need.type == 'physiological' and need.status == 'open'
            and key not in touched
        ):
            _resolve(need, {'reason': 'state_cleared'}, idx)

    # Explicit resolutions declared on this episode's events.
    for ref in resolved_refs:
        need = existing.get(ref) or existing.get(f'{THREAD_PREFIX}{ref}')
        if need is not None and need.status == 'open':
            _resolve(need, {'reason': 'event', 'ref': ref}, idx)

    return sorted(
        (n for n in existing.values() if n.status == 'open'),
        key=lambda n: n.urgency or 0.0, reverse=True,
    )


def resolve_from_outcome(session, brain, episode, outcome):
    """Close-time: the host reports which needs its persisted outcome
    settled. Entries may be need ids, keys, thread slugs or types."""
    refs = (outcome or {}).get('resolved_needs') or []
    if isinstance(refs, str):
        refs = [refs]
    if not refs:
        return 0
    idx = episode_index(episode)
    open_needs = session.query(Need).filter_by(
        character_id=brain.character_id, status='open'
    ).all()
    resolved = 0
    for ref in refs:
        for need in open_needs:
            if need.id == ref or need.key in (ref, f'{THREAD_PREFIX}{ref}') \
                    or need.type == ref:
                _resolve(
                    need, {'reason': 'outcome', 'ref': ref}, idx,
                )
                resolved += 1
                break
    return resolved


def need_items(needs):
    """The felt body joins the perceived day (C11): one 'need' item per
    open physiological need — reading is the tiered description, salience
    and valence follow urgency. Encodes like any other perception, so the
    ache of these days becomes memory. Threads stay intentions only."""
    items = []
    for n in needs:
        if n.type != 'physiological':
            continue
        urgency = n.urgency or 0.0
        items.append({
            'type': 'need',
            'perception': 'noticed',
            'reading': n.description,
            'salience': round(urgency, 3),
            'valence': round(-urgency, 3),
            'severity': round(urgency, 3),
            'tags': [f'need:{n.key}'],
            'data': {'need': n.key, 'urgency': urgency},
            'evoked': [],
        })
    return items


def need_snapshot(needs):
    """Packet/lens shape — intentions, not mechanics."""
    return [
        {
            'id': n.id, 'key': n.key, 'type': n.type,
            'description': n.description, 'urgency': round(n.urgency or 0, 3),
            'entity': n.linked_entity, 'region': n.linked_region,
            'source': n.source,
            # Transient, set by needs_pass: a snapshot rebuilt elsewhere
            # reads them as False.
            'is_new': bool(getattr(n, 'is_new', False)),
            'worsening': bool(getattr(n, 'worsening', False)),
        }
        for n in needs
    ]
