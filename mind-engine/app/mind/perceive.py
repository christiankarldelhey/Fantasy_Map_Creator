# ============================================================================
# Perception — events[] -> perceived_day
# ----------------------------------------------------------------------------
# Every event is annotated with a NL `reading`, derived `tags`, and a
# `salience` (importance) weighted by the mind's wiring — two minds can
# notice the same world differently. Events carrying `data.check` are
# gated and rolled (B1, app/mind/checks.py): the outcome bends perception
# to `unnoticed`/`misread`, never the world's facts.
#
# Tag convention (shared with relation attention keys):
#   type:<event.type>        — every event
#   tag:<data[key]>          — string data values; absence markers
#                            ('none', 'null', '0', ...) never tag
#   tag:<data[key]>:<sub>    — nested list values (e.g. data.tags)
#   entity:<id>              — data.entity or data.entity_id
#   region:<name>            — where.region
# Weight keys may wildcard: 'tag:weather:*' matches 'tag:weather:rain'.
# ============================================================================
import re

from app.day_phases import NARRATIVE_PHASES
from app.mind.detectors import body_projection
from app.mind.checks import (
    asleep_check_result,
    character_state,
    is_asleep,
    misread_reading,
    resolve_check,
)
from app.mind.engine import acute_hit, mood_delta, project_body
from app.mind.relations import (
    attention_weights, feed, feed_event, felt_through, standing,
)
from app.mind.semantics import (
    field_severity, load_semantics, semantic_delta, tag_floors,
)
from app.mind.voice import phrases, resolve_event_reading, streak_subjects
from app.mind.provisioning import DEFAULT_WIRING
from app.mind.tables import Episode
from app.mind.tags import UNTAGGED_FIELDS, subject_tags, tag_is
from app.mind.util import best_tag_weight, num, tag_matches

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
    where = event.get('where') or {}
    region = where.get('region')
    if region:
        tags.append(f'region:{region}')
    # Something lived AT a named place marks the place too — the orcs
    # at the ford leave their fear on the ford (a splash share, as a
    # secondary subject), not only on the orcs.
    place = where.get('place')
    if place:
        tags.append(f'tag:place:{place}')
    return tags


def attention_weight(tags, weights):
    """Max matching attention weight across the event's tags; wildcards
    'prefix:*' match any tag with that prefix. 0 = this mind is
    indifferent."""
    return best_tag_weight(tags, weights or {})


def _tag_severity(tags, semantics):
    """A tag carries a severity floor through the semantic pack (C6):
    'weather:storm: 0.6' makes the storm an *event* in the salience
    arithmetic while drizzle stays ambient. Host-declared severity
    still wins via max."""
    return tag_floors(tags, semantics)[1]


def _salience_floor(tags, semantics):
    """The pack's salience floor lets a perceived thing matter by what
    it IS, not how loud it arrived (C16): 'entity_type:orcs: 0.45'
    means the patrol is never background, 'form:brief_exchange: 0.45'
    that a real exchange outweighs the weather."""
    return tag_floors(tags, semantics)[0]


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
    """The day's streak-eligible tags — noticed items only, never the
    recurrence channel's own notes or the felt-body channel, and only
    pattern-classed families (#147): 'the orcs', 'this rain', 'that
    bread' can become a theme; host markers and bookkeeping fields
    cannot."""
    tags = set()
    for it in day or []:
        if it.get('perception') == 'unnoticed':
            continue
        if it.get('type') in ('recurrence', 'need'):
            continue
        tags.update(
            t for t in (it.get('tags') or [])
            if not t.startswith('type:')
            and tag_is(t, 'pattern')
            # Sentinel values are absence, not content: 'wounded:none'
            # repeating is not a stretch, and breaking it must never
            # read 'no none today'.
            and not t.endswith(':none')
        )
    return tags


_LEADING_ARTICLE_RE = re.compile(r'^(a|an|the|some)\s+', re.IGNORECASE)


def _tag_subject(tag, subject_map=None):
    # A non-noun tag's streak subject comes from the declared phrase
    # map first (#147): 'tag:rest:poor' reads 'sleepless nights', never
    # 'poor'. Otherwise the tag's tail, article-stripped — templates
    # bring their own determiner ('no {subject} today', 'the {subject}
    # let up'), so a host value 'a ration of road-bread' must not read
    # 'no a ration'.
    mapped = (subject_map or {}).get(tag)
    if mapped:
        return mapped
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

    def _anchor_when(tag):
        """The clock position a streak belongs to (#149): the noticed
        item that carried the tag today — a bread complaint sits
        beside the meal beat, a weather complaint beside the weather
        beat, never adrift on the first item of the day."""
        for i in perceived:
            if i.get('type') == 'recurrence':
                continue
            if tag in (i.get('tags') or []) and i.get('when'):
                return i['when']
        return None

    def _quietest_when():
        """No anchor: the narrative phase the day used least (#149)."""
        counts = {p: 0 for p in NARRATIVE_PHASES}
        for i in perceived:
            phase = (i.get('when') or {}).get('phase')
            if phase in counts:
                counts[phase] += 1
        quietest = min(counts, key=counts.get)
        return {**when, 'phase': quietest}

    def _loudest_other_salience(tag):
        """The day's loudest noticed thing that is NOT this streak —
        a salient novel event makes the sameness yield (#149): the
        orc attack's own salience does not silence the orc streak,
        the dragon does."""
        return max(
            (
                i.get('salience') or 0.0 for i in perceived
                if i.get('type') != 'recurrence'
                and i.get('perception') != 'unnoticed'
                and tag not in (i.get('tags') or [])
            ),
            default=0.0,
        )

    def streak_in(history, tag):
        n = 0
        for past in history:
            if tag in past:
                n += 1
            else:
                break
        return n

    subject_map = streak_subjects(session, game_id)
    semantics = load_semantics(session, game_id)

    def _streak_like(tag):
        """How this mind stands toward the recurring thing, in [-1, 1]
        (#148): a subject's Relation speaks — lembas loved, orcs
        feared; with no Relation the semantic pack's own delta is the
        proxy (steady rain is mildly aversive to anyone). Positive:
        liked; negative: disliked or feared."""
        if tag_is(tag, 'subject'):
            vec = standing(session, game_id, mind.character_id, tag)
            if vec is not None:
                return max(-1.0, min(
                    1.0, vec['affection'] - vec['fear']))
        world, _, _ = semantic_delta([tag], {}, semantics)
        return max(-1.0, min(
            1.0,
            world.get('affection', 0.0) - world.get('fear', 0.0)))

    def _item(kind, tag, streak, valence, salience, phrase_key,
              extra_data=None, tags=None):
        options = phrases(phrase_key, session, game_id)
        subject = _tag_subject(tag, subject_map)
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
    break_scale = w.get('break_standing_scale', 0.3)
    yield_sal = w.get('recurrence_yield_salience', 0.45)
    for tag in sorted(today):
        if _repetition_exempt(tag, exempt):
            continue
        streak = 1 + streak_in(prior, tag)
        if streak < min_streak:
            continue
        # Wear scaled by standing (#148): what is feared or hated grates
        # up to twice as fast; what is loved grates slower — halved at
        # most, never zero, because sameness tires even what is
        # cherished. The slowdown self-reinforces: once a loved thing
        # starts souring, the standing falls and the wear speeds up.
        like = _streak_like(tag)
        factor = 1 - (0.5 * like if like > 0 else like)
        valence = -min(
            cap, growth * (streak - min_streak + 1) * factor)
        if valence > -0.01:
            continue
        items.append({
            **_item(
                'repetition', tag, streak, valence, pressure_sal,
                'mind.repetition', extra_data={'synthetic': True},
            ),
            'when': _anchor_when(tag) or _quietest_when(),
        })
        # Monotony on a subject sediments too: the fifth straight
        # fruit-bread wears on 'tag:food:fruit-bread' itself, not
        # only on the day. It is erosion, not contradictory evidence —
        # resistance does not dam it; the standing already slowed the
        # wear through the like factor above.
        if tag_is(tag, 'subject'):
            feed(
                session, game_id, mind.character_id, tag,
                {'affection': valence}, resistance=0.0,
            )
        if _loudest_other_salience(tag) >= yield_sal:
            # A salient novel event owns this day (#149): the sameness
            # still erodes the standing above, but it does not spend
            # the day's words on itself.
            items.pop()
    if prior:
        for tag in sorted(prior[0]):
            if tag in today or _repetition_exempt(tag, exempt):
                continue
            streak = streak_in(prior, tag)
            if streak >= min_streak:
                # The break's sign follows the standing (#148): the rain
                # stopping is relief, the loved bread running out is a
                # gap — a break is not universally good news.
                like = _streak_like(tag)
                valence = relief_val - like * break_scale
                # Ambient absences are noticed on stepping out — a dry
                # dawn; the rest land on the day's quietest phase.
                anchor = (
                    {**when, 'phase': 'morning'}
                    if tag_is(tag, 'ambient') else _quietest_when())
                items.append({
                    **_item(
                        'break', tag, streak, valence, relief_sal,
                        'mind.pattern_break' if valence >= 0
                        else 'mind.pattern_break_loss',
                        extra_data={'break_of': tag},
                        tags=[f'rupture:{tag}'],
                    ),
                    'when': anchor,
                })
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
        subject = _tag_subject(tag, streak_subjects(session, game_id))
        options = phrases('mind.pattern_break_need', session, game_id)
        if options:
            item['reading'] = options[0].format(
                subject=subject, count=data.get('streak') or 0
            )
        item['valence'] = w.get('break_loss_valence', -0.1)
        item['imprint'] = {'affection': item['valence']}


def _subject_displays(data):
    """subject tag -> the name the host worded it with. The slug is the
    Relation's identity; this is how it is said — 'The Prancing Pony',
    never 'prancing_pony' the guessed animal."""
    out = {}
    if data.get('entity') and data.get('entity_name'):
        out[f"entity:{data['entity']}"] = data['entity_name']
    # A named person says itself — 'Bungo', never 'bungo' the word.
    if data.get('npc') and data.get('npc_name'):
        out[f"tag:npc:{data['npc']}"] = data['npc_name']
    if data.get('place') and data.get('name'):
        out[f"tag:place:{data['place']}"] = data['name']
    return out


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
    w = {**DEFAULT_WIRING, **(mind.wiring or {})}
    # Two channels of attention (ADR 0017): the semantic pack declares
    # objective weight (charge + floors below); the Relations supply the
    # personal bias — what this mind loves, hates or fears stays watched.
    weights = attention_weights(
        session, mind, w.get('relation_attention_gain', 0.3))
    state = character_state(character)
    semantics = load_semantics(session, game_id)
    # The body the day starts from: the Condition projected through the
    # declared map — acute event hits land on top of this base, and the
    # next Condition report resets it.
    mind.body = project_body(state, body_projection(session, game_id))

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
        if is_asleep(event, tags, w, semantics):
            check_result = asleep_check_result(event, index)
            perception = 'unnoticed'
        else:
            check_result, perception = resolve_check(
                session, game_id, character, event, index, state, w,
                mind=mind,
            )
        reading = resolve_event_reading(event, session, game_id)
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
        severity = min(1.0, max(
            field_severity(data, semantics),
            _tag_severity(tags, semantics),
        ))

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
            + w.get('w_attention', 0) * attention_weight(tags, weights)
            + w.get('w_perception', 0) * (bonus or 0.0)
        ))
        if perception == 'unnoticed':
            salience *= w.get('unnoticed_salience', 0.5)
        else:
            # The floor lifts only what registered (C16) — a noticed
            # exchange with thinking company is never drowned out by
            # bookkeeping; an unnoticed one stays a difuso.
            floor = _salience_floor(tags, semantics)
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
                displays=_subject_displays(data),
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
