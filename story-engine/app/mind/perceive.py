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
#   tag:<data[key]>          — string data values; absence markers
#                            ('none', 'null', '0', ...) never tag
#   tag:<data[key]>:<sub>    — nested list values (e.g. data.tags)
#   entity:<id>              — data.entity or data.entity_id
#   region:<name>            — where.region
# Weight keys may wildcard: 'tag:weather:*' matches 'tag:weather:rain'.
# ============================================================================
from app.mind.boosts import effective_theme_weights
from app.mind.checks import (
    asleep_check_result,
    character_state,
    is_asleep,
    misread_reading,
    resolve_check,
)
from app.mind.nl_resolver import phrases as nl_phrases
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


# Values that report an absence, not an observation — 'wounded: none' is
# signal for rules/needs, never content: it must not become
# tag:wounded:none, a memory, or a recurring theme.
EMPTY_MARKERS = frozenset({
    '', 'none', 'null', 'nil', 'n/a', 'na', 'unknown', '0', '0.0',
})


def _is_content(value):
    return isinstance(value, str) and value.strip().lower() not in EMPTY_MARKERS


def derive_tags(event):
    """Weight-space tags for an event (see module docstring convention)."""
    tags = [f"type:{event.get('type')}"]
    data = event.get('data') or {}
    entity = data.get('entity') or data.get('entity_id')
    if entity:
        tags.append(f'entity:{entity}')
    for key, value in data.items():
        # Check/needs machinery is signal, not content — it never tags.
        # Free prose (description, prose_hint) is words, not a tag space.
        # 'slot' already travels as when.phase — a 'midday again'
        # streak is bookkeeping noise, not a lived repetition.
        if key in ('entity', 'entity_id', 'entity_name', 'check',
                   'thread_desc', 'resolves', 'urgency',
                   'description', 'prose_hint', 'slot', 'substance'):
            continue
        if key == 'tags':
            values = value if isinstance(value, list) else [value]
            tags.extend(f'tag:{v}' for v in values if _is_content(v))
        elif _is_content(value):
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
    detection ('tag:weather:freezing' day after day...).

    Tiered (C6): the mild tiers mark ambience (wet/windy), the severe
    tiers mark *events* — storm, snow, deep cold, scorching heat. Those
    pair with 'severity.<tag>' wiring so a hard day of weather carries
    real salience while drizzle stays background."""
    if event.get('type') != 'climate':
        return []
    data = event.get('data') or {}
    tags = []
    temp = _num(data.get('temperature_2m'))
    prec = _num(data.get('precipitation'))
    wind = _num(data.get('wind_speed_10m'))

    # Severe tiers first — a snow day is also freezing; both tags apply.
    snow_max = nl_threshold(
        session, game_id, 'climate.snow_temp_max', 1.0, brain=brain
    )
    if (
        temp is not None and temp <= snow_max
        and prec is not None and prec >= nl_threshold(
            session, game_id, 'climate.wet_precipitation_min', 0.2,
            brain=brain,
        )
    ):
        tags.append('tag:weather:snow')
    if temp is not None and temp <= nl_threshold(
        session, game_id, 'climate.deep_cold_max', -10.0, brain=brain
    ):
        tags.append('tag:weather:deep_cold')
    if temp is not None and temp >= nl_threshold(
        session, game_id, 'climate.scorching_min', 32.0, brain=brain
    ):
        tags.append('tag:weather:scorching')
    if (wind is not None and wind >= nl_threshold(
            session, game_id, 'climate.storm_wind_min', 25, brain=brain
        )) or (prec is not None and prec >= nl_threshold(
            # precipitation arrives as a per-phase SUM — heavier floor
            # than the per-sample 'heavy_rain_min' key.
            session, game_id, 'climate.storm_precip_min', 8.0, brain=brain
        )):
        tags.append('tag:weather:storm')

    # Mild tiers — ambience, not events.
    if temp is not None and temp <= snow_max:
        tags.append('tag:weather:freezing')
    if prec is not None and prec >= nl_threshold(
        session, game_id, 'climate.wet_precipitation_min', 0.2, brain=brain
    ):
        tags.append('tag:weather:wet')
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


def _tag_severity(tags, w):
    """'severity.<tag>' wiring lets a tag carry a severity floor (C6):
    'severity.tag:weather:storm: 0.6' makes the storm an *event* in the
    salience arithmetic while drizzle stays ambient. Host-declared
    severity still wins via max."""
    best = 0.0
    for tag in tags:
        v = _num(w.get(f'severity.{tag}'))
        if v is not None and v > best:
            best = v
    for key, v in w.items():
        if not key.startswith('severity.') or not key.endswith(':*'):
            continue
        prefix = key[len('severity.'):-1]
        if any(t.startswith(prefix) for t in tags):
            num = _num(v)
            if num is not None and num > best:
                best = num
    return best


def _salience_floor(tags, w):
    """'salience_min.<tag>' wiring lets a perceived thing matter by what
    it IS, not how loud it arrived (C16): 'salience_min.tag:entity_type:
    humans: 0.35' means thinking company is never background to this
    mind, 'salience_min.tag:form:brief_exchange' that a real exchange
    outweighs the weather. Wildcards allowed ('salience_min.entity:*')."""
    best = 0.0
    for tag in tags:
        v = _num(w.get(f'salience_min.{tag}'))
        if v is not None and v > best:
            best = v
    for key, v in w.items():
        if not key.startswith('salience_min.') or not key.endswith(':*'):
            continue
        prefix = key[len('salience_min.'):-1]
        if any(t.startswith(prefix) for t in tags):
            num = _num(v)
            if num is not None and num > best:
                best = num
    return best


def _emotional_charge(data):
    v = _num(data.get('emotional_charge'))
    if v is not None:
        return min(1.0, abs(v))
    v = _num(data.get('valence'))
    return min(1.0, abs(v)) if v is not None else 0.0


def _affect(tags, data, w):
    """The signed valence (-1..1) this mind assigns to the event:
    'affect.<tag>' wiring keys fire when the tag is present (wildcards
    allowed) and 'affect.field:<name>' keys scale a numeric data field
    per unit. Two minds differ exactly here — the same confrontation is
    not the same wound to every character."""
    best = 0.0
    for tag in tags:
        v = _num(w.get(f'affect.{tag}'))
        if v is not None and abs(v) > abs(best):
            best = v
    for key, v in w.items():
        if not key.startswith('affect.') or not key.endswith(':*'):
            continue
        prefix = key[len('affect.'):-1]
        if any(t.startswith(prefix) for t in tags):
            num = _num(v)
            if num is not None and abs(num) > abs(best):
                best = num
    valence = best
    for key, gain in w.items():
        if not key.startswith('affect.field:'):
            continue
        num = _num(data.get(key[len('affect.field:'):]))
        g = _num(gain)
        if num is not None and g is not None:
            valence += g * num
    return valence


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


def _content_tags(day):
    """The day's content tags — noticed items only, and never the
    recurrence channel's own notes or the felt-body channel: the mind
    only repeats what it registered, and an open need is already its
    own pressure — 'hunger again' would say it twice."""
    tags = set()
    for it in day or []:
        if it.get('perception') == 'unnoticed':
            continue
        if it.get('type') in ('recurrence', 'need'):
            continue
        tags.update(
            t for t in (it.get('tags') or [])
            if not t.startswith('type:')
            # Sentinel values are absence, not content: 'wounded:none'
            # repeating is not a stretch, and breaking it must never
            # read 'no none today'.
            and not t.endswith(':none')
        )
    return tags


def _tag_subject(tag):
    return tag.rsplit(':', 1)[-1].replace('_', ' ').replace('-', ' ')


def _repetition_exempt(tag, exempt):
    """Base routine vs monotony: water every day is life, the same bread
    every day is the week closing in. Exempt entries are exact tags or
    'prefix:*' wildcards — the absence channel (thirst/hunger needs) is
    untouched: exempt presence, alarming absence."""
    for entry in exempt or ():
        if entry.endswith(':*'):
            if tag.startswith(entry[:-1]):
                return True
        elif tag == entry:
            return True
    return False


def _recurrence_items(session, game_id, brain, perceived, w):
    """Repetition pressure + pattern breaks (C5).

    Repetition is mildly aversive on its own — rain on day one is
    weather, rain on day three is the week closing in. A content tag
    perceived in >= repetition_min_streak consecutive episodes
    (including today) synthesizes a 'recurrence' item whose negative
    valence grows with the streak, feeding the episode mood through the
    ordinary salience-weighted mean.

    The break is the other half: a tag whose streak died today becomes
    a one-day piece of news ('the first dry day') — positive, salient,
    and encodable as a volatile memory that then fades like any other.
    """
    min_streak = int(w.get('repetition_min_streak', 3))
    growth = w.get('repetition_growth', 0.08)
    cap = w.get('repetition_valence_cap', 0.3)
    pressure_sal = w.get('repetition_salience', 0.3)
    relief_val = w.get('repetition_relief', 0.15)
    relief_sal = w.get('repetition_relief_salience', 0.45)
    exempt = w.get('repetition_exempt_tags') or ()

    # The episode being built right now is flushed with the column's
    # default [] — an empty tag set would cut every streak at zero, so
    # empty days (in-flight or genuinely eventless) don't join history.
    recent = (
        session.query(Episode.perceived_day)
        .filter_by(game_id=game_id, character_id=brain.character_id)
        .order_by(Episode.created_at.desc())
        .limit(EPISODE_LOOKBACK * 2)
        .all()
    )
    prior = [
        _content_tags(d)
        for (d,) in recent if d
    ][:EPISODE_LOOKBACK]
    today = _content_tags(perceived)
    when = next(
        (i.get('when') for i in perceived if i.get('when')), {}
    )

    def streak_in(history, tag):
        n = 0
        for past in history:
            if tag in past:
                n += 1
            else:
                break
        return n

    def _item(kind, tag, streak, valence, salience, phrase_key,
              extra_data=None, tags=None):
        options = nl_phrases(session, game_id, phrase_key, brain=brain)
        subject = _tag_subject(tag)
        reading = (
            options[0].format(subject=subject, count=streak)
            if options else f'{subject} — {kind}'
        )
        return {
            'type': 'recurrence',
            'when': when,
            'where': {},
            'data': {
                'kind': kind, 'tag': tag, 'streak': streak,
                **(extra_data or {}),
            },
            'perception': 'noticed',
            'reading': reading,
            'salience': salience,
            'valence': round(max(-1.0, min(1.0, valence)), 3),
            'severity': 0.0,
            'tags': tags or [],
            'evoked': [],
        }

    items = []
    for tag in sorted(today):
        if _repetition_exempt(tag, exempt):
            continue
        streak = 1 + streak_in(prior, tag)
        if streak >= min_streak:
            valence = -min(cap, growth * (streak - min_streak + 1))
            items.append(_item(
                'repetition', tag, streak, valence, pressure_sal,
                'mind.repetition', extra_data={'synthetic': True},
            ))
    if prior:
        for tag in sorted(prior[0]):
            if tag in today or _repetition_exempt(tag, exempt):
                continue
            streak = streak_in(prior, tag)
            if streak >= min_streak:
                items.append(_item(
                    'break', tag, streak, relief_val, relief_sal,
                    'mind.pattern_break',
                    extra_data={'break_of': tag},
                    tags=[f'rupture:{tag}'],
                ))
    return items


def resolve_break_items(session, game_id, brain, perceived, needs, w):
    """A streak that died because the world took something is not relief
    (C12). 'No bread today' while hunger is open is warning, not good
    news: break_need_watch maps tag prefixes to need keys, and when the
    watched need is open the break keeps its salience (still news) but
    speaks darker and its valence turns against the day."""
    watch = w.get('break_need_watch') or {}
    if not watch:
        return
    open_keys = {n.key for n in needs if n.status == 'open'}
    for item in perceived or []:
        data = item.get('data') or {}
        if item.get('type') != 'recurrence' or data.get('kind') != 'break':
            continue
        tag = data.get('tag') or data.get('break_of') or ''
        need_key = next(
            (
                v for prefix, v in watch.items()
                if (tag.startswith(prefix[:-1]) if prefix.endswith(':*')
                    else tag == prefix)
            ),
            None,
        )
        if need_key not in open_keys:
            continue
        subject = _tag_subject(tag)
        options = nl_phrases(
            session, game_id, 'mind.pattern_break_need', brain=brain
        )
        if options:
            item['reading'] = options[0].format(
                subject=subject, count=data.get('streak') or 0
            )
        item['valence'] = w.get('break_loss_valence', -0.1)


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

        # Sleep phases (C4): a checked event at night is slept through
        # unless its form/outcome is intrusive enough to wake the mind.
        if is_asleep(event, w):
            check_result = asleep_check_result(event, index)
            perception = 'unnoticed'
        else:
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
        severity = max(_severity(data), _tag_severity(tags, w))
        salience = min(1.0, (
            w.get('w_severity', 0) * severity
            + w.get('w_novelty', 0) * novelty
            + w.get('w_emotional', 0) * _emotional_charge(data)
            + w.get('w_theme', 0) * theme_weight(tags, weights)
            + w.get('w_perception', 0) * (bonus or 0.0)
        ))
        if perception == 'unnoticed':
            salience *= w.get('unnoticed_salience', 0.5)
        else:
            # The floor lifts only what registered (C16) — a noticed
            # exchange with thinking company is never drowned out by
            # bookkeeping; an unnoticed one stays a difuso.
            floor = _salience_floor(tags, w)
            if floor > salience:
                salience = floor

        # Host-declared valence always wins; otherwise this mind's own
        # affect wiring decides how the event felt.
        host_valence = _num(data.get('valence'))
        valence = host_valence if host_valence is not None else _affect(
            tags, data, w
        )
        item = {
            **event,
            'perception': perception,
            'reading': reading,
            'salience': round(salience, 3),
            'valence': round(max(-1.0, min(1.0, valence)), 3),
            'severity': round(severity, 3),
            'tags': tags,
            'evoked': [],
        }
        if check_result:
            check_result['perception'] = perception
            item['check'] = check_result
        perceived.append(item)
        seen.update(tags)

    # Repetition pressure + pattern breaks (C5): synthesized after the
    # real events so they join mood and memory like anything perceived.
    perceived.extend(
        _recurrence_items(session, game_id, brain, perceived, w)
    )
    return perceived
