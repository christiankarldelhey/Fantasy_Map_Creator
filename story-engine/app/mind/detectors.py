# ============================================================================
# Detectors — declared rules that read the Condition (ADR 0005)
# ----------------------------------------------------------------------------
# The mind knows no snapshot field the host did not declare. Each Detector
# row names a field of the flattened Condition map (character_state), an
# operator and a threshold; what firing means depends on `kind`:
#
#   'need'      — a physiological need opens/refreshes; urgency grows with
#                 the underlying value (or a declared severity map).
#   'check_mod' — adds a modifier to perception checks while firing; rules
#                 sharing a group_key are an elif chain (first match wins,
#                 lowest ordinal first), so tiers like spent/worn can't
#                 stack.
#   'altered'   — while firing the mind is 'altered': noticed readings can
#                 be misread (checks.misread_reading).
#
# DEFAULT_DETECTORS is the built-in pack — same role as rules.DEFAULT_RULES
# and nl_defaults: an unseeded game gets it, rows override per (game, key),
# and a row with enabled=False silences a built-in for that game.
#
# Per-brain knobs: wiring keys 'detector.<key>.<param>' override value/mod/
# urgency_base/urgency_per/urgency_map/scale for that brain. Legacy wiring
# keys (need_hunger_days, mod_energy_spent, ...) still read so brains
# authored before ADR 0005 keep their tuning.
# ============================================================================
import logging
import operator
import time

from app.mind.tables import Detector

log = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 30
_cache = {}

_OPS = {
    '>=': operator.ge,
    '<=': operator.le,
    '>': operator.gt,
    '<': operator.lt,
    '==': operator.eq,
    '!=': operator.ne,
}

# The built-in pack. Everything the engine used to read by name lives here
# as data now — a game replaces or silences any of it with its own rows.
DEFAULT_DETECTORS = [
    # -- needs ---------------------------------------------------------------
    {
        'key': 'hunger', 'kind': 'need',
        'field': 'days_without_food', 'op': '>=', 'value': 1.0,
        'urgency_base': 0.3, 'urgency_per': 0.2,
    },
    {
        'key': 'thirst', 'kind': 'need',
        'field': 'days_without_water', 'op': '>=', 'value': 1.0,
        'urgency_base': 0.5, 'urgency_per': 0.25,
    },
    {
        'key': 'exhaustion', 'kind': 'need',
        'field': 'energy', 'op': '<=', 'value': 0.4, 'scale': 100.0,
        'urgency_base': 0.5, 'urgency_per': 1.0, 'urgency_from': 'distance',
    },
    {
        'key': 'unrest', 'kind': 'need',
        'field': 'shadow', 'op': '>=', 'value': 0.25, 'scale': 100.0,
        'urgency_base': 0.3, 'urgency_per': 0.5,
    },
    {
        'key': 'wound', 'kind': 'need',
        'field': 'wounded', 'op': 'in', 'value': ['wounded', 'badly_wounded'],
        'urgency_map': {'wounded': 0.35, 'badly_wounded': 0.65},
    },
    # -- check modifiers ------------------------------------------------------
    {
        'key': 'energy_spent', 'kind': 'check_mod',
        'group_key': 'energy', 'ordinal': 0,
        'field': 'energy', 'op': '<', 'value': 0.35, 'scale': 100.0,
        'mod': -2.0,
    },
    {
        'key': 'energy_worn', 'kind': 'check_mod',
        'group_key': 'energy', 'ordinal': 1,
        'field': 'energy', 'op': '<', 'value': 0.6, 'scale': 100.0,
        'mod': -1.0,
    },
    {
        'key': 'shadow_burdened', 'kind': 'check_mod',
        'group_key': 'shadow', 'ordinal': 0,
        'field': 'shadow', 'op': '>=', 'value': 0.5, 'scale': 100.0,
        'mod': -2.0,
    },
    {
        'key': 'shadow_shadowed', 'kind': 'check_mod',
        'group_key': 'shadow', 'ordinal': 1,
        'field': 'shadow', 'op': '>=', 'value': 0.25, 'scale': 100.0,
        'mod': -1.0,
    },
    {
        'key': 'wounded', 'kind': 'check_mod',
        'group_key': 'wounded', 'ordinal': 0,
        'field': 'conditions', 'op': 'contains', 'value': 'wounded',
        'mod': -1.0,
    },
    # -- altered state ---------------------------------------------------------
    {
        'key': 'shadow_altered', 'kind': 'altered',
        'field': 'shadow', 'op': '>=', 'value': 0.25, 'scale': 100.0,
    },
]

# Wiring keys brains used before the values moved into detector rows.
_LEGACY_PARAMS = {
    ('hunger', 'value'): 'need_hunger_days',
    ('thirst', 'value'): 'need_thirst_days',
    ('exhaustion', 'value'): 'need_exhaustion_below',
    ('unrest', 'value'): 'need_unrest_shadow_min',
    ('energy_worn', 'value'): 'energy_worn_below',
    ('energy_spent', 'value'): 'energy_spent_below',
    ('energy_worn', 'mod'): 'mod_energy_worn',
    ('energy_spent', 'mod'): 'mod_energy_spent',
    ('shadow_shadowed', 'value'): 'shadow_shadowed_min',
    ('shadow_burdened', 'value'): 'shadow_burdened_min',
    ('shadow_shadowed', 'mod'): 'mod_shadow_shadowed',
    ('shadow_burdened', 'mod'): 'mod_shadow_burdened',
    ('wounded', 'mod'): 'mod_wounded',
    ('shadow_altered', 'value'): 'misread_shadow_min',
    ('wound', 'urgency_map.wounded'): 'need_wound_urgency',
    ('wound', 'urgency_map.badly_wounded'): 'need_badly_wound_urgency',
}

def _num(value):
    return (
        value
        if isinstance(value, (int, float)) and not isinstance(value, bool)
        else None
    )


def _rule_dict(row):
    return {
        'key': row.key, 'kind': row.kind, 'field': row.field, 'op': row.op,
        'value': row.value, 'scale': row.scale,
        'group_key': row.group_key, 'ordinal': row.ordinal,
        'mod': row.mod,
        'urgency_base': row.urgency_base, 'urgency_per': row.urgency_per,
        'urgency_from': row.urgency_from, 'urgency_map': row.urgency_map,
        'need_type': row.need_type, 'description': row.description,
        'enabled': row.enabled,
    }


def active_detectors(session, game_id):
    """Built-in pack + this game's declared rows, merged by (kind, key);
    a disabled row silences its default. Cached briefly like the NL pack —
    detectors are config, not hot data."""
    entry = _cache.get(game_id)
    if entry and time.monotonic() - entry['at'] < CACHE_TTL_SECONDS:
        return entry['rules']
    rules = {
        (d['kind'], d['key']): dict(d) for d in DEFAULT_DETECTORS
    }
    if session is not None:
        try:
            rows = (
                session.query(Detector).filter_by(game_id=game_id).all()
            )
            for row in rows:
                key = (row.kind, row.key)
                if not row.enabled:
                    rules.pop(key, None)
                else:
                    rules[key] = _rule_dict(row)
        except Exception as exc:  # DB down: run on the built-in pack
            log.warning('detectors load failed for %s: %s', game_id, exc)
    out = [d for d in rules.values() if d.get('enabled', True)]
    _cache[game_id] = {'at': time.monotonic(), 'rules': out}
    return out


def invalidate(game_id=None):
    """Drop cached detector packs — call after admin edits."""
    if game_id is None:
        _cache.clear()
    else:
        _cache.pop(game_id, None)


def _param(det, param, w, default=None):
    """Brain-level override first ('detector.<key>.<param>'), then the
    legacy wiring key, then the declared value."""
    v = (w or {}).get(f"detector.{det['key']}.{param}")
    if v is not None:
        return v
    legacy = _LEGACY_PARAMS.get((det['key'], param))
    if legacy and (w or {}).get(legacy) is not None:
        return w[legacy]
    return det.get(param, default)


def field_value(det, state, w=None):
    """The field's current value in the flattened Condition map.
    'conditions' is the synthesized set; a numeric field with a declared
    scale normalizes host units (energy may arrive 0-1 or 0-100)."""
    if det.get('field') == 'conditions':
        return state.get('conditions') or set()
    raw = state.get(det.get('field'))
    n = _num(raw)
    scale = _num(_param(det, 'scale', w))
    if n is not None and scale:
        return max(0.0, n / scale if n > 1 else n)
    return raw


def matches(det, state, w=None):
    """Does this rule fire on this Condition?"""
    if det.get('field') == 'conditions':
        haystack = state.get('conditions') or set()
        if det.get('op') != 'contains':
            return False
        return str(_param(det, 'value', w)).lower() in haystack
    actual = field_value(det, state, w)
    if actual is None:
        return False
    op = det.get('op')
    expected = _param(det, 'value', w)
    if op == 'in':
        return actual in (expected or [])
    if op == 'contains':
        return expected in (actual or [])
    fn = _OPS.get(op)
    if fn is None:
        return False
    an, en = _num(actual), _num(expected)
    if an is not None and en is not None:
        return bool(fn(an, en))
    if fn in (operator.eq, operator.ne):
        return fn(str(actual), str(expected))
    return False


def _urgency(det, actual, w):
    """Declared urgency: an explicit severity map ('wounded' -> 0.35), or
    base + per * value / * distance-to-threshold, capped at 1.0."""
    umap = _param(det, 'urgency_map', w)
    if umap:
        key = str(actual)
        override = (w or {}).get(
            f"detector.{det['key']}.urgency_map.{key}"
        )
        legacy = _LEGACY_PARAMS.get((det['key'], f'urgency_map.{key}'))
        if legacy and (w or {}).get(legacy) is not None:
            override = w[legacy]
        if override is not None:
            return min(1.0, _num(override) or 0.0)
        return min(1.0, _num(umap.get(key) or umap.get(actual)) or 0.0)
    base = _num(_param(det, 'urgency_base', w, 0.3)) or 0.0
    per = _num(_param(det, 'urgency_per', w, 0.0)) or 0.0
    n = _num(actual) or 0.0
    if det.get('urgency_from') == 'distance':
        threshold = _num(_param(det, 'value', w)) or 0.0
        dist = (
            threshold - n
            if det.get('op') in ('<=', '<')
            else n - threshold
        )
        return min(1.0, base + per * max(0.0, dist))
    return min(1.0, base + per * n)


def detector_needs(session, game_id, state, w=None):
    """Need-kind detectors firing on this Condition → need specs.
    'source' keeps the old shape: 'days' when the field counts days
    (need_origin phrases format {days}), plus a generic 'value'."""
    fired = []
    for det in active_detectors(session, game_id):
        if det.get('kind') != 'need' or not matches(det, state, w):
            continue
        actual = field_value(det, state, w)
        source = {
            'detector': det['key'],
            'field': det.get('field'),
            'value': actual,
        }
        if 'day' in (det.get('field') or ''):
            source['days'] = actual
        fired.append({
            'key': det['key'],
            'type': det.get('need_type') or 'physiological',
            'urgency': _urgency(det, actual, w),
            'desc': det.get('description') or None,
            'source': source,
        })
    return fired


def state_mods(session, game_id, state, w=None):
    """Check-mod detectors: first firing rule per group_key (lowest
    ordinal wins, so tiers don't stack), mods summed."""
    mods = 0.0
    groups = {}
    for det in active_detectors(session, game_id):
        if det.get('kind') != 'check_mod':
            continue
        groups.setdefault(det.get('group_key') or det['key'], []).append(det)
    for group in groups.values():
        for det in sorted(group, key=lambda d: d.get('ordinal') or 0):
            if matches(det, state, w):
                mods += _num(_param(det, 'mod', w, 0.0)) or 0.0
                break
    return mods


def altered_by_state(session, game_id, state, w=None):
    """Any 'altered' detector firing → the mind may misread."""
    return any(
        matches(det, state, w)
        for det in active_detectors(session, game_id)
        if det.get('kind') == 'altered'
    )
