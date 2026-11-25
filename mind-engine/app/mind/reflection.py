# ============================================================================
# Reflection (B4) — the mind's only LLM call
# ----------------------------------------------------------------------------
# Triggered at close-episode: every `reflection_every` episodes (bent by
# `personality.reflectiveness`), or any perceived event whose salience
# clears `reflection_importance_min`.
#
# The LLM sees the character's strongest memories and active beliefs and
# returns OPERATIONS, not prose: create / reinforce / contradict / invert
# — and words-only ones: reword a memory's desc, reword a belief's
# statement, reword the carried mood cause. The anti-hallucination rule
# is hard: every belief op must cite real memory ids in `evidence` — ops
# without valid evidence are dropped before touching the DB.
# Reconciliation is applied here deterministically (deltas,
# weakened/inverted status, cap on active beliefs, decay of the
# unreinforced). The LLM touches wording, never values. If it is down or
# talks nonsense, reflection is skipped: the close must never fail on it.
# ============================================================================
import json
import logging
import re

from sqlalchemy import or_

from app.ai import generate_narrative
from app.mind.engine import derive_feeling, feeling_lexicon
from app.mind.focus import _touches, brief_lines
from app.mind.kinds import is_mind_item
from app.mind.memory import episode_index
from app.mind.provisioning import DEFAULT_WIRING
from app.mind.steps import step
from app.mind.tables import Episode, Memory

log = logging.getLogger(__name__)

_SYSTEM = """\
You are the reflective faculty of a fictional character's mind. Given the
memories that marked them and the beliefs they already hold, decide how
those beliefs should change — and whether anything deserves better words.
Answer with ONLY a JSON object — no prose, no fences:

{"reflections": [
  {"op": "create",     "kind": "world|self|other|value",
   "horizon": "enduring|transient", "statement": "...",
   "strength": 1-5, "evidence": ["mem_id", ...]},
  {"op": "reinforce",  "belief_id": "bl_...", "evidence": ["mem_id", ...],
   "statement": "optional — the belief, reworded"},
  {"op": "contradict", "belief_id": "bl_...", "evidence": ["mem_id", ...],
   "statement": "optional — the belief as it now stands"},
  {"op": "invert",     "belief_id": "bl_...", "statement": "the inverted
   belief", "strength": 1-5, "evidence": ["mem_id", ...]},
  {"op": "reword",     "memory_id": "mem_...", "desc": "the memory
   retold, more inward"}
 ],
 "mood_prose": "optional — what still weighs on them, reworded"}

Rules:
- Every belief operation MUST cite memory ids in "evidence" — no belief
  without lived evidence.
- Only "invert" when a belief has been denied repeatedly; the new
  "statement" is the grown belief (opposite sign).
- "reword" retells a memory in the mind's own voice — the same event,
  never new facts.
- "mood_prose" rewords the carried mood cause listed below; omit it when
  the mood is at ease or the cause already reads true.
- Keep statements first-person and concrete; never mention ids, episodes
  or the word "memory".
- "horizon" is 'transient' when the belief binds to current
  circumstances — this road these days, this weather, this ford —
  and 'enduring' when it says something about the world's nature,
  other people, or the self.
- If nothing warrants a change, return {"reflections": []}.
"""

_JSON_RE = re.compile(r'\{.*\}', re.S)


def _parse_payload(text):
    if not text:
        return {}
    match = _JSON_RE.search(text)
    if not match:
        return {}
    try:
        payload = json.loads(match.group(0))
    except (ValueError, TypeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def _build_prompt(character_name, memories, beliefs, cause=None):
    mem_lines = '\n'.join(
        f'- id={m.id} valence={m.valence:+.2f} importance={m.importance:.2f}'
        f' — {m.desc}'
        for m in memories
    )
    belief_lines = '\n'.join(
        f'- id={b.id} kind={(b.conviction or {}).get("kind")}'
        f' strength={(b.conviction or {}).get("strength") or 0.0:.1f}'
        f' — {b.desc}'
        for b in beliefs
    ) or '- (none yet)'
    wording = (cause or {}).get('prose') or (cause or {}).get('reading')
    mood_lines = (
        f'What still weighs on them (mood cause):\n- {wording}\n\n'
        if wording else ''
    )
    return {
        'system': _SYSTEM,
        'user': (
            f'The mind of {character_name}.\n\n'
            f'What they lived (memories):\n{mem_lines}\n\n'
            f'What they believe (beliefs):\n{belief_lines}\n\n'
            f'{mood_lines}'
            'Reflect. Which beliefs form, strengthen, weaken or turn?'
        ),
    }


def _valid_ops(ops, memory_ids, belief_ids):
    """Anti-hallucination gate: ops cite real memories and real beliefs or
    they never happened. Words-only ops anchor differently — a reword
    names the memory itself, not evidence."""
    valid = []
    for op in ops:
        name = op.get('op')
        if name == 'reword':
            if op.get('memory_id') in memory_ids and op.get('desc'):
                valid.append(op)
            continue
        evidence = [e for e in (op.get('evidence') or []) if e in memory_ids]
        if not evidence:
            continue
        op['evidence'] = evidence
        if name == 'create':
            if op.get('kind') in ('world', 'self', 'other', 'value') and op.get('statement'):
                if op.get('horizon') not in ('enduring', 'transient'):
                    op['horizon'] = 'enduring'
                valid.append(op)
        elif name in ('reinforce', 'contradict', 'invert'):
            if op.get('belief_id') in belief_ids:
                if name != 'invert' or op.get('statement'):
                    valid.append(op)
    return valid


def _mean_evidence_valence(session, evidence_ids):
    rows = (
        session.query(Memory.valence)
        .filter(Memory.id.in_(evidence_ids))
        .all()
    )
    vals = [r[0] or 0.0 for r in rows]
    return sum(vals) / len(vals) if vals else 0.0


def _strength(op):
    """Declared strength on a 1–5 scale. Tolerates the old 'confidence'
    word — a 0–1 value rescales; anything larger is read as strength."""
    if op.get('strength') is not None:
        return min(5.0, max(0.0, _f(op.get('strength'), 2.0)))
    conf = _f(op.get('confidence'), None)
    if conf is None:
        return 2.0
    return min(5.0, max(0.0, conf * 5 if conf <= 1.0 else conf))


def _conviction(session, op_data, mind, idx, inherited=None):
    """A conviction-tier Memory carrying a belief facet (#168): one row,
    one truth — the impression IS the belief."""
    inherited = inherited or {}
    statement = str(op_data['statement'])[:2000]
    imprint = inherited.get('imprint')
    return Memory(
        game_id=mind.game_id, character_id=mind.character_id,
        kind='conviction', depth='conviction', mutable=True,
        consolidated=True, strength=1.0,
        desc=statement,
        tags=list(inherited.get('tags') or []),
        valence=(imprint or {}).get('affection', 0.0),
        importance=max(
            abs((imprint or {}).get('affection', 0.0)), 0.4),
        imprint=imprint,
        subjects=inherited.get('subjects'),
        feeling=derive_feeling(
            imprint or {},
            feeling_lexicon(session, getattr(mind, 'game_id', None))),
        origin='reflected',
        created_episode=idx,
        conviction={
            'kind': op_data.get('kind') or inherited.get('kind', 'world'),
            'horizon': op_data.get('horizon')
                       or inherited.get('horizon', 'enduring'),
            'status': 'active',
            'strength': _strength(op_data),
            'evidence': list(op_data['evidence']),
            'source': inherited.get('source'),
            'updated': idx,
        },
    )


def _apply_ops(session, mind, ops, beliefs_by_id, memories_by_id, idx, w):
    counts = {
        'formed': 0, 'reinforced': 0, 'contradicted': 0, 'inverted': 0,
        'reworded': 0,
    }
    reinforce = w.get('belief_reinforce_delta', 0.5)
    contradict = w.get('belief_contradict_delta', 0.75)
    weaken_below = w.get('belief_weaken_below', 1.5)
    trauma_min = w.get('belief_trauma_min', 4.5)
    touched = set()

    new_cap = int(w.get('belief_new_per_reflection', 2))
    reword_cap = int(w.get('reword_per_reflection', 3))
    for op in ops:
        name = op['op']
        if name == 'reword':
            # Retelling reconsolidates: the same event in the mind's own
            # words — desc only, the values never move.
            if counts['reworded'] >= reword_cap:
                continue
            mem = memories_by_id.get(op['memory_id'])
            if mem is None:
                continue
            mem.desc = str(op['desc'])[:2000]
            counts['reworded'] += 1
            continue
        if name == 'create':
            # Convictions accrete slowly — a single reflection cannot
            # mint a worldview (the LLM orders its ops by weight).
            if counts['formed'] >= new_cap:
                continue
            session.add(_conviction(session, op, mind, idx))
            counts['formed'] += 1
            continue

        belief = beliefs_by_id.get(op['belief_id'])
        if belief is None:
            continue
        touched.add(belief.id)
        facet = belief.conviction or {}
        if name == 'reinforce':
            facet['strength'] = min(
                5.0, (facet.get('strength') or 0) + reinforce)
            facet['evidence'] = list(
                dict.fromkeys((facet.get('evidence') or []) + op['evidence'])
            )
            facet['updated'] = idx
            # Trauma: a negative belief reinforced past the trauma floor
            # hardens into something that stops fading on its own.
            if facet['strength'] >= trauma_min and _mean_evidence_valence(
                session, facet['evidence']
            ) < 0:
                belief.tags = list(set((belief.tags or []) + ['trauma']))
            if op.get('statement'):
                belief.desc = str(op['statement'])[:2000]
            counts['reinforced'] += 1
        elif name == 'contradict':
            facet['strength'] = (facet.get('strength') or 0) - contradict
            facet['evidence'] = list(
                dict.fromkeys((facet.get('evidence') or []) + op['evidence'])
            )
            facet['updated'] = idx
            # The belief may be rewritten, not just weakened: a conviction
            # that survives its contradiction matures into new wording.
            if op.get('statement'):
                belief.desc = str(op['statement'])[:2000]
            if facet['strength'] < weaken_below:
                facet['status'] = 'weakened'
                # The written conviction quieted — its impression fades
                # to a whisper too (below the retrieval floor it stops
                # echoing into the Relation, but it is never forgotten).
                belief.importance = min(belief.importance or 0.0, 0.05)
                belief.strength = min(belief.strength or 0.0, 0.3)
            counts['contradicted'] += 1
        elif name == 'invert':
            # Growth: the old conviction turns. The row is marked inverted
            # and the new opposite conviction is born from the same
            # evidence — keeping the facets: same subject and tags (it
            # still answers to the same encounters, 'trauma' excepted),
            # the stance turned sign, and 'lived' as its source, since
            # living it is what turned it.
            facet['status'] = 'inverted'
            facet['updated'] = idx
            flipped = {
                d: -v for d, v in (belief.imprint or {}).items()
            } or belief.imprint
            session.add(_conviction(
                session, op, mind, idx, inherited={
                    'kind': facet.get('kind'),
                    'horizon': facet.get('horizon'),
                    'source': 'lived',
                    'imprint': flipped,
                    'subjects': list(belief.subjects)
                                if belief.subjects else None,
                    'tags': [t for t in (belief.tags or [])
                             if t != 'trauma'],
                },
            ))
            counts['inverted'] += 1

    # Strength decays on beliefs this reflection ignored; below the floor
    # they go quiet (status='weakened', still listed, not loud). Transient
    # beliefs fade harder — circumstances stop being true (C14).
    decay = w.get('belief_strength_decay', 0.95)
    transient_decay = w.get('belief_transient_decay', 0.8)
    for belief in beliefs_by_id.values():
        facet = belief.conviction or {}
        # Enduring seed beliefs are nature, not evidence — a mind's
        # personality doesn't fade because a reflection overlooked it
        # (a transient seed is still a circumstance: unstated is gone).
        # Reflection may still reinforce or contradict them deliberately.
        if (
            belief.id in touched or facet.get('status') != 'active'
            or (belief.origin == 'seed'
                and facet.get('horizon') == 'enduring')
        ):
            continue
        rate = (
            transient_decay
            if facet.get('horizon') == 'transient' else decay
        )
        facet['strength'] = (facet.get('strength') or 0) * rate
        facet['updated'] = idx
        if facet['strength'] < weaken_below:
            facet['status'] = 'weakened'

    # Cap: too many loud beliefs and the weakest go quiet. Flush first —
    # beliefs created just above are session-only until flushed.
    cap = int(w.get('belief_cap', 12))
    session.flush()
    active = [
        m for m in session.query(Memory)
        .filter_by(character_id=mind.character_id, kind='conviction')
        .all()
        if (m.conviction or {}).get('status') == 'active'
    ]
    active.sort(
        key=lambda m: (m.conviction or {}).get('strength') or 0.0,
        reverse=True,
    )
    # The cap thins acquired convictions; seeds are the person's nature
    # and outlast it.
    for belief in [b for b in active if b.origin != 'seed'][cap:]:
        (belief.conviction or {})['status'] = 'weakened'
        counts['weakened'] = counts.get('weakened', 0) + 1
    return counts


def reflection_beliefs(session, mind, memories, since_idx, w):
    """The beliefs this reflection may move — not the whole library.

    Every acquired or transient belief (few, capped) plus the seeds the
    evidence can bear on: those touching one of the reflected memories, and
    those the Lens voiced since the last reflection (lived on the road
    even without leaving a memory — solitude thoughts enter this way).
    Voiced first, then by how many memories they touch by tag, then by
    word; at most `reflection_seed_cap`. A seed left out can be neither
    reinforced nor contradicted: nothing lived put it in question."""
    active = [
        m for m in session.query(Memory)
        .filter_by(character_id=mind.character_id, kind='conviction')
        .all()
        if (m.conviction or {}).get('status') == 'active'
    ]
    # Transient seeds are circumstances, not nature: they ride with the
    # acquired beliefs so the reflection can keep fading them.
    nature = [
        b for b in active
        if b.origin == 'seed'
        and (b.conviction or {}).get('horizon') != 'transient'
    ]
    learned = [b for b in active if b not in nature]
    seeds = nature
    if not seeds:
        return learned

    voiced = set()
    briefs = (
        session.query(Episode.brief)
        .filter(
            Episode.game_id == mind.game_id,
            Episode.character_id == mind.character_id,
            Episode.episode_idx > (since_idx or 0),
        )
        .all()
    )
    for (brief,) in briefs:
        for line in brief_lines(brief):
            lid = str((line or {}).get('id') or '')
            if lid.startswith('belief:'):
                voiced.add(lid.split(':', 1)[1])

    ranked = []
    for b in seeds:
        btags = set(b.tags or [])
        by_tag = sum(1 for m in memories if btags & set(m.tags or []))
        # Same rule as the Lens: a tagged seed touches by tag only.
        by_word = 0 if btags else sum(
            1 for m in memories if _touches([], b.desc, [], m.desc)
        )
        is_voiced = b.id in voiced
        if is_voiced or by_tag or by_word:
            ranked.append(
                ((is_voiced, by_tag, by_word,
                  (b.conviction or {}).get('strength') or 0.0), b)
            )
    ranked.sort(key=lambda r: r[0], reverse=True)
    cap = int(w.get('reflection_seed_cap', 25))
    return learned + [b for _, b in ranked[:cap]]


def _f(v, default):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


@step('Reflection')
def maybe_reflect(session, mind, episode, character_name=None):
    """Run one reflection if the trigger fires. Returns a summary dict or
    None when no trigger. Never raises on LLM failure — a skipped
    reflection is a valid outcome."""
    w = {**DEFAULT_WIRING, **(mind.wiring or {})}
    # B10: degraded minds never reflect — the LLM is a protagonist cost.
    if w.get('degraded'):
        return {'reflected': False, 'reason': 'degraded_mind'}
    idx = episode_index(episode)
    counters = dict(mind.counters or {})
    last = counters.get('last_reflection_episode') or 0
    # Only the WORLD can spike a reflection: needs and recurrence items
    # are the mind's own bookkeeping, and an open need at full urgency
    # must not mint a daily LLM call — 'still hungry' is not news.
    high_salience = any(
        (i.get('salience') or 0.0) >= w.get('reflection_importance_min', 0.85)
        and not is_mind_item(i)
        for i in (episode.perceived_day or [])
    )
    every = int(w.get('reflection_every', 5))
    # reflectiveness bends the cadence: 0 — only the world can spike a
    # reflection; 1 — the mind gathers its thoughts almost daily.
    refl = _f((mind.personality or {}).get('reflectiveness'), 0.5)
    cadence = max(1, int(every * (1 - refl) + 0.5)) if refl > 0 else None
    due = idx is not None and cadence is not None and idx - last >= cadence
    if idx is None or not (due or high_salience):
        return None

    # autoflush is off project-wide: this episode's memories were encoded
    # moments ago and only exist in the session until flushed.
    session.flush()
    # Evidence gate (C7): a belief needs lived weight — three days of
    # drizzle is weather, not conviction. Only memories that mattered
    # (importance) or *felt* like something (|valence|) reach the prompt;
    # ambient bookkeeping never becomes worldview.
    imp_min = w.get('belief_evidence_importance_min', 0.4)
    val_min = w.get('belief_evidence_valence_min', 0.2)
    top = int(w.get('reflection_memory_top', 20))
    candidates = (
        session.query(Memory)
        .filter_by(character_id=mind.character_id)
        .filter(or_(
            Memory.importance >= imp_min,
            Memory.valence >= val_min,
            Memory.valence <= -val_min,
        ))
        .order_by(Memory.importance.desc())
        .limit(top * 2)
        .all()
    )
    # Need memories sit at importance 1.0 but are body-state, not
    # worldview — 'I need shelter' as a conviction would just re-say
    # the need. Reflection reflects on what the world did.
    memories = [
        m for m in candidates
        if not any(t.startswith('need:') for t in (m.tags or []))
    ][:top]
    if not memories:
        counters['last_reflection_episode'] = idx
        mind.counters = counters
        return {'reflected': False, 'reason': 'no_strong_evidence'}
    beliefs = reflection_beliefs(session, mind, memories, last, w)

    # A need-derived cause is the body's own voice — never offered to the
    # reflection for rewording (nor does AI prose ever mask it).
    cause = (mind.mood or {}).get('cause')
    if cause and cause.get('need'):
        cause = None
    prompt = _build_prompt(
        character_name or mind.character_id, memories, beliefs,
        cause=cause,
    )
    try:
        result = generate_narrative(prompt, day_number=idx)
        payload = _parse_payload(result.get('text'))
        ops = _valid_ops(
            [o for o in (payload.get('reflections') or [])
             if isinstance(o, dict)],
            {m.id for m in memories},
            {b.id for b in beliefs},
        )
    except Exception as exc:  # noqa: BLE001 — reflection is optional
        log.warning('reflection LLM failed: %s', exc)
        counters['last_reflection_episode'] = idx
        mind.counters = counters
        return {'reflected': False, 'reason': 'llm_unavailable'}

    beliefs_by_id = {b.id: b for b in beliefs}
    memories_by_id = {m.id: m for m in memories}
    counts = _apply_ops(
        session, mind, ops, beliefs_by_id, memories_by_id, idx, w
    )
    # AI wording for the carried cause — bound to the cause object it
    # describes: the next deterministic cause rebuilds the dict and the
    # prose dies with it; the mood's physics never waits on the LLM.
    mood_prose = str(payload.get('mood_prose') or '').strip()[:500]
    if mood_prose and cause is not None:
        mind.mood = {
            **mind.mood,
            'cause': {**mind.mood['cause'], 'prose': mood_prose},
        }
        counts['mood_reworded'] = True
    counters['last_reflection_episode'] = idx
    mind.counters = counters
    return {'reflected': True, **counts}
