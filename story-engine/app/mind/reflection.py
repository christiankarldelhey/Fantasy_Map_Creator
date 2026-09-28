# ============================================================================
# Reflection (B4) — the mind's only LLM call
# ----------------------------------------------------------------------------
# Triggered at close-episode: every `reflection_every` episodes, or any
# perceived event whose salience clears `reflection_importance_min`.
#
# The LLM sees the character's strongest memories and active beliefs and
# returns OPERATIONS, not prose: create / reinforce / contradict / invert.
# The anti-hallucination rule is hard: every op must cite real memory ids
# in `evidence` — ops without valid evidence are dropped before touching
# the DB. Reconciliation is applied here deterministically (deltas,
# weakened/inverted status, cap on active beliefs, decay of the
# unreinforced). If the LLM is down or talks nonsense, reflection is
# skipped: the close must never fail on it.
# ============================================================================
import json
import logging
import re

from app.ai import generate_narrative
from app.mind.boosts import clean_boosts
from app.mind.memory import episode_index
from app.mind.provisioning import DEFAULT_WIRING
from app.mind.tables import Belief, Memory

log = logging.getLogger(__name__)

_SYSTEM = """\
You are the reflective faculty of a fictional character's mind. Given the
memories that marked them and the beliefs they already hold, decide how
those beliefs should change. Answer with ONLY a JSON object — no prose,
no fences:

{"reflections": [
  {"op": "create",     "kind": "world|self|other", "statement": "...",
   "confidence": 0.0-1.0, "evidence": ["mem_id", ...]},
  {"op": "reinforce",  "belief_id": "bl_...", "evidence": ["mem_id", ...]},
  {"op": "contradict", "belief_id": "bl_...", "evidence": ["mem_id", ...]},
  {"op": "invert",     "belief_id": "bl_...", "statement": "the inverted
   belief", "confidence": 0.0-1.0, "evidence": ["mem_id", ...]}
]}

Rules:
- Every operation MUST cite memory ids in "evidence" — no belief without
  lived evidence.
- Only "invert" when a belief has been denied repeatedly; the new
  "statement" is the grown belief (opposite sign).
- Keep statements first-person and concrete; never mention ids, episodes
  or the word "memory".
- If nothing warrants a change, return {"reflections": []}.
"""

_JSON_RE = re.compile(r'\{.*\}', re.S)


def _parse_ops(text):
    if not text:
        return []
    match = _JSON_RE.search(text)
    if not match:
        return []
    try:
        payload = json.loads(match.group(0))
    except (ValueError, TypeError):
        return []
    ops = payload.get('reflections') if isinstance(payload, dict) else None
    return [op for op in ops or [] if isinstance(op, dict)]


def _build_prompt(character_name, memories, beliefs):
    mem_lines = '\n'.join(
        f'- id={m.id} valence={m.valence:+.2f} importance={m.importance:.2f}'
        f' — {m.desc}'
        for m in memories
    )
    belief_lines = '\n'.join(
        f'- id={b.id} kind={b.kind} confidence={b.confidence:.2f}'
        f' — {b.statement}'
        for b in beliefs
    ) or '- (none yet)'
    return {
        'system': _SYSTEM,
        'user': (
            f'The mind of {character_name}.\n\n'
            f'What they lived (memories):\n{mem_lines}\n\n'
            f'What they believe (beliefs):\n{belief_lines}\n\n'
            'Reflect. Which beliefs form, strengthen, weaken or turn?'
        ),
    }


def _valid_ops(ops, memory_ids, belief_ids):
    """Anti-hallucination gate: ops cite real memories and real beliefs or
    they never happened."""
    valid = []
    for op in ops:
        evidence = [e for e in (op.get('evidence') or []) if e in memory_ids]
        if not evidence:
            continue
        op['evidence'] = evidence
        op['boosts'] = clean_boosts(op.get('boosts'))
        name = op.get('op')
        if name == 'create':
            if op.get('kind') in ('world', 'self', 'other') and op.get('statement'):
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


def _apply_ops(session, brain, ops, beliefs_by_id, idx, w):
    counts = {'formed': 0, 'reinforced': 0, 'contradicted': 0, 'inverted': 0}
    reinforce = w.get('belief_reinforce_delta', 0.1)
    contradict = w.get('belief_contradict_delta', 0.15)
    weaken_below = w.get('belief_weaken_below', 0.3)
    trauma_min = w.get('belief_trauma_min', 0.9)
    touched = set()

    for op in ops:
        name = op['op']
        if name == 'create':
            session.add(Belief(
                game_id=brain.game_id, character_id=brain.character_id,
                kind=op['kind'], statement=str(op['statement'])[:2000],
                confidence=min(1.0, max(0.0, _f(op.get('confidence'), 0.5))),
                tags=[], boosts=op['boosts'],
                evidence=op['evidence'], origin='reflected',
                status='active', formed_episode=idx, updated_episode=idx,
            ))
            counts['formed'] += 1
            continue

        belief = beliefs_by_id.get(op['belief_id'])
        if belief is None:
            continue
        touched.add(belief.id)
        if name == 'reinforce':
            belief.confidence = min(1.0, (belief.confidence or 0) + reinforce)
            belief.evidence = list(
                dict.fromkeys((belief.evidence or []) + op['evidence'])
            )
            belief.updated_episode = idx
            # Trauma: a negative belief reinforced past the trauma floor
            # hardens into something that stops fading on its own.
            if belief.confidence >= trauma_min and _mean_evidence_valence(
                session, belief.evidence
            ) < 0:
                belief.tags = list(set((belief.tags or []) + ['trauma']))
            counts['reinforced'] += 1
        elif name == 'contradict':
            belief.confidence = (belief.confidence or 0) - contradict
            belief.evidence = list(
                dict.fromkeys((belief.evidence or []) + op['evidence'])
            )
            belief.updated_episode = idx
            if belief.confidence < weaken_below:
                belief.status = 'weakened'
            counts['contradicted'] += 1
        elif name == 'invert':
            # Growth: the old conviction turns. The row is marked inverted
            # and the new opposite belief is born from the same evidence.
            belief.status = 'inverted'
            belief.updated_episode = idx
            session.add(Belief(
                game_id=brain.game_id, character_id=brain.character_id,
                kind=belief.kind, statement=str(op['statement'])[:2000],
                confidence=min(1.0, max(0.0, _f(op.get('confidence'), 0.5))),
                tags=[], boosts=op['boosts'],
                evidence=op['evidence'], origin='reflected',
                status='active', formed_episode=idx, updated_episode=idx,
            ))
            counts['inverted'] += 1

    # Confidence decays on beliefs this reflection ignored; below the floor
    # they go quiet (status='weakened', still listed, not loud).
    decay = w.get('belief_confidence_decay', 0.95)
    for belief in beliefs_by_id.values():
        if belief.id in touched or belief.status != 'active':
            continue
        belief.confidence = (belief.confidence or 0) * decay
        belief.updated_episode = idx
        if belief.confidence < weaken_below:
            belief.status = 'weakened'

    # Cap: too many loud beliefs and the weakest go quiet. Flush first —
    # beliefs created just above are session-only until flushed.
    cap = int(w.get('belief_cap', 12))
    session.flush()
    active = (
        session.query(Belief)
        .filter_by(character_id=brain.character_id, status='active')
        .order_by(Belief.confidence.desc())
        .all()
    )
    for belief in active[cap:]:
        belief.status = 'weakened'
        counts['weakened'] = counts.get('weakened', 0) + 1
    return counts


def _f(v, default):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def maybe_reflect(session, brain, episode, character_name=None):
    """Run one reflection if the trigger fires. Returns a summary dict or
    None when no trigger. Never raises on LLM failure — a skipped
    reflection is a valid outcome."""
    w = {**DEFAULT_WIRING, **(brain.wiring or {})}
    # B10: degraded brains never reflect — the LLM is a protagonist cost.
    if w.get('degraded'):
        return {'reflected': False, 'reason': 'degraded_brain'}
    idx = episode_index(episode)
    counters = dict(brain.counters or {})
    last = counters.get('last_reflection_episode') or 0
    high_salience = any(
        (i.get('salience') or 0.0) >= w.get('reflection_importance_min', 0.85)
        for i in (episode.perceived_day or [])
    )
    every = int(w.get('reflection_every', 5))
    if idx is None or (idx - last < every and not high_salience):
        return None

    # autoflush is off project-wide: this episode's memories were encoded
    # moments ago and only exist in the session until flushed.
    session.flush()
    memories = (
        session.query(Memory)
        .filter_by(character_id=brain.character_id)
        .order_by(Memory.importance.desc())
        .limit(int(w.get('reflection_memory_top', 20)))
        .all()
    )
    beliefs = (
        session.query(Belief)
        .filter_by(character_id=brain.character_id, status='active')
        .all()
    )
    if not memories:
        return None

    prompt = _build_prompt(
        character_name or brain.character_id, memories, beliefs
    )
    try:
        result = generate_narrative(prompt, day_number=idx)
        ops = _valid_ops(
            _parse_ops(result.get('text')),
            {m.id for m in memories},
            {b.id for b in beliefs},
        )
    except Exception as exc:  # noqa: BLE001 — reflection is optional
        log.warning('reflection LLM failed: %s', exc)
        counters['last_reflection_episode'] = idx
        brain.counters = counters
        return {'reflected': False, 'reason': 'llm_unavailable'}

    beliefs_by_id = {b.id: b for b in beliefs}
    counts = _apply_ops(session, brain, ops, beliefs_by_id, idx, w)
    counters['last_reflection_episode'] = idx
    brain.counters = counters
    return {'reflected': True, **counts}
