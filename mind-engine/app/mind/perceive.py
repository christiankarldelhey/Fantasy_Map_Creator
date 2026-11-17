# ============================================================================
# Perception — events[] -> perceived_day
# ----------------------------------------------------------------------------
# Every event is annotated with a NL `reading`, derived `tags`, and a
# `salience` (importance) weighted by the mind's wiring — two minds can
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
import re

from app.mind.boosts import effective_theme_weights
from app.mind.checks import (
    asleep_check_result,
    character_state,
    is_asleep,
    misread_reading,
    resolve_check,
)
from app.mind.engine import acute_hit, mood_delta, project_body
from app.mind.relations import feed_event, felt_through
from app.mind.semantics import (
    BODY_PROJECTION, load_semantics, semantic_delta,
)
from app.mind.voice import phrases, resolve_event_reading
from app.mind.provisioning import DEFAULT_WIRING
from app.mind.tables import Episode
from app.mind.tags import UNTAGGED_FIELDS, subject_tags
from app.mind.util import best_tag_weight, num, tag_matches

# data fields that count as explicit severity when numeric (0-1 normalized).
SEVERITY_FIELDS = (
    'severity', 'danger', 'threat', 'damage', 'wound',
    'pain', 'hostility', 'risk', 'lethality',
)

EPISODE_LOOKBACK = 20


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
        if key in UNTAGGED_FIELDS:
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
    return best_tag_weight(tags, weights or {})


def _severity(data):
    """0-1: explicit data['severity'] or the max severity-ish field."""
    vals = [num(data.get(f)) for f in SEVERITY_FIELDS]
    vals = [v for v in vals if v is not None]
    return min(1.0, max(vals)) if vals else 0.0


def _tag_severity(tags, w):
    """'severity.<tag>' wiring lets a tag carry a severity floor (C6):
    'severity.tag:weather:storm: 0.6' makes the storm an *event* in the
    salience arithmetic while drizzle stays ambient. Host-declared
    severity still wins via max."""
    return best_tag_weight(tags, w, 'severity.')


def _salience_floor(tags, w):
    """'salience_min.<tag>' wiring lets a perceived thing matter by what
    it IS, not how loud it arrived (C16): 'salience_min.tag:entity_type:
    humans: 0.35' means thinking company is never background to this
    mind, 'salience_min.tag:form:brief_exchange' that a real exchange
    outweighs the weather. Wildcards allowed ('salience_min.entity:*')."""
    return best_tag_weight(tags, w, 'salience_min.')


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


_LEADING_ARTICLE_RE = re.compile(r'^(a|an|the|some)\s+', re.IGNORECASE)


def _tag_subject(tag):
    # Templates bring their own determiner ('no {subject} today', 'the
    # {subject} let up') — a host value 'a ration of road-bread' must not
    # read 'no a ration'.
    subject = tag.rsplit(':', 1)[-1].replace('_', ' ').replace('-', ' ')
    return _LEADING_ARTICLE_RE.sub('', subject.strip())


def _repetition_exempt(tag, exempt):
    """Base routine vs monotony: water every day is life, the same bread
    every day is the week closing in. Exempt entries are exact tags or
    'prefix:*' wildcards — the absence channel (thirst/hunger needs) is
    untouched: exempt presence, alarming absence."""
    return any(tag_matches(tag, entry) for entry in exempt or ())


def _recurrence_items(session, game_id, mind, perceived, w):
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
        .filter_by(game_id=game_id, character_id=mind.character_id)
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
        options = phrases(phrase_key)
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
            # The wear/relief is felt like any perception — the valence
            # as a small affection imprint, so it moves the mood too.
            'imprint': {'affection': round(
                max(-1.0, min(1.0, valence)), 3)},
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


def resolve_break_items(session, game_id, mind, perceived, needs, w):
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
                if tag_matches(tag, prefix)
            ),
            None,
        )
        if need_key not in open_keys:
            continue
        subject = _tag_subject(tag)
        options = phrases('mind.pattern_break_need')
        if options:
            item['reading'] = options[0].format(
                subject=subject, count=data.get('streak') or 0
            )
        item['valence'] = w.get('break_loss_valence', -0.1)
        item['imprint'] = {'affection': item['valence']}


def perceive_events(session, game_id, mind, events, character=None,
                    episode_idx=None):
    """Annotate each event: perception + reading + salience + tags, and the
    vector engine's two channels (ADR 0017): the semantic pack reads the
    event's objective delta, Relations sediment it (narrowest subject whole,
    the rest by splash), and the felt delta — bent by the standing
    Relation — is what the item reports as valence and imprint.

    Returns plain dicts ready for `episodes.perceived_day`. Idempotent at the
    episode level because open() only calls this when creating the episode.
    """
    seen = _seen_tags(session, game_id, mind.character_id)
    # B6: strong active beliefs bend what stands out — boosts add to the
    # cloned theme_weights for this perception pass only.
    weights = effective_theme_weights(session, mind)
    w = {**DEFAULT_WIRING, **(mind.wiring or {})}
    state = character_state(character, events)
    semantics = load_semantics(session, game_id)
    # The body the day starts from: the Condition projected through the
    # declared map — acute event hits land on top of this base, and the
    # next Condition report resets it.
    mind.body = project_body(state, BODY_PROJECTION)

    perceived = []
    for index, event in enumerate(events or []):
        # Tags are host-declared (#53): the world says what happened in
        # words and tags; the mind never derives meaning from raw numbers.
        tags = derive_tags(event)
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
                mind=mind,
            )
        reading = resolve_event_reading(event)
        if perception == 'misread':
            reading = misread_reading(
                session, game_id, event, reading, check_result,
                mind=mind,
            )
        elif perception == 'unnoticed':
            reading = None

        # A hard roll won sharpens the impression; the host's explicit
        # perception_bonus takes precedence when present.
        bonus = num(data.get('perception_bonus'))
        if bonus is None and check_result and check_result.get('success'):
            bonus = min(
                1.0,
                check_result['difficulty']
                / w.get('check_difficulty_scale', 10.0),
            )
        severity = max(_severity(data), _tag_severity(tags, w))

        # The event's objective reading (ADR 0017): what the semantic
        # pack declares this kind of contact meant. Only registered
        # events carry meaning — a favour slept through never happened.
        if perception == 'unnoticed':
            world_delta, contact_w, body_hit = {}, 0.0, {}
        else:
            world_delta, contact_w, body_hit = semantic_delta(
                tags, data, semantics
            )
        charge = min(1.0, sum(abs(v) for v in world_delta.values()))
        salience = min(1.0, (
            w.get('w_severity', 0) * severity
            + w.get('w_novelty', 0) * novelty
            + w.get('w_emotional', 0) * charge
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

        # Two channels: the world delta sediments the Relations it
        # touched (the narrowest subject whole); the felt delta — bent
        # by the standing Relation — is how the event landed on this
        # mind. world_valence keeps the unbent reading.
        subjects = sorted(subject_tags(tags))
        if perception == 'unnoticed' or not subjects:
            felt, primary = {}, None
            if world_delta:
                felt = felt_through(world_delta, {}, mind.personality)
        else:
            primary, standing = feed_event(
                session, mind, subjects, world_delta,
                episode_idx=episode_idx,
            )
            felt = felt_through(world_delta, standing, mind.personality)
        if body_hit:
            acute_hit(mind.body, body_hit)
        valence = mood_delta(felt).get('valence', 0.0)
        item = {
            **event,
            'perception': perception,
            'reading': reading,
            'salience': round(salience, 3),
            'valence': round(valence, 3),
            'world_valence': round(
                mood_delta(world_delta).get('valence', 0.0), 3
            ),
            'severity': round(severity, 3),
            'tags': tags,
            'subjects': subjects,
            'imprint': felt,
            'evoked': [],
        }
        if primary:
            item['subject'] = primary
        if check_result:
            check_result['perception'] = perception
            item['check'] = check_result
        perceived.append(item)
        seen.update(tags)

    # Repetition pressure + pattern breaks (C5): synthesized after the
    # real events so they join mood and memory like anything perceived.
    perceived.extend(
        _recurrence_items(session, game_id, mind, perceived, w)
    )
    return perceived
