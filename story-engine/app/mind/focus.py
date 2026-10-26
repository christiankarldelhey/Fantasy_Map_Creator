# ============================================================================
# The Episode brief — candidates, Focus and what stays silent
# ----------------------------------------------------------------------------
# The Lens is a brief, not an inventory (CONTEXT.md · Lens, Focus). This
# module is the deterministic half: it narrows everything the Mind holds
# down to the candidates that touch this Episode, splits them by time and
# picks a Focus. The LLM director refines the pick; when it is absent (NPC
# minds) or fails, this pick IS the brief.
#
# Two parts, by time — the Lens never names what has not been lived yet:
#   carried  what the Character brings in before anything happens: the
#            entering Mood's cause, Needs already open, Beliefs and
#            Memories that connect to nothing scheduled today
#   day      what the Episode does to it, each line anchored to the phase
#            where it happens (morning / afternoon / night)
#
# Every candidate that does not make the brief lands in `silenced` with
# its reason, so the Studio can show why a Belief never spoke.
# ============================================================================
import re

from app.mind.attitudes import is_attitude, match_level
from app.mind.nl_resolver import phrases as nl_phrases
from app.mind.provisioning import DEFAULT_WIRING
from app.mind.retrieval import _contact_tags

LINE_CAP = 3
PHASES = {
    'morning': 'morning', 'midday': 'afternoon', 'afternoon': 'afternoon',
    'evening': 'night', 'night': 'night',
}
# Items the engine itself produces — the frame of every day, never its
# centre (ADR 0005: 'body' is the host's own report; 'need' items are the
# Mind's felt body, they earn lines through the needs path).
_ENGINE_FRAME_TYPES = {'body', 'need'}
# Game-declared frame types — the pack's 'mind.focus_excluded' phrase list
# (e.g. travel/terrain/climate in the built-in pack).
FOCUS_EXCLUDED_KEY = 'mind.focus_excluded'
# Score of a solitude line: below the weakest touched belief (confidence
# 0.5 × the candidate floor 0.3), equal for all so rotation chooses.
SOLITUDE_SCORE = 0.12
_STOP = {
    'that', 'this', 'with', 'from', 'than', 'they', 'them', 'their', 'there',
    'what', 'when', 'have', 'been', 'into', 'only', 'more', 'still', 'every',
    'which', 'about', 'other', 'after', 'before', 'where', 'under', 'over',
    'like', 'some', 'each', 'does', 'will', 'just', 'once', 'never', 'today',
    'road', 'day', 'days',
}
_WORD_RE = re.compile(r'[a-z]+')


def _stems(text):
    """Content-word stems — a coarse, deterministic 'is this about the
    same thing': 'a warm meal and ale' meets 'a hot meal bought at the inn'
    on 'meal'. The director catches what words alone miss."""
    return {
        w[:5] for w in _WORD_RE.findall((text or '').lower())
        if len(w) >= 4 and w not in _STOP
    }


def _phase(item):
    return PHASES.get(((item.get('when') or {}).get('phase') or ''))


def _touches(tags_a, text_a, tags_b, text_b):
    """Two pieces of the Mind connect when they share a content tag or a
    content word."""
    return bool(set(tags_a or []) & set(tags_b or [])) or bool(
        _stems(text_a) & _stems(text_b)
    )


def _event_id(i):
    return f'event:{i}'


def brief_lines(brief):
    """Every line the brief speaks: the Focus, then carried and day lines."""
    brief = brief or {}
    focus = [brief['focus']] if brief.get('focus') else []
    return focus + list(brief.get('carried') or []) + list(brief.get('day') or [])


def need_origins(session, game_id, needs, entering_mood, brain=None):
    """Where each open Need comes from, in the World voice
    ('mind.need_origin.<key>'): '3 days without a proper meal'. The shadow
    is told through what the entering mood carries; with nothing carried
    it stays nameless rather than invented."""
    cause = (entering_mood or {}).get('cause') or {}
    out = {}
    for n in needs or []:
        key = n.get('key') or ''
        phrase_key = f'mind.need_origin.{key}'
        if key == 'unrest' and not (
            cause.get('reading') and (cause.get('valence') or 0.0) < 0
        ):
            phrase_key = 'mind.need_origin.unrest.nameless'
        options = nl_phrases(session, game_id, phrase_key, brain=brain)
        if not options:
            continue
        try:
            out[key] = options[0].format(
                days=(n.get('source') or {}).get('days'),
                cause=cause.get('reading'),
            )
        except (KeyError, IndexError):
            continue
    return out


def _had_contact(perceived_day):
    """Did anyone at all touch this mind today? A noticed event carrying
    an entity (the host's own declaration that somebody was there) breaks
    solitude; weather, roads and aches are not company."""
    for item in perceived_day or []:
        if item.get('perception') == 'unnoticed':
            continue
        for t in _contact_tags(item.get('tags') or []):
            if t.startswith(('entity:', 'tag:entity_type:')):
                return True
    return False


def build_brief(perceived_day, evoked, beliefs, needs, entering_mood,
                wiring=None, anchors=None, need_origins=None,
                session=None, game_id=None, brain=None, episode_idx=None):
    """Narrow the Mind to this Episode. Returns
    {focus, carried, day, silenced} — each line a dict with id, kind,
    text, part ('carried'|'day'), phase (day lines), score and why."""
    w = {**DEFAULT_WIRING, **(wiring or {})}
    focus_min = w.get('focus_min_salience', 0.45)
    urgent = w.get('need_deep_urgency', 0.6)
    salient_min = w.get('focus_candidate_min_salience', 0.3)
    anchors = anchors or {}
    need_origins = need_origins or {}
    silenced = []
    frame_types = _ENGINE_FRAME_TYPES | set(
        nl_phrases(session, game_id, FOCUS_EXCLUDED_KEY, brain=brain)
    )
    contact_seen = _had_contact(perceived_day)

    # --- today's moments: every noticed, read event; the salient ones are
    # the Focus candidates and day lines ----------------------------------
    moments = []
    for i, item in enumerate(perceived_day or []):
        if item.get('type') in frame_types or not item.get('reading'):
            continue
        if item.get('perception') == 'unnoticed':
            continue
        sal = item.get('salience') or 0.0
        content = _contact_tags(item.get('tags') or [])
        moments.append({
            'id': _event_id(i), 'kind': 'event', 'part': 'day',
            'phase': _phase(item), 'text': item['reading'], 'score': sal,
            'tags': sorted(content),
            # Beliefs may also answer to what KIND of moment this is (a
            # night's rest, a meal, a crossing) — memories may not: the
            # same rest must not evoke every past rest, but a belief
            # about the campfire is exactly about any campfire.
            'touch_tags': sorted(content | {f"type:{item.get('type')}"}),
            'why': f'salience {sal:.2f}',
        })
    events = [m for m in moments if m['score'] >= salient_min]
    day_tags = set().union(*(set(e['tags']) for e in events)) if events else set()
    day_text = ' '.join(e['text'] for e in events)

    # --- beliefs: what the day puts at stake, or what solitude brings up
    # A belief may answer to a moment too small to be a Focus candidate —
    # a forgettable night by the fire is still the campfire it is about.
    # Tagged beliefs touch by tag only (a poem's 'space' must not meet a
    # track's 'wide-spaced'); untagged ones keep the word door. Among the
    # moments it touches, the one sharing the most tags wins, and every
    # extra shared tag adds `belief_specificity_bonus` to its score — the
    # thought about orc SIGNS beats the generic one about orcs.
    bonus = w.get('belief_specificity_bonus', 0.25)
    belief_lines = []
    for b in beliefs or []:
        # An Attitude's Subject is part of what it answers to.
        btags = set(b.tags or []) | set(getattr(b, 'subject', None) or [])
        hit, overlap = None, 0
        for m in moments:
            if btags:
                n = len(btags & set(m['touch_tags']))
            else:
                n = 1 if _stems(b.statement) & _stems(m['text']) else 0
            if n and (hit is None or (n, m['score']) > (overlap, hit['score'])):
                hit, overlap = m, n
        if hit is None:
            # 'context:solitude' beliefs ask nothing of the day — they
            # speak when nobody touched the mind at all: the thoughts a
            # person keeps for themselves (seed thoughts, authored
            # personality). Days with company keep them quiet.
            if 'context:solitude' not in (b.tags or []):
                silenced.append({
                    'kind': 'belief', 'text': b.statement,
                    'stage': 'filter',
                    'reason': 'nothing in the Episode puts it at stake',
                })
                continue
            if contact_seen:
                silenced.append({
                    'kind': 'belief', 'text': b.statement,
                    'stage': 'filter',
                    'reason': 'the day had company',
                })
                continue
            # A flat score, below anything the day actually touched:
            # free-floating thought yields to what happened, and a wandering
            # mind surfaces any of its thoughts — confidence doesn't pick,
            # rotation does (else the most-held one speaks every quiet day).
            belief_lines.append({
                'id': f'belief:{b.id}', 'kind': 'belief', 'part': 'carried',
                'phase': None, 'text': b.statement,
                'score': SOLITUDE_SCORE,
                'solitude': True, 'tagged': True,
                'why': 'the mind alone with itself',
            })
            continue
        belief_lines.append({
            'id': f'belief:{b.id}', 'kind': 'belief', 'part': 'day',
            'phase': hit['phase'], 'text': b.statement,
            'score': (
                (b.confidence or 0.0) * max(hit['score'], salient_min)
                * (1 + bonus * (overlap - 1))
            ),
            'connects_to': hit['id'], 'tagged': bool(btags),
            'att_level': (
                match_level(b, hit['touch_tags']) if is_attitude(b) else 0
            ),
            'why': f'at stake in: {hit["text"][:60]}',
        })
    # One encounter, one attitude: the narrowest subject speaks for it
    # (the horses of Mordor over horses); wider ones step back.
    narrowest = {}
    for line in belief_lines:
        if line.get('att_level'):
            key = line['connects_to']
            narrowest[key] = max(narrowest.get(key, 0), line['att_level'])
    kept = []
    for line in belief_lines:
        lvl = line.get('att_level')
        if lvl and lvl < narrowest[line['connects_to']]:
            silenced.append({
                'kind': 'belief', 'text': line['text'], 'stage': 'filter',
                'reason': 'a closer attitude speaks for this encounter',
            })
            continue
        kept.append(line)
    belief_lines = kept

    # --- memories: evoked by the day; anchored ones wait for their phase -
    memory_lines = []
    for m in evoked or []:
        anchor = anchors.get(m.id)
        if anchor is not None:
            ev_id = _event_id(anchor)
            ev = next((e for e in events if e['id'] == ev_id), None)
            item = (perceived_day or [])[anchor]
            phase = _phase(item)
            data = item.get('data') or {}
            memory_lines.append({
                'id': f'memory:{m.id}', 'kind': 'memory', 'part': 'day',
                'phase': phase, 'text': m.desc,
                # Who stirred it — lets the prompt hang the echo on that
                # encounter instead of floating it in the phase.
                'subject': (
                    data.get('entity_name') or data.get('name')
                    or data.get('entity')
                ),
                'score': (m.importance or 0.0) * (ev['score'] if ev else 0.5),
                'connects_to': ev_id if ev else None,
                'why': 'stirred by what happens' + (f' {phase}' if phase else ''),
            })
        else:
            memory_lines.append({
                'id': f'memory:{m.id}', 'kind': 'memory', 'part': 'carried',
                'phase': None, 'text': m.desc,
                'score': (m.importance or 0.0) * 0.5,
                'why': 'resonates with the Episode as a whole',
            })

    # --- needs: new, worsening, touched — or past the urgency line -------
    need_lines = []
    for n in needs or []:
        u = n.get('urgency') or 0.0
        text = n.get('description') or n.get('key')
        origin = need_origins.get(n.get('key'))
        line_text = f'{text} — {origin}' if origin else text
        touched = _touches(
            [f'need:{n.get("key")}'], text, day_tags, day_text,
        ) or bool(n.get('entity') and f'entity:{n["entity"]}' in day_tags)
        reasons = [
            r for r, ok in (
                ('past the urgency line', u >= urgent),
                ('new', n.get('is_new')),
                ('worsening', n.get('worsening')),
                ('touched by the Episode', touched),
            ) if ok
        ]
        if not reasons:
            silenced.append({
                'kind': 'need', 'text': text, 'stage': 'filter',
                'reason': 'stable and untouched by the Episode',
            })
            continue
        # A need born today was born OF today — it speaks at night, after
        # whatever opened it, never before. New to the Mind is not born
        # today: two days without food were already two days old.
        days = (n.get('source') or {}).get('days')
        born_today = bool(n.get('is_new')) and not (days and days > 1)
        need_lines.append({
            'id': f'need:{n.get("id") or n.get("key")}', 'kind': 'need',
            'part': 'day' if born_today else 'carried',
            'phase': 'night' if born_today else None,
            'text': line_text, 'score': u, 'urgent': u >= urgent,
            'why': ', '.join(reasons),
        })

    # --- the entering mood, through its cause ----------------------------
    # A strong mood speaks even unconnected: it is how the Character walks
    # into the Episode, not something the day must earn.
    mood_lines = []
    cause = (entering_mood or {}).get('cause')
    if cause and cause.get('reading'):
        strength = abs((entering_mood or {}).get('valence') or 0.0)
        mood_lines.append({
            'id': 'mood:cause', 'kind': 'mood', 'part': 'carried',
            'phase': None, 'text': cause['reading'], 'score': strength,
            'tags': cause.get('tags') or [],
            'urgent': strength >= w.get('focus_mood_strong', 0.4),
            'why': 'what the mood carries in from before',
        })

    # --- Focus: usually today's loudest event; a pressing need or a
    # strongly held memory may take the centre instead --------------------
    focus = None
    best_event = max(events, key=lambda e: e['score'], default=None)
    if best_event and best_event['score'] >= focus_min:
        focus = best_event
    urgent_need = max(
        (n for n in need_lines if n['urgent']), key=lambda n: n['score'],
        default=None,
    )
    if urgent_need and (focus is None or urgent_need['score'] > focus['score']):
        focus = urgent_need
    strong_memory = max(
        (m for m in memory_lines
         if m['score'] >= w.get('focus_memory_min', 0.8)),
        key=lambda m: m['score'], default=None,
    )
    if strong_memory and (focus is None or strong_memory['score'] > focus['score']):
        focus = strong_memory

    # --- lines: what connects to the Focus, capped; urgent needs always --
    # Lines are the inner side — the day's events reach the narrator
    # through the phase blocks anyway; only one of them is the Focus.
    pool = belief_lines + memory_lines + need_lines + mood_lines
    # Deterministic variety for a mind with many thoughts: the beliefs
    # that tie on score (same confidence, same touch) rotate by Episode,
    # so a different one speaks each quiet day. Replay-stable: the order
    # depends only on the Episode's own index.
    if episode_idx is not None:
        eligible = [c for c in pool if c['kind'] == 'belief']
        if eligible:
            off = (episode_idx * LINE_CAP) % len(eligible)
            rotated = eligible[off:] + eligible[:off]
            it = iter(rotated)
            pool = [
                next(it) if c['kind'] == 'belief' else c for c in pool
            ]

    def connected(c):
        # A quiet Episode is 'the road and the body': with no Focus, the
        # needs that earned a place still speak; memories and beliefs
        # have nothing to connect to and stay silent — except solitude
        # thoughts, whose whole point is the day that touched nobody.
        # A belief the day touched still speaks: a quiet day with a fire
        # at night is a day for the thought about the fire.
        if focus is None:
            return (
                c['kind'] == 'need' or bool(c.get('solitude'))
                or (c['kind'] == 'belief' and bool(c.get('connects_to')))
            )
        # Solitude lines only exist on days nobody touched the mind; a
        # striking ruin seen alone is still a day alone.
        if c.get('solitude'):
            return True
        if c.get('connects_to') == focus['id']:
            return True
        # A need born today is what the day did to the body — it belongs
        # to whatever the day turned on.
        if c['kind'] == 'need' and c['part'] == 'day':
            return True
        if focus['kind'] == 'event' and c.get('phase') and (
            c.get('phase') == focus.get('phase')
        ) and c['kind'] != 'event':
            return True
        if c.get('tagged'):
            return False
        return _touches(
            c.get('tags'), c['text'], focus.get('tags'), focus['text']
        )

    chosen, chosen_ids = [], set()
    for c in sorted(pool, key=lambda c: c['score'], reverse=True):
        if focus is not None and c['id'] == focus['id']:
            continue
        must = c.get('urgent')
        if must or (connected(c) and len(chosen) < LINE_CAP):
            chosen.append(c)
            chosen_ids.add(c['id'])
    for c in pool:
        if c['id'] in chosen_ids or (focus and c['id'] == focus['id']):
            continue
        silenced.append({
            'kind': c['kind'], 'text': c['text'], 'stage': 'pick',
            'reason': (
                'past the line cap' if connected(c)
                else 'quiet Episode — no Focus to connect to' if focus is None
                else 'does not connect to the Focus'
            ),
        })

    def strip(c):
        return {
            k: v for k, v in c.items()
            if k not in ('tags', 'touch_tags', 'urgent', 'tagged',
                         'att_level')
        }

    lines = [strip(c) for c in chosen]
    return {
        'focus': strip(focus) if focus else None,
        'carried': [c for c in lines if c['part'] == 'carried'],
        'day': [c for c in lines if c['part'] == 'day'],
        'silenced': silenced,
        'chosen_by': 'rules',
        # Everything that passed the filter — what the director picks
        # from. Not stored: the caller pops it before persisting.
        'candidates': [
            {k: v for k, v in c.items()
             if k not in ('tags', 'touch_tags', 'tagged', 'att_level')}
            for c in events + pool
        ],
    }
