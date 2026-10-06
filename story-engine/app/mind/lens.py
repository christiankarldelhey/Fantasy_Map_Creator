# ============================================================================
# Lens + mood — the packet's inner voice
# ----------------------------------------------------------------------------
# The lens is a plain-text template rendered ONCE at episode open from the
# Episode brief (focus.py, C35) — already-worded material, it never invents
# words. Stored on the episode so re-open replays the same snapshot.
#
# Mood: importance-weighted mean valence of the perceived events, arousal
# from severity; the dominant label resolves through the editable NL table
# nl_bands(table='mood'). The episode's mood blends into the brain's
# running mood (half-life of one episode).
# ============================================================================
import re
from datetime import date

from app.mind.nl_resolver import band_phrase
from app.mind.provisioning import DEFAULT_WIRING

MOOD_TABLE = 'mood'
MOOD_BLEND = 0.5


def _weighted_mean(items, key):
    total_w = sum(i.get('salience') or 0.0 for i in items)
    if total_w <= 0:
        return 0.0
    return (
        sum((i.get(key) or 0.0) * (i.get('salience') or 0.0) for i in items)
        / total_w
    )


def episode_mood(session, game_id, perceived_day, brain=None, needs=None):
    """What this episode felt like: weighted by how much each event
    mattered (salience), then weighed down by open needs — the body's
    own voice, urgency-scaled. dominant via the editable 'mood' band."""
    items = perceived_day or []
    valence = _weighted_mean(items, 'valence')
    arousal = _weighted_mean(items, 'severity')
    pressure = 0.0
    if needs:
        w = {**DEFAULT_WIRING, **((brain.wiring if brain else None) or {})}
        scale = w.get('need_affect_scale', 0.3)
        cap = w.get('need_affect_cap', 0.4)
        pressure = min(cap, sum((n.urgency or 0.0) * scale for n in needs))
        valence = max(-1.0, valence - pressure)
    dominant = band_phrase(
        session, game_id, MOOD_TABLE, valence, brain=brain
    ) or 'neutral'
    return {
        'valence': round(valence, 3),
        'arousal': round(arousal, 3),
        'dominant': dominant,
        'need_pressure': round(pressure, 3),
    }


MOOD_CAUSE_MIN_WEIGHT = 0.15
MOOD_CAUSE_MIN_VALENCE = 0.1


def mood_cause(perceived_day, needs=None):
    """What moved the mood most this episode: the perceived item (or open
    need) with the largest |valence| × salience. The Mood is told through
    its cause, never as a bare label — this is that cause, already worded."""
    best, best_w = None, MOOD_CAUSE_MIN_WEIGHT
    for p in perceived_day or []:
        if p.get('type') == 'need' or not p.get('reading'):
            continue
        weight = abs(p.get('valence') or 0.0) * (p.get('salience') or 0.0)
        if weight > best_w:
            best = {
                'reading': p['reading'], 'valence': p.get('valence') or 0.0,
                # Contact tags let the brief connect the carried mood to
                # today's Focus (orc tracks yesterday, orcs today).
                'tags': [
                    t for t in (p.get('tags') or [])
                    if t.startswith(('entity:', 'tag:entity_type:', 'tag:form:'))
                ],
            }
            best_w = weight
    for n in needs or []:
        desc = getattr(n, 'desc', None) or getattr(n, 'description', None)
        weight = getattr(n, 'urgency', 0.0) or 0.0
        if desc and weight > best_w:
            best = {'reading': desc, 'valence': -weight}
            best_w = weight
    return best


def update_brain_mood(session, game_id, brain, ep_mood, cause=None,
                      when=None):
    """The running mood absorbs the episode's mood; dominant re-resolves
    on the blended valence. Under real need pressure the present weighs
    more (C24): a starving body does not blend away into 'steady' —
    the day's need IS the mood. `cause` (mood_cause) replaces the carried
    one when the episode had one; a mood that settles near neutral lets
    its cause go — nothing weighs any more."""
    pressure = ep_mood.get('need_pressure') or 0.0
    blend = min(0.9, MOOD_BLEND + pressure)
    prior = brain.mood or {}
    valence = (
        (prior.get('valence') or 0.0) * (1 - blend)
        + ep_mood['valence'] * blend
    )
    arousal = (
        (prior.get('arousal') or 0.0) * (1 - blend)
        + ep_mood['arousal'] * blend
    )
    dominant = band_phrase(
        session, game_id, MOOD_TABLE, valence, brain=brain
    ) or 'neutral'
    carried = prior.get('cause')
    if cause:
        carried = {**cause, 'date': when.isoformat() if when else None}
    # A cause must explain the mood it rides with: none once the mood
    # settles near neutral, none if the blend flipped past its sign.
    if abs(valence) < MOOD_CAUSE_MIN_VALENCE or (
        carried and (carried.get('valence') or 0.0) * valence < 0
    ):
        carried = None
    brain.mood = {
        'valence': round(valence, 3),
        'arousal': round(arousal, 3),
        'dominant': dominant,
        'cause': carried,
    }
    return brain.mood


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
