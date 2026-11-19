# ============================================================================
# Lens + mood — the packet's inner voice
# ----------------------------------------------------------------------------
# The lens is a plain-text template rendered ONCE at episode open from the
# Episode brief (focus.py, C35) — already-worded material, it never invents
# words. Stored on the episode so re-open replays the same snapshot.
#
# Mood: importance-weighted mean valence of the perceived events, arousal
# from severity; the dominant label resolves through the mood bands in
# voice.py. The episode's mood blends into the mind's running mood
# (half-life of one episode).
# ============================================================================
import re
from datetime import date

from app.mind.engine import (
    MOOD_DIMS, add_delta, couple_mood, derive_feeling, feeling_lexicon,
    mood_delta, weigh_body,
)
from app.mind.tags import cause_tags
from app.mind.voice import humanize, mood_phrase
from app.mind.provisioning import DEFAULT_WIRING


def _weighted_mean(items, key):
    total_w = sum(i.get('salience') or 0.0 for i in items)
    if total_w <= 0:
        return 0.0
    return (
        sum((i.get(key) or 0.0) * (i.get('salience') or 0.0) for i in items)
        / total_w
    )


def episode_mood(session, game_id, perceived_day, mind=None, needs=None):
    """What this episode felt like: weighted by how much each event
    mattered (salience), then pressed by open threads — an intention is
    a weight the body channels can't carry. Physiological needs speak
    through their perceived items and the body's drag, never twice.
    dominant via the editable 'mood' band. `felt` is the day's
    accumulated felt delta (engine, ADR 0017) and `trace` the per-event
    record of it — the day's emotional plot."""
    items = perceived_day or []
    valence = _weighted_mean(items, 'valence')
    arousal = _weighted_mean(items, 'severity')
    thread_pressure = 0.0
    if needs:
        w = {**DEFAULT_WIRING, **((mind.wiring if mind else None) or {})}
        scale = w.get('thread_pressure_scale', 0.3)
        cap = w.get('thread_pressure_cap', 0.4)
        # The projected body already drags physiological needs — a
        # thread (an open intention, a promise) is what weighs extra.
        thread_pressure = min(cap, sum(
            (n.urgency or 0.0) * scale for n in needs
            if n.type != 'physiological'
        ))
        valence = max(-1.0, valence - thread_pressure)
    dominant = mood_phrase(valence, session, game_id) or 'neutral'
    felt = {}
    trace = []
    for i in items:
        imprint = i.get('imprint') or {}
        if not imprint:
            continue
        add_delta(felt, imprint)
        trace.append({
            'subject': i.get('subject'),
            'reading': i.get('reading'),
            'felt': imprint,
        })
    arc, turn = mood_arc(items, session, game_id)
    return {
        'valence': round(valence, 3),
        'arousal': round(arousal, 3),
        'dominant': dominant,
        'thread_pressure': round(thread_pressure, 3),
        'felt': {d: round(v, 3) for d, v in felt.items()},
        'trace': trace,
        'arc': arc,
        'turn': turn,
    }


_PHASE_ORDER = ('morning', 'afternoon', 'night')

# How hard the standing mood must swing between phases to call it a
# turn — a quiet ebb is the day breathing, not the day breaking.
TURN_MIN_SWING = 0.3


def mood_arc(items, session=None, game_id=None):
    """The day's emotional plot by phase (ADR 0017): the felt deltas
    accumulated morning -> afternoon -> night, each point carrying the
    phase's heaviest reading as its cause. And the TURN — the phase
    where the standing mood swung hard or flipped sign, with the
    reading that did it ('the afternoon turned at the ford'). A day
    may be a pleasant morning and a sad afternoon; one number for the
    day could never say that.
    Returns (arc, turn)."""
    arc = []
    running = {}
    prev_valence = None
    turn = None
    for phase in _PHASE_ORDER:
        felt = {}
        cause, cause_w = None, 0.0
        for i in items:
            if (i.get('when') or {}).get('phase') != phase:
                continue
            imprint = i.get('imprint') or {}
            add_delta(felt, imprint)
            weight = abs(i.get('valence') or 0.0) * (
                i.get('salience') or 0.0)
            if i.get('reading') and weight > cause_w:
                cause, cause_w = i['reading'], weight
        if not felt:
            continue
        add_delta(running, felt)
        valence = couple_valence(running)
        point = {
            'phase': phase,
            'felt': {d: round(v, 3) for d, v in felt.items()},
            'valence': round(valence, 3),
            'mood': mood_phrase(valence, session, game_id),
            'cause': cause,
        }
        arc.append(point)
        if prev_valence is not None:
            swing = valence - prev_valence
            if abs(swing) >= TURN_MIN_SWING or (
                    swing and (valence > 0) != (prev_valence > 0)):
                turn = {
                    'phase': phase,
                    'from': round(prev_valence, 3),
                    'to': round(valence, 3),
                    'cause': cause,
                }
        prev_valence = valence
    return arc, turn


def couple_valence(felt):
    """The mood-space valence of a felt vector — mood_delta read for
    its valence only (the arc tracks the day's colour, not its whole
    posture)."""
    return mood_delta(felt).get('valence', 0.0)


MOOD_CAUSE_MIN_WEIGHT = 0.15
MOOD_CAUSE_MIN_VALENCE = 0.1


def mood_cause(perceived_day, needs=None):
    """What moved the mood most this episode: the perceived item (or open
    need) with the largest |valence| × salience. The Mood is told through
    its cause, never as a bare label — this is that cause, already worded."""
    best, best_w = None, MOOD_CAUSE_MIN_WEIGHT
    for p in perceived_day or []:
        # 'mood_cause' is the kind registry's flag — 'the hunger' is the
        # lens's own voice, not a cause of the day. The type check
        # covers items persisted before the flag existed.
        if (p.get('mood_cause') is False or p.get('type') == 'need'
                or not p.get('reading')):
            continue
        weight = abs(p.get('valence') or 0.0) * (p.get('salience') or 0.0)
        if weight > best_w:
            best = {
                'reading': p['reading'], 'valence': p.get('valence') or 0.0,
                # Cause tags let the brief connect the carried mood to
                # today's Focus (orc tracks yesterday, orcs today).
                'tags': cause_tags(p.get('tags')),
            }
            best_w = weight
    for n in needs or []:
        desc = getattr(n, 'desc', None) or getattr(n, 'description', None)
        weight = getattr(n, 'urgency', 0.0) or 0.0
        if desc and weight > best_w:
            best = {'reading': desc, 'valence': -weight}
            best_w = weight
    return best


def update_mind_mood(session, game_id, mind, ep_mood, cause=None,
                      when=None):
    """The running mood absorbs the day's felt deltas (ADR 0017): each
    perceived event already moved its Relations; here their felt share
    lands on the mood vector through W_RM — the mood never reads the
    events. The body speaks too: open needs press valence down and lift
    arousal (C24) — a starving body does not fade into 'steady'; the
    day's need IS the mood. `cause` (mood_cause) replaces the carried
    one when the episode had one; a mood that settles near neutral lets
    its cause go — nothing weighs any more."""
    prior = mind.mood or {}
    mood = {d: prior.get(d) or 0.0 for d in MOOD_DIMS}
    couple_mood(mood, [ep_mood.get('felt') or {}])
    # The body's voice (ADR 0017 · W_BM): the projected Condition drags
    # the mood by its load; thread needs — intentions, not flesh — press
    # valence down on top, urgency-scaled.
    weigh_body(mood, getattr(mind, 'body', None) or {})
    pressure = ep_mood.get('thread_pressure') or 0.0
    mood['valence'] = max(-1.0, mood.get('valence', 0.0) - pressure)
    mood['arousal'] = min(1.0, mood.get('arousal', 0.0) + pressure * 0.5)
    valence = mood['valence']
    dominant = mood_phrase(valence, session, game_id) or 'neutral'
    carried = prior.get('cause')
    if cause:
        carried = {**cause, 'date': when.isoformat() if when else None}
    # A cause must explain the mood it rides with: none once the mood
    # settles near neutral, none if the day flipped past its sign.
    if abs(valence) < MOOD_CAUSE_MIN_VALENCE or (
        carried and (carried.get('valence') or 0.0) * valence < 0
    ):
        carried = None
    mind.mood = {
        **{d: round(mood.get(d) or 0.0, 3) for d in MOOD_DIMS},
        'dominant': dominant,
        'feeling': derive_feeling(mood, feeling_lexicon(session, game_id)),
        'cause': carried,
    }
    return mind.mood


def _mood_line(mood, today=None):
    """The entering Mood as its cause: 'Still weighing on them (from
    yesterday): the orc tracks…'. No cause, no line — a mind at ease
    says nothing about it."""
    cause = (mood or {}).get('cause')
    if not cause or not cause.get('reading'):
        return None
    verb = (
        'weighing on them' if (cause.get('valence') or 0.0) < 0
        else 'lifting their spirits'
    )
    since = ''
    if cause.get('date') and today is not None:
        days = (today - date.fromisoformat(cause['date'])).days
        if days == 1:
            since = ' (from yesterday)'
        elif 1 < days < 14:
            since = f' (from {days} days ago)'
        elif days >= 14:
            since = ' (from a long while ago)'
    return f'Still {verb}{since}: {cause["reading"]}'


def _age_phrase(mem, age_days):
    """How long ago the memory happened — the lens marks the past as past
    (C20): 'yesterday — the ranger asked...' reads as recollection, not
    as today's events. C30: the delta is calendar days — a month of rest
    between journeys reads 'a long while ago', never 'yesterday'."""
    if age_days is None or age_days <= 0:
        return ''
    if age_days == 1:
        return 'Yesterday — '
    if age_days < 14:
        return f'{age_days} days ago — '
    return 'A long while ago — '


QUIET_EPISODE = (
    'Nothing in this Episode weighs on them beyond the road and the body '
    '— let it be the quiet stretch it is.'
)
AGO_CUE = (
    'Lines marked "ago" are memories surfacing — let them colour the day '
    'as recollection or comparison, never as events happening now.'
)


def line_text(line, mood=None, today=None):
    """One brief line as the narrator reads it: memories carry their age,
    the mood its 'still weighing on them'. Words fixed at open win."""
    if line.get('render'):
        return line['render']
    if line.get('kind') == 'mood':
        return _mood_line(mood, today) or line['text']
    return f"{line.get('age') or ''}{line['text']}"


# The standing self, rendered (ADR 0017): a Relation over the bar earns
# one disposition line — facts-of-feeling for the narrator to weave,
# never prose to quote. The subject is humanized from its tag.
_DISPOSITION_RENDER = {
    'dread': '{subj} weighs on them like a coming dark',
    'fear': '{subj} tightens their chest before it means to',
    'wary': '{subj} puts them on their guard',
    'feared and hated': '{subj} — feared, and hated for it',
    'hatred': '{subj} earns no love from them',
    'distrust': '{subj} has never quite earned their trust',
    'fondness': '{subj} sits warm in their memory',
    'gratitude': '{subj} has earned their thanks',
    'warmth': '{subj} — a small good thing to them',
    'deep friendship': '{subj} — they would walk far for that one',
}

# A relation earns a line when some dim crosses the bar, or when it is
# simply KNOWN — familiarity alone is a way of standing in the world.
_DISPOSITION_MIN_DIM = 0.3
_DISPOSITION_MIN_FAMILIARITY = 0.6
_DISPOSITION_MAX_LINES = 5

# How the standing self ranks for lines (the weight of the experience):
# familiarity is the quietest dim — the daily waterskin should not
# outrank a fresh fear; a relation the world just fed speaks louder; a
# relation the prompt already voiced lately goes quiet — the narrator
# has said that piece and the mind moves on.
_FELT_FAMILIARITY = 0.5
_RECENTLY = 2          # episodes: 'just now', for feed and for surface
_FRESH_FEELING = 2.0   # fed within _RECENTLY episodes
_ALREADY_SAID = 0.3    # surfaced within _RECENTLY episodes


def _disposition_weight(r, vec, as_of_episode):
    """The experience's weight: felt dims whole, familiarity halved,
    fresh sediment boosted, recently-spoken lines damped."""
    felt = max(
        abs(vec.get('affection', 0)), abs(vec.get('trust', 0)),
        vec.get('fear', 0),
        vec.get('familiarity', 0) * _FELT_FAMILIARITY,
    )
    if as_of_episode is None:
        return felt
    if (r.last_fed_episode is not None
            and 0 <= as_of_episode - r.last_fed_episode <= _RECENTLY):
        felt *= _FRESH_FEELING
    if (r.last_surfaced_episode is not None
            and 0 <= as_of_episode - r.last_surfaced_episode <= _RECENTLY):
        felt *= _ALREADY_SAID
    return felt


def inner_lines(session, mind, as_of_episode=None):
    """Who this mind IS about the world: each strong Relation rendered
    as one disposition ('orcs tighten their chest before they mean to')
    carrying its raw subject so it can be anchored where the day touches
    it. The luggage, not the receipts. `as_of_episode` is the mind's own
    clock — it weighs fresh experience over stale and rests what the
    prompt just voiced."""
    from app.mind.tables import Relation
    from app.mind.relations import relation_vector
    from app.mind.voice import pack_value
    render_map = pack_value(
        session, getattr(mind, 'game_id', None), 'mind.disposition_render',
        _DISPOSITION_RENDER,
    ) or {}
    rows = (
        session.query(Relation)
        .filter_by(character_id=mind.character_id)
        .all()
    )
    scored = []
    for r in rows:
        vec = relation_vector(r)
        mag = max(abs(v) for v in vec.values())
        if not r.feeling and vec.get('familiarity', 0) < (
                _DISPOSITION_MIN_FAMILIARITY):
            continue
        if r.feeling and mag < _DISPOSITION_MIN_DIM:
            continue
        # The host's own wording wins ('The Prancing Pony'); the
        # humanized slug is the fallback, never the other way round.
        subj = r.display_name or humanize(r.subject.rsplit(':', 1)[-1])
        template = render_map.get(r.feeling)
        if template:
            text = template.format(subj=subj)
        else:
            text = f'{subj} is known ground to them now'
        scored.append((
            _disposition_weight(r, vec, as_of_episode), subj, {
                'id': r.id,
                'subject': r.subject, 'line': text, 'display': subj,
            }))
    scored.sort(key=lambda t: -t[0])
    # 'entity:orcs' and 'tag:entity_type:orcs' render the same 'orcs' —
    # the strongest relation speaks for the subject, the rest stay silent.
    seen, out = set(), []
    for _, subj, d in scored:
        if subj in seen:
            continue
        seen.add(subj)
        out.append(d)
        if len(out) >= _DISPOSITION_MAX_LINES:
            break
    return out


# when.phase → the prompt's three blocks. Single source for every
# beat-placing rule (memory echoes, brief lines, dispositions).
PROMPT_PHASES = {
    'morning': 'morning', 'midday': 'afternoon', 'afternoon': 'afternoon',
    'evening': 'night', 'night': 'night',
}

# A disposition with no anchor still speaks — in the day's emptiest hour,
# camp by preference: the night is where reflection lives.
_REFLECTION_ORDER = ('night', 'afternoon', 'morning')


def disposition_beats(dispositions, items):
    """Route each standing disposition into the phase where the world
    touches it: a Relation speaks in scene, not in preamble, because
    what floats unattached is what the narrator skips. An anchored
    disposition lands in the first phase whose perceived subjects carry
    it; an untouched one waits for the quietest hour."""
    phase_subjects = {p: set() for p in PROMPT_PHASES.values()}
    phase_load = {p: 0 for p in PROMPT_PHASES.values()}
    for item in items or []:
        phase = PROMPT_PHASES.get((item.get('when') or {}).get('phase'))
        if not phase:
            continue
        phase_load[phase] += 1
        phase_subjects[phase] |= set(item.get('subjects') or [])
    quietest = min(
        set(PROMPT_PHASES.values()),
        key=lambda p: (phase_load[p], _REFLECTION_ORDER.index(p)),
    )
    beats = {}
    for d in dispositions:
        phase = next(
            (p for p in ('morning', 'afternoon', 'night')
             if d['subject'] in phase_subjects[p]),
            quietest,
        )
        beats.setdefault(phase, []).append({
            'subject': d.get('display')
                or humanize(d['subject'].rsplit(':', 1)[-1]),
            'line': d['line'],
        })
    return beats


def render_lens(character_name, brief, mood=None, today=None):
    """The Lens as an Episode brief (C35, CONTEXT.md · Lens): only what the
    Character CARRIES IN renders here — the entering mood through its
    cause, open needs with their origin, memories that resonate with the
    whole Episode. What the day does to them is not named here: those
    lines ride inside the phase where they happen (brief_beats), so the
    Lens never names what has not been lived yet. Descriptions arrive
    already worded; the lens never invents."""
    brief = brief or {}
    lines = [f'{character_name} today.']
    focus = brief.get('focus')
    carried, seen = [], set()
    for line in brief.get('carried') or []:
        # Twin memory rows share a desc (C16): one line, read once.
        key = line['text'].strip().lower()
        if key in seen:
            continue
        seen.add(key)
        carried.append(line_text(line, mood, today))
    if carried:
        lines.append('What they carry into this Episode:')
        lines.extend(f'- {t}' for t in carried)
    if focus and focus.get('part') == 'carried':
        lines.append(f'At the centre of this Episode for them: {line_text(focus, mood, today)}')
    elif focus is None:
        lines.append(QUIET_EPISODE)
    if any(re.match(r'^(Yesterday|\d+ days ago|A long while ago) —', t) for t in carried):
        lines.append(AGO_CUE)
    return '\n'.join(lines)


def brief_beats(brief, mood=None, today=None):
    """What the day does to them, by phase (C35): each day line of the
    brief — and a day Focus, marked as the centre — lands in the phase
    block where it happens. Same shape as the C21 memory beats:
    {phase: [{subject, line, focus?}]}."""
    beats = {}
    brief = brief or {}
    focus = brief.get('focus')
    if focus and focus.get('part') == 'day' and focus.get('phase'):
        beats.setdefault(focus['phase'], []).append({
            'subject': None, 'focus': True,
            'line': line_text(focus, mood, today),
        })
    seen = set()
    for line in brief.get('day') or []:
        phase = line.get('phase')
        key = line['text'].strip().lower()
        if not phase or key in seen:
            continue
        seen.add(key)
        beats.setdefault(phase, []).append({
            'subject': line.get('subject'),
            'line': line_text(line, mood, today),
        })
    return beats
