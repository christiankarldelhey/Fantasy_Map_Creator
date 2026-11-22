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

from app.day_phases import clock_hour, day_time_phrase
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
    hour = clock_hour(beat.get('hour'))
    return (phase, hour if hour is not None else _NO_HOUR)


def _clauses(reading):
    """Weather as a set of stated facts, for change detection."""
    return [
        c.strip(' .') for c in re.split(r',| and ', reading or '')
        if c.strip(' .')
    ]


# The host's solar reading wins over any phrased clock: a 17:42 in
# autumn IS 'night' — 'Late in the afternoon' would light a dark scene.
_LIGHT_PHRASE = {
    'night': 'After dark',
    'dusk': 'Toward dusk',
    'dawn': 'At dawn',
}


def _sentence(text):
    """Every prompt line reads as a line — a leading capital and a
    closing stop, so the skeleton scans as instructions a human can
    read, not a token dump. Lines that open with a marker
    ('(a memory…)') keep their lowercase entry."""
    t = (text or '').strip()
    if not t:
        return t
    if not t.startswith('('):
        t = t[0].upper() + t[1:]
    if t[-1] not in '.!?':
        t += '.'
    return t


def _encounter_beat(encounter, daylight=None, announced=False):
    """The encounter at its clock position — mechanics verbatim, time as
    a natural phrase ('Late in the afternoon —', never '16:00'). When a
    light divider already announced this sky ('— after dark —'), the
    header just says 'Later' — the sky is told once."""
    when = 'Later' if announced else (
        _LIGHT_PHRASE.get(encounter.get('light'))
        or day_time_phrase(encounter.get('hour'), daylight)
        or _PHASE_FALLBACK.get(encounter.get('phase'), 'During the day'))
    return f'{when} — an encounter:\n{_describe_encounter(encounter)}'


# A beat whose prose is silent about light gets a cue — a meal at night,
# a place entered in the dusk. The weather tells its own sky, and a
# reading that already words its light needs no second marker.
_LIGHT_CUE = {
    'night': '(after dark)',
    'dusk': '(in the dusk)',
    'dawn': '(in first light)',
}
_LIGHT_WORDS = (
    'dark', 'dusk', 'dawn', 'night', 'first light', 'sunrise',
    'sunset', 'twilight', 'moon', 'starlight',
)


def _light_cue(beat, announced=False):
    """The inline light marker — '(after dark) Supper by the fire' — for
    a beat whose prose is silent about its sky. `announced` is True when
    a divider already marked this light: the sky is told once, by title
    or by cue, never twice in a row."""
    if announced:
        return ''
    cue = _LIGHT_CUE.get(beat.get('light'))
    text = (beat.get('text') or '').lower()
    if cue and not any(w in text for w in _LIGHT_WORDS):
        return f'{cue} '
    return ''


# The sky's own titles: when the host's declared light changes, the
# turn is marked as a divider between beats — a 17:42 in autumn already
# reads 'night', and the narrator should never guess the dark.
_LIGHT_MARKER = {
    'dawn': '— first light —',
    'day': '— daylight —',
    'dusk': '— dusk falls —',
    'night': '— after dark —',
}
# An opening day sky is told only when it surprises: dawn and daylight
# are the road's default; a day that opens in dusk or night says so.
_OPENING_MARKED = ('dusk', 'night')


def _beat_light(beat):
    """The light a beat carries — on the beat itself, or inside its
    encounter (encounters keep their facts in the encounter dict)."""
    return beat.get('light') or (beat.get('encounter') or {}).get('light')


def timeline_section(*, intro, beats, daylight=None):
    """The === TODAY === skeleton. `beats` carries {phase, hour, kind, ...}
    entries already tagged by the builder; this function only orders,
    deduplicates weather, and phrases time."""
    lines = [f'=== TODAY ===\n{intro}', '']

    ordered = sorted(beats, key=_sort_key)
    # The day's sky is the first fact of the morning: the first weather
    # beat opens the skeleton even if it arrived without a clock position
    # — after the wake, which is the one beat that always opens the day.
    first_weather = next(
        (i for i, b in enumerate(ordered) if b.get('kind') == 'weather'),
        None)
    if first_weather:
        at = 1 if (ordered and ordered[0].get('kind') == 'wake') else 0
        ordered.insert(at, ordered.pop(first_weather))

    weather_seen = set()
    weather_told = False
    sky = None
    announced = set()
    printed = []  # (position in `lines`, text, phase) — dedup by prefix
    for beat in ordered:
        kind = beat.get('kind')
        # A beat that declares a different light first marks the turn.
        light = _beat_light(beat)
        if light and light != sky:
            marker = _LIGHT_MARKER.get(light)
            if marker and (sky is not None or light in _OPENING_MARKED):
                lines.append(marker)
                announced.add(light)
            sky = light
        if kind == 'weather':
            clauses = _clauses(beat['text'])
            new = [c for c in clauses if c not in weather_seen]
            weather_seen.update(clauses)
            if not weather_told:
                # first weather of the day — tell it whole
                weather_told = True
                lines.append(_sentence(beat['text']))
            elif new:
                # only a real shift re-enters the timeline
                lines.append(f"Later — {', '.join(new)}.")
        elif kind == 'encounter':
            lines.append(_encounter_beat(
                beat['encounter'], daylight,
                announced=light in announced))
        else:
            text = _sentence(beat['text'])
            # A night told twice tells once: when a beat's text is a
            # prefix of one already printed in the same phase (or it of
            # this one), the longer version speaks — the same camp's
            # reading in two payloads is one line, not two. A text that
            # merely appears inside another (shared lore across distinct
            # terrain events) is no duplicate — both beats stand.
            dup = next(
                (i for i, (pos, t, ph) in enumerate(printed)
                 if ph == beat.get('phase')
                 and (text.startswith(t) or t.startswith(text))),
                None)
            if dup is not None:
                if len(text) > len(printed[dup][1]):
                    lines[printed[dup][0]] = text
                    printed[dup] = (printed[dup][0], text, printed[dup][2])
                continue
            printed.append((len(lines), text, beat.get('phase')))
            lines.append(
                f"{_light_cue(beat, announced=light in announced)}"
                f"{text}")
        # What this event woke in them rides under its own line — the
        # recollection is part of the moment, not a floating aside.
        for ev in beat.get('evoked') or []:
            lines.append(f'  {_sentence(ev)}')

    # The contract lines (where encounters may land, what exists, the
    # closing instruction) close the prompt under their own title —
    # chapter_rules_section in instructions.py.
    return '\n'.join(lines)
