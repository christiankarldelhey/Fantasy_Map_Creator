# ============================================================================
# The day as chronology (ADR-0019)
# ----------------------------------------------------------------------------
# ONE === TODAY === section is the day's skeleton: every beat in the order
# it happened — where the traveller woke, each event at its clock position,
# weather told once and re-told only when it changes, encounters stated
# where the timeline puts them. Phase buckets are gone; the lines are not
# a bag of fragments to reorder but the day itself, told in facts.
# ============================================================================
import re

from app.day_phases import day_time_phrase
from app.prompt.sections.encounters import _describe_encounter

_PHASE_ORDER = {'morning': 0, 'afternoon': 1, 'night': 2}
_PHASE_FALLBACK = {
    'morning': 'In the morning',
    'afternoon': 'In the afternoon',
    'night': 'In the night',
}
_NO_HOUR = float('inf')


def _sort_key(beat):
    phase = _PHASE_ORDER.get(beat.get('phase'), 2)
    return (phase, beat.get('hour') if beat.get('hour') is not None else _NO_HOUR)


def _clauses(reading):
    """Weather as a set of stated facts, for change detection."""
    return [
        c.strip(' .') for c in re.split(r',| and ', reading or '')
        if c.strip(' .')
    ]


def _encounter_beat(encounter):
    """The encounter at its clock position — mechanics verbatim, time as
    a natural phrase ('Late in the afternoon —', never '16:00')."""
    when = day_time_phrase(encounter.get('hour')) or _PHASE_FALLBACK.get(
        encounter.get('phase'), 'During the day')
    return f'{when} — an encounter:\n{_describe_encounter(encounter)}'


def _stirs_beat(stirs):
    """What this part of the day stirs (C21/C35): the Focus first, then
    the rest — recollection and inner weather, never present events."""
    focus = next((s for s in stirs if s.get('focus')), None)
    leftovers = [s for s in stirs if s is not focus]
    parts = []
    if focus:
        parts.append(
            'The centre of this Episode for them — this is what the day '
            'turns on; give it the weight and room it deserves:\n'
            f"- {focus['line']}"
        )
    if leftovers:
        parts.append(
            'What this part of the day stirs in them (weave it in as '
            'feeling or recollection where it fits — lines marked "ago" '
            'are memories, never events happening now):\n'
            + '\n'.join(f"- {s['line']}" for s in leftovers)
        )
    return '\n'.join(parts)


def timeline_section(*, intro, beats, previous_rest=None):
    """The === TODAY === skeleton. `beats` carries {phase, hour, kind, ...}
    entries already tagged by the builder; this function only orders,
    deduplicates weather, and phrases time."""
    lines = [f'=== TODAY ===\n{intro}', '']

    if previous_rest:
        first = re.split(r' — |(?<=\.)\s', previous_rest)[0].rstrip('.')
        lines.append(f'The day begins where last night ended — {first}.')

    ordered = sorted(beats, key=_sort_key)
    # The day's sky is the first fact of the morning: the first weather
    # beat opens the skeleton even if it arrived without a clock position.
    first_weather = next(
        (i for i, b in enumerate(ordered) if b.get('kind') == 'weather'),
        None)
    if first_weather:
        ordered.insert(0, ordered.pop(first_weather))

    weather_seen = set()
    weather_told = False
    for beat in ordered:
        kind = beat.get('kind')
        if kind == 'weather':
            clauses = _clauses(beat['text'])
            new = [c for c in clauses if c not in weather_seen]
            weather_seen.update(clauses)
            if not weather_told:
                # first weather of the day — tell it whole
                weather_told = True
                lines.append(beat['text'])
            elif new:
                # only a real shift re-enters the timeline
                lines.append(f"Later — {', '.join(new)}.")
            continue
        if kind == 'encounter':
            lines.append(_encounter_beat(beat['encounter']))
            continue
        if kind == 'stirs':
            text = _stirs_beat(beat['stirs'])
            if text:
                lines.append(text)
            continue
        lines.append(beat['text'])

    lines.append('')
    if any(b.get('kind') == 'encounter' for b in beats):
        lines.append(
            'Encounters today happen where the timeline says — nowhere else.'
        )
    else:
        lines.append(
            'Encounters today: none — no one is met on the road.'
        )
    lines.append(
        'Only the places named exist. The day begins where it says it '
        'begins and ends where it says it ends. Weather already told does '
        'not repeat unless it changes. The lines are the skeleton — '
        'narrate it in order, do not reorder it.'
    )
    return '\n'.join(lines)
