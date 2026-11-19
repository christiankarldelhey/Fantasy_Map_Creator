# ============================================================================
# Choosing (ADR-0019) — the Mind prefers among feasible Interactions
# ----------------------------------------------------------------------------
# The host resolves a Situation, filters what is *feasible* (skill gates,
# what can be paid), then asks here BEFORE the episode opens:
#
#   POST /mind/minds/{character_id}/choose
#   {"choices": [{"situation_id": "cnt:...:sit",
#                 "subject": "npc:hallas",
#                 "options": [{"interaction_id": "cnt:...:sit:stay",
#                              "act": "rest",
#                              "need_tags": ["need:exhaustion"],
#                              "p_success": 0.8}]}]}
#
# Each option is scored from what the Mind owns — open Needs, the Relation
# with the concrete Subject, Relation-driven attention — and one is drawn
# weighted by
# a softmax whose temperature is a Personality coupling
# (`personality.choice_variability`): the trait is deliberately unnamed,
# the knob readable and editable as-is in the minds row. A higher-self
# player will one day pick from this same feasible pool; the scoring stays.
# ============================================================================
import math
import random

from app.mind.relations import attention_weights
from app.mind.tables import Need, Relation

# Acts that reach *toward* the source — a warm Relation invites them, a cold
# one warns them off. Acts that withdraw lean on fear instead.
TOWARD_ACTS = {'approach', 'talk', 'trade', 'accept', 'help'}
AWAY_ACTS = {'avoid', 'defy'}

TOWARD_WEIGHT = 1.0     # per point of (affection + trust)
AWAY_FEAR_WEIGHT = 1.5  # per point of fear
AWAY_COLD_WEIGHT = 0.5  # per point of distaste (negative affection/trust)

# choice_variability 0 → nearly argmax; 1 → near-uniform draw.
MIN_TEMPERATURE = 0.15
MAX_TEMPERATURE = 2.0
DEFAULT_VARIABILITY = 0.5


def _act_relation_bias(act, relation):
    """How this Relation colours an Act: warmth pulls toward, coldness and
    fear push away. No Relation → no bias."""
    if relation is None:
        return 0.0
    warmth = float(relation.affection or 0) + float(relation.trust or 0)
    fear = float(relation.fear or 0)
    if act in TOWARD_ACTS:
        return warmth * TOWARD_WEIGHT - fear * 0.5
    if act in AWAY_ACTS:
        return fear * AWAY_FEAR_WEIGHT + max(0.0, -warmth) * AWAY_COLD_WEIGHT
    return 0.0


def _temperature(mind):
    raw = DEFAULT_VARIABILITY
    if mind is not None:
        raw = (mind.personality or {}).get('choice_variability', DEFAULT_VARIABILITY)
    try:
        v = min(1.0, max(0.0, float(raw)))
    except (TypeError, ValueError):
        v = DEFAULT_VARIABILITY
    return MIN_TEMPERATURE + (MAX_TEMPERATURE - MIN_TEMPERATURE) * v


def _score_option(option, needs_urgency, relation, attention):
    """Deterministic preference for one feasible option. Returns (score,
    parts) — parts rides the response so the pick is explainable."""
    tags = list(option.get('need_tags') or [])
    need_score = sum(
        float(needs_urgency.get(t[5:], 0.0))
        for t in tags if t.startswith('need:')
    )
    attention_score = sum(
        float(attention.get(t) or 0.0)
        for t in tags if not t.startswith('need:')
    )
    relation_score = (
        _act_relation_bias(option.get('act'), relation)
        if relation is not None and option.get('act') else 0.0
    )
    score = need_score + attention_score + relation_score
    p = option.get('p_success')
    if isinstance(p, (int, float)) and score > 0:
        score *= min(1.0, max(0.0, float(p)))
    return score, {
        'need': round(need_score, 3),
        'attention': round(attention_score, 3),
        'relation': round(relation_score, 3),
        'p_success': p,
    }


def _softmax_weights(scored, temperature):
    """Normalized exp(score/T) over scored options — the whole draw, not
    just the winner. Scores shift so exp() can't overflow."""
    top = max(s for _, s, _ in scored)
    raw = [math.exp((s - top) / temperature) for _, s, _ in scored]
    total = sum(raw)
    return [w / total for w in raw]


def _weighted_draw(scored, weights, rng):
    """Draw an index into `scored` proportional to `weights`."""
    roll = rng.random() * sum(weights)
    for i, w in enumerate(weights):
        roll -= w
        if roll <= 0:
            return i
    return len(scored) - 1


def choose(session, mind, game_id, character_id, choices, rng=None):
    """Pick one Interaction per Situation. `choices` is the wire list:
    [{situation_id, subject, options:[{interaction_id, act, need_tags,
    p_success?}]}]. Returns [{situation_id, interaction_id, score, parts,
    weights}] — weights show the whole draw, not just the winner."""
    rng = rng or random.Random()

    needs_urgency = {
        n.key: float(n.urgency or 0.0)
        for n in session.query(Need)
        .filter_by(game_id=game_id, character_id=character_id, status='open')
        .all()
    }
    subjects = [c.get('subject') for c in choices if c.get('subject')]
    relations = {}
    if subjects:
        relations = {
            r.subject: r for r in session.query(Relation)
            .filter_by(game_id=game_id, character_id=character_id)
            .filter(Relation.subject.in_(subjects))
            .all()
        }
    attention = attention_weights(session, mind) if mind else {}
    temperature = _temperature(mind)

    results = []
    for choice in choices or []:
        options = choice.get('options') or []
        if not options:
            results.append({
                'situation_id': choice.get('situation_id'),
                'interaction_id': None,
                'reason': 'no feasible options',
            })
            continue
        scored = [
            (opt, *_score_option(opt, needs_urgency,
                                 relations.get(choice.get('subject')),
                                 attention))
            for opt in options
        ]
        weights = _softmax_weights(scored, temperature)
        idx = _weighted_draw(scored, weights, rng)
        opt, score, parts = scored[idx]
        results.append({
            'situation_id': choice.get('situation_id'),
            'interaction_id': opt.get('interaction_id'),
            'score': round(score, 3),
            'parts': parts,
            'weights': [
                {'interaction_id': o.get('interaction_id'), 'weight': round(w, 4)}
                for (o, _, _), w in zip(scored, weights)
            ],
        })
    return {'temperature': round(temperature, 3), 'choices': results}
