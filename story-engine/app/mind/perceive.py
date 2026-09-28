# ============================================================================
# Perception — events[] -> perceived_day
# ----------------------------------------------------------------------------
# Every event is annotated with a NL `reading`, derived `tags`, and a
# `salience` (importance) weighted by the brain's wiring — two minds can
# notice the same world differently. Events carrying `data.check` are
# gated and rolled (B1, app/mind/checks.py): the outcome bends perception
# to `unnoticed`/`misread`, never the world's facts.
#
# Tag convention (shared with theme_weights keys):
#   type:<event.type>        — every event
#   tag:<data[key]>          — for each scalar/string data value
#   tag:<data[key]>:<sub>    — nested list values (e.g. data.tags)
#   entity:<id>              — data.entity or data.entity_id
#   region:<name>            — where.region
# Weight keys may wildcard: 'tag:weather:*' matches 'tag:weather:rain'.
# ============================================================================
from app.mind.boosts import effective_theme_weights
from app.mind.checks import (
    character_state,
    misread_reading,
    resolve_check,
)
from app.mind.nl_resolver import resolve_event_reading
from app.mind.nl_resolver import threshold as nl_threshold
from app.mind.provisioning import DEFAULT_WIRING
from app.mind.tables import Episode

# data fields that count as explicit severity when numeric (0-1 normalized).
SEVERITY_FIELDS = (
    'severity', 'danger', 'threat', 'damage', 'wound',
    'pain', 'hostility', 'risk', 'lethality',
)

EPISODE_LOOKBACK = 20


def _num(v):
    return v if isinstance(v, (int, float)) and not isinstance(v, bool) else None


def derive_tags(event):
    """Weight-space tags for an event (see module docstring convention)."""
    tags = [f"type:{event.get('type')}"]
    data = event.get('data') or {}
    entity = data.get('entity') or data.get('entity_id')
    if entity:
        tags.append(f'entity:{entity}')
    for key, value in data.items():
        # Check/needs machinery is signal, not content — it never tags.
        if key in ('entity', 'entity_id', 'check', 'thread_desc',
                   'resolves', 'urgency'):
            continue
        if key == 'tags':
            values = value if isinstance(value, list) else [value]
            tags.extend(f'tag:{v}' for v in values if isinstance(v, str) and v)
        elif isinstance(value, str) and value:
            tags.append(f'tag:{key}:{value}')
    region = (event.get('where') or {}).get('region')
    if region:
        tags.append(f'region:{region}')
    return tags


def theme_weight(tags, weights):
    """Max matching weight across the event's tags; wildcards 'prefix:*'
    match any tag with that prefix. 0 = this mind is indifferent."""
    best = 0.0
    for tag in tags:
        if tag in weights:
            best = max(best, weights[tag])
    for key, weight in (weights or {}).items():
        if key.endswith(':*') and any(t.startswith(key[:-1]) for t in tags):
            best = max(best, weight)
    return best


def _semantic_tags(session, game_id, event, brain=None):
    """Threshold-derived tags for numeric domains — climate data carries no
    strings, so without these it could never feed theme weights or pattern
    detection ('tag:weather:freezing' day after day...)."""
    if event.get('type') != 'climate':
        return []
    data = event.get('data') or {}
    tags = []
    temp = _num(data.get('temperature_2m'))
    if temp is not None and temp <= nl_threshold(
        session, game_id, 'climate.snow_temp_max', 1.0, brain=brain
    ):
        tags.append('tag:weather:freezing')
    prec = _num(data.get('precipitation'))
    if prec is not None and prec >= nl_threshold(
        session, game_id, 'climate.wet_precipitation_min', 0.2, brain=brain
    ):
        tags.append('tag:weather:wet')
    wind = _num(data.get('wind_speed_10m'))
    if wind is not None and wind >= nl_threshold(
        session, game_id, 'climate.windy_speed_min', 18, brain=brain
    ):
        tags.append('tag:weather:windy')
    return tags


def _severity(data):
    """0-1: explicit data['severity'] or the max severity-ish field."""
    vals = [_num(data.get(f)) for f in SEVERITY_FIELDS]
    vals = [v for v in vals if v is not None]
    return min(1.0, max(vals)) if vals else 0.0


def _emotional_charge(data):
    v = _num(data.get('emotional_charge'))
    if v is not None:
        return min(1.0, abs(v))
    v = _num(data.get('valence'))
    return min(1.0, abs(v)) if v is not None else 0.0


def _seen_tags(session, game_id, character_id):
    """Tags this mind has already perceived — the novelty baseline until the
    memory table exists (A7)."""
    recent = (
        session.query(Episode.perceived_day)
        .filter_by(game_id=game_id, character_id=character_id)
        .order_by(Episode.created_at.desc())
        .limit(EPISODE_LOOKBACK)
        .all()
    )
    seen = set()
    for (perceived_day,) in recent:
        for item in perceived_day or []:
            seen.update(item.get('tags') or [])
            if item.get('type'):
                seen.add(f"type:{item['type']}")
    return seen


def perceive_events(session, game_id, brain, events, character=None):
    """Annotate each event: perception + reading + salience + tags.

    Returns plain dicts ready for `episodes.perceived_day`. Idempotent at the
    episode level because open() only calls this when creating the episode.
    """
    seen = _seen_tags(session, game_id, brain.character_id)
    # B6: strong active beliefs bend what stands out — boosts add to the
    # cloned theme_weights for this perception pass only.
    weights = effective_theme_weights(session, brain)
    w = {**DEFAULT_WIRING, **(brain.wiring or {})}
    state = character_state(character, events)

    perceived = []
    for index, event in enumerate(events or []):
        tags = derive_tags(event) + _semantic_tags(
            session, game_id, event, brain=brain
        )
        new_tags = [t for t in tags if t not in seen]
        novelty = len(new_tags) / len(tags) if tags else 0.0
        data = event.get('data') or {}

        check_result, perception = resolve_check(
            session, game_id, character, event, index, state, w,
            brain=brain,
        )
        reading = resolve_event_reading(session, game_id, event,
                                        brain=brain)
        if perception == 'misread':
            reading = misread_reading(
                session, game_id, event, reading, check_result,
                brain=brain,
            )
        elif perception == 'unnoticed':
            reading = None

        # A hard roll won sharpens the impression; the host's explicit
        # perception_bonus takes precedence when present.
        bonus = _num(data.get('perception_bonus'))
        if bonus is None and check_result and check_result.get('success'):
            bonus = min(
                1.0,
                check_result['difficulty']
                / w.get('check_difficulty_scale', 10.0),
            )
        salience = min(1.0, (
            w.get('w_severity', 0) * _severity(data)
            + w.get('w_novelty', 0) * novelty
            + w.get('w_emotional', 0) * _emotional_charge(data)
            + w.get('w_theme', 0) * theme_weight(tags, weights)
            + w.get('w_perception', 0) * (bonus or 0.0)
        ))
        if perception == 'unnoticed':
            salience *= w.get('unnoticed_salience', 0.5)

        item = {
            **event,
            'perception': perception,
            'reading': reading,
            'salience': round(salience, 3),
            'valence': _num(data.get('valence')) or 0.0,
            'severity': round(_severity(data), 3),
            'tags': tags,
            'evoked': [],
        }
        if check_result:
            check_result['perception'] = perception
            item['check'] = check_result
        perceived.append(item)
        seen.update(tags)
    return perceived
