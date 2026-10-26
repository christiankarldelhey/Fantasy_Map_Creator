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


def build_brief(perceived_day, evoked, beliefs, needs, entering_mood,
                wiring=None, anchors=None, need_origins=None,
                session=None, game_id=None, brain=None):
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

    # --- today's events: candidates for the Focus and day lines ----------
    events = []
    for i, item in enumerate(perceived_day or []):
        if item.get('type') in frame_types or not item.get('reading'):
            continue
        if item.get('perception') == 'unnoticed':
            continue
        sal = item.get('salience') or 0.0
        if sal < salient_min:
            continue
        events.append({
            'id': _event_id(i), 'kind': 'event', 'part': 'day',
            'phase': _phase(item), 'text': item['reading'], 'score': sal,
            'tags': sorted(_contact_tags(item.get('tags') or [])),
            'why': f'salience {sal:.2f}',
        })
    day_tags = set().union(*(set(e['tags']) for e in events)) if events else set()
    day_text = ' '.join(e['text'] for e in events)

    # --- beliefs: only what the day puts at stake ------------------------
    belief_lines = []
    for b in beliefs or []:
        hit = next(
            (e for e in events
             if _touches(b.tags, b.statement, e['tags'], e['text'])),
            None,
        )
        if hit is None:
            silenced.append({
                'kind': 'belief', 'text': b.statement, 'stage': 'filter',
                'reason': 'nothing in the Episode puts it at stake',
            })
            continue
        belief_lines.append({
            'id': f'belief:{b.id}', 'kind': 'belief', 'part': 'day',
            'phase': hit['phase'], 'text': b.statement,
            'score': (b.confidence or 0.0) * hit['score'],
            'connects_to': hit['id'],
            'why': f'at stake in: {hit["text"][:60]}',
        })

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

    def connected(c):
        # A quiet Episode is 'the road and the body': with no Focus, the
        # needs that earned a place still speak; memories and beliefs
        # have nothing to connect to and stay silent.
        if focus is None:
            return c['kind'] == 'need'
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
        return {k: v for k, v in c.items() if k not in ('tags', 'urgent')}

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
            {k: v for k, v in c.items() if k != 'tags'}
            for c in events + pool
        ],
    }
