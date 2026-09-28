# ============================================================================
# Composite rules (B9) — multi-day compound states as editable data
# ----------------------------------------------------------------------------
# A rule: if ANY condition group matches an event (of `event_type`, when
# set) on N consecutive episodes, the matching Need opens. conditions is
# an OR-of-ANDs: [[{field, op, value}, ...], ...] — a group matches when
# every clause holds on the same event's data.
#
#   snowbound = temperature_2m <= 1 AND precipitation > 0, 2 days:
#     conditions=[[{temperature_2m <= 1}, {precipitation > 0}]]
#     streak_days=2
#
#   exposure (the B2 detector, now declarative):
#     conditions=[[precip >= 0.4], [temp <= 1.0], [wind >= 25]]
#     streak_days=None -> wiring 'need_weather_streak'
#
# DB rows merge over DEFAULT_RULES by key — a game row replaces the
# built-in entirely. Streak counters live in brain.counters under
# 'rule:<key>', bumped at close (episodes the host persisted).
# ============================================================================
import operator

from app.mind.checks import _num
from app.mind.provisioning import DEFAULT_WIRING
from app.mind.tables import CompositeRule

RULE_COUNTER_PREFIX = 'rule:'

DEFAULT_RULES = [
    {
        'key': 'exposure',
        'need_type': 'physiological',
        'event_type': 'climate',
        'streak_days': None,          # falls back to need_weather_streak
        'urgency_base': 0.3,
        'urgency_per_day': 0.15,
        'conditions': [
            [{'field': 'precipitation', 'op': '>=', 'value': 0.4}],
            [{'field': 'temperature_2m', 'op': '<=', 'value': 1.0}],
            [{'field': 'wind_speed_10m', 'op': '>=', 'value': 25}],
        ],
        'description': None,          # falls back to 'mind.need.<key>'
    },
]

_OPS = {
    '>=': operator.ge, '<=': operator.le,
    '>': operator.gt, '<': operator.lt,
    '==': operator.eq, '!=': operator.ne,
}


def _row_to_rule(row):
    return {
        'key': row.key,
        'need_type': row.need_type or 'physiological',
        'event_type': row.event_type,
        'streak_days': row.streak_days,
        'urgency_base': row.urgency_base if row.urgency_base is not None else 0.3,
        'urgency_per_day': (
            row.urgency_per_day if row.urgency_per_day is not None else 0.15
        ),
        'conditions': row.conditions or [],
        'description': row.description,
    }


def active_rules(session, game_id):
    """Defaults + game rows, merged by key (a DB row replaces its
    built-in). Rows with malformed conditions are ignored — a bad rule
    must never break a day."""
    rules = {r['key']: dict(r) for r in DEFAULT_RULES}
    if session is not None:
        try:
            for row in (
                session.query(CompositeRule).filter_by(game_id=game_id)
            ):
                rules[row.key] = _row_to_rule(row)
        except Exception:  # noqa: BLE001 — mind must degrade, not fail
            pass
    return [
        r for r in rules.values()
        if isinstance(r.get('conditions'), list) and r['conditions']
    ]


def _clause(clause, data):
    if not isinstance(clause, dict):
        return False
    op = _OPS.get(clause.get('op'))
    if op is None:
        return False
    actual = data.get(clause.get('field'))
    expected = clause.get('value')
    if actual is None or expected is None:
        return False
    an, en = _num(actual), _num(expected)
    if an is not None and en is not None:
        return bool(op(an, en))
    # Mixed/non-numeric operands: only equality is meaningful.
    if op in (operator.eq, operator.ne):
        return op(str(actual), str(expected))
    return False


def rule_fired_today(rule, events):
    """Any event (of the rule's type, when set) satisfying ANY group —
    every clause in the group on the same event."""
    for event in events or []:
        if rule.get('event_type') and event.get('type') != rule['event_type']:
            continue
        data = event.get('data') or {}
        for group in rule['conditions']:
            if isinstance(group, list) and group and all(
                _clause(c, data) for c in group
            ):
                return True
    return False


def update_rule_streaks(session, brain, episode):
    """Close-time bookkeeping: per-rule streaks only count episodes the
    host actually persisted."""
    counters = dict(brain.counters or {})
    for rule in active_rules(session, episode.game_id):
        key = f"{RULE_COUNTER_PREFIX}{rule['key']}"
        if rule_fired_today(rule, episode.events):
            counters[key] = (counters.get(key) or 0) + 1
        else:
            counters[key] = 0
    brain.counters = counters


def rule_needs(session, brain, episode, w=None):
    """Open-time pass: rules whose streak (persisted + today) reaches the
    threshold produce a need spec for needs_pass to upsert."""
    w = w or {**DEFAULT_WIRING, **(brain.wiring or {})}
    counters = brain.counters or {}
    fired = []
    for rule in active_rules(session, episode.game_id):
        streak = counters.get(f"{RULE_COUNTER_PREFIX}{rule['key']}") or 0
        if rule_fired_today(rule, episode.events):
            streak += 1
        required = rule.get('streak_days') or w.get('need_weather_streak', 3)
        if streak < required:
            continue
        urgency = min(
            1.0,
            (rule.get('urgency_base') or 0.3)
            + (rule.get('urgency_per_day') or 0.15) * streak,
        )
        fired.append({
            'key': rule['key'],
            'type': rule.get('need_type') or 'physiological',
            'urgency': urgency,
            'desc': rule.get('description'),
            'source': {'rule': rule['key'], 'streak': streak},
        })
    return fired
