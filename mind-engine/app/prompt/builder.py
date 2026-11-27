# ============================================================================
# Prompt builder (NO AI)
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/prompt/index.js. Assembles the
# narrator prompt for one day. Every block of text comes from a named section;
# every world word arrives already verbalized in day.world_notes (#52) —
# the engine lays out prose, it never phrases world numbers.
#
# ADR-0019: the day reaches the narrator as ONE chronological skeleton —
# === TODAY === — not three labelled phase blocks to reorder. Clock hours
# are spoken as natural time, weather is told once and re-told only on
# change, and the day opens where last night was spent.
# ============================================================================
import re

from app.day_phases import (
    DAWN_HOUR, clock_hour, implied_hour, phase_for_hour)
from app.mind.events import flat_data, wake_anchor
from app.prompt.sections.anti_repetition import closing_instruction
from app.prompt.sections.character import (
    character_header_section, character_name, mind_today_section,
    narrator_lens_section)
from app.prompt.sections.climate import climate_state_section
from app.prompt.sections.instructions import (
    ENCOUNTER_RULES,
    LAND_NOTES_RULES,
    SPANISH_INSTRUCTION,
    chapter_rules_section,
    road_intro,
)
from app.prompt.sections.journey import destination_name, journey_context_section, season_phrase, special_instructions_section
from app.prompt.sections.terminal_day import end_state_section, terminal_closing_instruction, terminal_notice_section, terminal_road_intro
from app.prompt.sections.timeline import timeline_section
from app.prompt.system_prompt import SYSTEM_PROMPT


_PHASES = ('morning', 'afternoon', 'night')


def _beat(phase, hour, kind, **fields):
    return {'phase': phase or 'night', 'hour': hour, 'kind': kind, **fields}


def _as_list(value):
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def _slug_display(slug):
    """A wire slug ('talath_muil') as a display-comparable name ('talath
    muil') — subject matching lowercases both sides."""
    if not slug or not isinstance(slug, str):
        return None
    slug = slug.split(':', 1)[-1]
    return slug.replace('_', ' ').replace('-', ' ') or None


def _event_beats(events, is_terminal):
    """One beat per event, tagged with its clock position (ADR-0019).
    Land-contact events ride the wire under the 'land' umbrella keyed by
    data.subtype (toEvents.js); encounters arrive through the encounters
    channel, and readings-less events (bare interactions) carry nothing
    the narrator can lay out."""
    beats = []
    for idx, event in enumerate(events or []):
        when = event.get('when') or {}
        phase = when.get('phase')
        if is_terminal and phase == 'night':
            continue
        if event.get('type') == 'encounter':
            continue
        data = flat_data(event)
        reading = (data.get('reading')) or ''
        if not reading:
            continue
        # Only encounters carry when.hour today; land, meal and climate
        # events recover their clock position from the time phrase the
        # reading already contains (implied_hour — sort only).
        hour = clock_hour(when.get('hour'))
        if hour is None:
            hour = implied_hour(reading)
        if phase is None:
            # Untimed event (e.g. the road's day-character): it opens the
            # day — the old 'night' default dumped it after supper.
            phase = (
                phase_for_hour(hour) if hour is not None else 'morning')
            hour = hour if hour is not None else DAWN_HOUR - 1
        kind = (
            'wake' if event.get('type') == 'wake'
            else 'weather' if event.get('type') == 'climate'
            else 'note')
        beats.append(_beat(
            phase, hour, kind, text=reading,
            light=when.get('light'),
            # Index into the events list — the perceived day mirrors it
            # 1:1, so an inner line's anchor lands on this beat.
            event_index=idx,
            event_type=event.get('type'),
            subtype=data.get('subtype'),
            # The event's display name — unanchored standing lines match
            # themselves to the beat about their subject.
            subject_name=(
                data.get('name') or data.get('entity_name')
                or data.get('npc_name')
                or _slug_display((event.get('where') or {}).get('place'))
            ),
        ))
    return beats


def _note_beats(wn, is_terminal):
    """The stateless path (no events): world_notes arrive already
    bucketed per phase — the beats keep that order, the timeline still
    reads as one chronological day."""
    beats = []
    for phase in _PHASES:
        if is_terminal and phase == 'night':
            continue
        bucket = lambda key: _as_list((wn.get(key) or {}).get(phase))
        for line in bucket('weather'):
            beats.append(_beat(phase, None, 'weather', text=line))
        # 'ambience' is the resolved ambient voice; 'moments' its name on
        # older payloads (#158).
        for key in ('terrain', 'locations', 'water', 'ambience',
                    'moments', 'meal'):
            for line in bucket(key):
                beats.append(_beat(phase, None, 'note', text=line))
        if phase == 'night':
            for line in _as_list(wn.get('night_lead')) + bucket('camp'):
                beats.append(_beat(phase, None, 'note', text=line))
    return beats


def _encounter_beats(day_encounters, events, is_terminal):
    """Encounters at their clock position. The narrator shape usually
    arrives in day['encounters'] (rebuilt from episode events in
    routes.py); callers that only send events get the same treatment —
    the event carries the same facts flat in data (ADR-0016)."""
    source = day_encounters
    # Each encounter beat keeps its event index (the narrator shape
    # arrives in episode.events order) so an inner line anchored to that
    # event lands inside the encounter's block.
    if source:
        indices = [
            i for i, e in enumerate(events or [])
            if e.get('type') == 'encounter'
        ] if events else []
    else:
        pairs = [
            (i, _encounter_from_event(e))
            for i, e in enumerate(events or [])
            if e.get('type') == 'encounter'
        ]
        pairs = [(i, s) for i, s in pairs if s]
        indices = [i for i, _ in pairs]
        source = [s for _, s in pairs]
    beats = []
    for i, enc in enumerate(source):
        phase = enc.get('phase') or 'night'
        if is_terminal and phase == 'night':
            continue
        hour = clock_hour(enc.get('hour_float'))
        if hour is None:
            hour = clock_hour(enc.get('hour'))
        beats.append(_beat(
            phase, hour, 'encounter',
            encounter=dict(enc, hour=hour),
            event_index=indices[i] if i < len(indices) else None,
        ))
    return beats


def _encounter_from_event(event):
    """Mirror of routes._encounter_prompt_shape for callers that send
    events but no day['encounters']."""
    data = flat_data(event)
    if not any(data.get(k) for k in
               ('entity', 'entity_name', 'reading', 'form', 'outcome')):
        return None
    substance = data.get('substance') or {}
    dialogue = {
        k: v for k, v in {
            'topic': data.get('topic'),
            'npc_attitude': substance.get('attitude'),
            'concrete_content': substance.get('content'),
            'tension': substance.get('tension'),
            'traveller_stance': substance.get('stance'),
        }.items() if v is not None
    }
    when = event.get('when') or {}
    return {
        'phase': when.get('phase'),
        'hour': when.get('hour'),
        'light': when.get('light'),
        'region': (event.get('where') or {}).get('region'),
        'entity': {
            'name': (data.get('npc_name') or data.get('entity_name')
                     or data.get('entity')),
            'type': data.get('entity_type'),
        },
        'interaction': {
            'form': data.get('form'),
            'prose_hint': data.get('prose_hint'),
            'outcome': data.get('outcome'),
            'dialogue_content': dialogue or None,
        },
    }


def _echo_is_redundant(echo, encounter):
    """An echo that restates this encounter's own substance is the world
    narrating itself — entity narration is authored once and reused, so
    a memory of a past 'Sheep Pastures' literally repeats today's seeds.
    Redundant either way: an echo sentence already among the seeds, or
    a seed sentence already inside the echo."""
    interaction = encounter.get('interaction') or {}
    entity = encounter.get('entity') or {}
    seed_text = ' '.join(
        str(v) for v in [
            *(interaction.get('dialogue_content') or {}).values(),
            interaction.get('prose_hint'),
            entity.get('description_summary'),
            entity.get('description'),
        ] if v
    ).lower()
    echo_text = (echo or '').lower()
    split = lambda t: [
        s.rstrip('.') for s in re.split(r'(?<=[.!?])\s+', t) if len(s) > 25
    ]
    return any(
        s in seed_text for s in split(echo_text)
    ) or any(
        s in echo_text for s in split(seed_text)
    )


def _attach(beat, stir):
    """A stirred line joins the beat that woke it — nothing floats. A
    memory or standing feeling inside an encounter speaks in its echo
    slot ('may inform the reply'); anything else — and whatever the echo
    slot can't hold — indents under the beat as an evoked line. A line
    that merely restates the beat's own words is consumed silently."""
    line = stir['line']
    if beat.get('kind') == 'encounter':
        enc = beat['encounter']
        if _echo_is_redundant(line, enc):
            return  # the encounter's own seeds already say it
        if 'echo' not in enc and stir.get('kind') in (
                'memory', 'disposition', None):
            enc['echo'] = line
            return
        beat.setdefault('evoked', []).append(line)
        return
    text = (beat.get('text') or '').strip().lower()
    line_l = line.strip().lower()
    if (text and (line_l in text or text in line_l)
            and not stir.get('focus')):
        return  # the beat already says it — placing it would repeat it
    beat.setdefault('evoked', []).append(line)


_EVENT_REF = re.compile(r'event:(\d+)')

# A need rides the event that IS its domain: hunger speaks at the first
# meal, the weather complaint under the day's first weather. Matched on
# the beat's event type or land/ambience subtype.
_NEED_DOMAIN = {
    'hunger': ('meal',),
    'thirst': ('meal', 'water'),
    'cold': ('climate', 'climate_state'),
    'exposure': ('climate', 'climate_state'),
    'gloom': ('climate', 'climate_state'),
    'wet': ('climate', 'climate_state'),
    'shelter': ('climate', 'climate_state', 'rest'),
}

# Body-needs that answer to no event of the day — they open the day at
# the wake: how the night left them, the borrowed strength, the pain.
# Unmapped keys go to the wake too ('de otra categoria'), as does any
# need past its urgency line (dying of hunger speaks at dawn, not
# only at the next meal).
_WAKE_NEEDS = {'exhaustion', 'unrest', 'sick', 'sickness', 'pain'}


def _stir_beats(memory_beats, note_beats, encounter_beats, is_terminal,
                wake_beat=None):
    """What each part of the day stirs (C21/C35): a line the day evoked
    rides INSIDE the event that woke it — nothing floats unattached.
    Anchored lines land on their own beat; subject-named lines join the
    beat about their subject (same phase first, then anywhere in the
    day). A need joins the FIRST event of its domain — hunger at the
    first meal, the weather complaint at the day's first weather; a
    need past its urgency line, a body-need, or one of no day's
    category opens the day at the wake instead. Turn/shade/focus close
    their own phase; a line anchored to a moment the skeleton never
    rendered still belongs inside that phase's last beat. Everything
    else — unanchored memories, dispositions, musings — stays silent."""
    all_beats = (note_beats or []) + (encounter_beats or [])
    indexed = {
        b['event_index']: b for b in all_beats
        if b.get('event_index') is not None
    }
    wake = wake_beat or next(
        (b for b in all_beats if b.get('kind') == 'wake'), None)
    synthesized = []

    def wake_target():
        nonlocal wake
        if wake is None:
            wake = _beat(
                'morning', DAWN_HOUR - 2, 'wake', text='They wake.')
            synthesized.append(wake)
        return wake

    def order(b):
        ph = b.get('phase') or 'night'
        return (
            _PHASES.index(ph) if ph in _PHASES else len(_PHASES),
            b.get('hour') if b.get('hour') is not None else 99,
        )

    ordered = sorted(all_beats, key=order)
    day_last = ordered[-1] if ordered else None

    def phase_last(phase):
        bs = [b for b in ordered if b.get('phase') == phase]
        return bs[-1] if bs else None

    def domain_beat(key, phase):
        domain = _NEED_DOMAIN.get(key)
        if not domain:
            return None
        matches = [
            b for b in ordered
            if b.get('event_type') in domain or b.get('subtype') in domain
        ]
        # The day's first event of the domain — same phase preferred for
        # a need born in it, then the first match of the day.
        same = [b for b in matches if b.get('phase') == phase]
        return (same or matches or [None])[0]

    def place(stir, phase):
        if stir.get('focus'):
            stir = dict(
                stir, line=f"(the day's centre) {stir['line']}")
        subj = (stir.get('subject') or '').lower().replace('-', ' ')
        anchor = stir.get('anchor')
        if anchor is None:
            m = _EVENT_REF.match(str(stir.get('connects_to') or ''))
            anchor = int(m.group(1)) if m else None
        if anchor is not None and anchor in indexed:
            _attach(indexed[anchor], stir)
            return
        target = None
        if subj:
            same_phase = [b for b in all_beats if b.get('phase') == phase]
            for b in same_phase + all_beats:
                if b.get('kind') == 'encounter':
                    name = ((b['encounter'].get('entity') or {})
                            .get('name') or '').lower()
                    hay = name
                else:
                    name = (b.get('subject_name') or '').lower()
                    # The beat that mentions the subject IS the
                    # subject's event — the meal beat names the
                    # ration even when it carries no name field.
                    hay = f'{name} {(b.get("text") or "").lower()}'
                hay = hay.replace('-', ' ')
                if name and (subj in name or name in subj):
                    target = b
                    break
                if subj and subj in hay:
                    target = b
                    break
        kind = stir.get('kind')
        if target is None and anchor is not None:
            # Woke at a real moment the skeleton never rendered —
            # it still belongs inside that part of the day.
            target = phase_last(phase) or day_last
        elif target is None and kind == 'need':
            key = stir.get('key')
            if (stir.get('urgent') or key in _WAKE_NEEDS
                    or key not in _NEED_DOMAIN):
                target = wake_target()
            else:
                target = (domain_beat(key, phase)
                          or wake_target())
            target = target or phase_last(phase) or day_last
        elif target is None and (
                kind in ('turn', 'shade') or stir.get('focus')):
            target = phase_last(phase) or day_last
        if target is not None:
            _attach(target, stir)

    for phase in _PHASES:
        if is_terminal and phase == 'night':
            continue
        for stir in (memory_beats or {}).get(phase) or []:
            place(stir, phase)
    # What the body still carries was not born today — it speaks in
    # scene anyway: under the first event of its domain, or at the
    # wake when no event answers to it.
    for stir in (memory_beats or {}).get('carried') or []:
        place(stir, None)
    return synthesized


def build_day_prompt(
    day,
    trip=None,
    character=None,
    language='english',
    previous_day=None,
    previous_rest=None,
    fate=None,
    climate_state_block='',
    mind_block='',
    memory_beats=None,
    world_notes=None,
    events=None,
):
    trip = trip or {}
    character = character or {}
    # World voice (#52): the world arrives already verbalized — either as
    # events' readings (episode path) or as world_notes (stateless path).
    # The engine lays out the host's prose and never phrases numbers.
    wn = world_notes if world_notes is not None else (day.get('world_notes') or {})

    char_name = character_name(character)
    destination = destination_name(trip.get('name'))
    # A non-living fate means the character dies today: no night, and the
    # chapter must close on the death.
    is_terminal = bool(fate and fate != 'living')

    encounter_beats = _encounter_beats(
        day.get('encounters'), events, is_terminal)
    note_beats = (
        _event_beats(events, is_terminal)
        if events is not None
        else _note_beats(wn, is_terminal)
    )
    # The wake: the day's first fixed point and the body's report — it
    # names where last night ended (place + rest note when the night
    # earned one) and hosts the needs that answer to no day's event.
    # A real 'wake' event (episode path) IS the beat; the stateless
    # path synthesizes the same beat from `previous_rest`.
    wake_beat = next(
        (b for b in note_beats if b.get('event_type') == 'wake'), None)
    synthetic_wake = None
    if wake_beat is None and previous_rest:
        synthetic_wake = _beat(
            'morning', DAWN_HOUR - 2, 'wake',
            text=(f'The day begins where last night ended — '
                  f'{wake_anchor(previous_rest)}'),
        )
        wake_beat = synthetic_wake
    beats = (
        ([synthetic_wake] if synthetic_wake else [])
        + note_beats + encounter_beats
        + _stir_beats(
            memory_beats, note_beats, encounter_beats, is_terminal,
            wake_beat=wake_beat)
    )

    intro = (
        terminal_road_intro(day.get('day_number'), char_name)
        if is_terminal else
        f"{road_intro(day.get('day_number'))} {season_phrase(day.get('date'))}"
    )
    timeline = timeline_section(
        intro=intro, beats=beats,
        daylight=day.get('daylight'))

    # When a mind is driving, the lens already voices the body's condition
    # (needs + mood) — rendering TRAVELLER'S CONDITION too would narrate
    # the same state twice in two registers. The mind rides INSIDE the
    # lens (C17): one block of who they are and how they are today.
    condition = '' if mind_block else (wn.get('condition') or '')
    # Standing material rides the system prompt: voice and style, who the
    # character IS (header + authored lens), and the rules that hold for
    # every chapter — the user prompt is left to the day alone.
    system = (
        f"{SYSTEM_PROMPT}\n\n"
        f"{character_header_section(character)}"
        f"{narrator_lens_section(character)}"
        f"{LAND_NOTES_RULES}\n\n"
        f"{ENCOUNTER_RULES}\n\n"
        f"{SPANISH_INSTRUCTION if language == 'spanish' else ''}"
    )
    user = (
        f"{mind_today_section(mind_block, character)}"
        f"{condition}"
        f"{wn.get('equipage') or ''}"
        # The end is the fate's, not a shipped block: non-living fates
        # name their own last word (was narration_notes' end_state).
        f"{end_state_section(fate, char_name)}"
        # With a mind driving, yesterday's continuity lives in the lens
        # ('Yesterday, as they remember it', C22) — the host summary would
        # state the same day twice, once as fact and once as memory. The
        # destination stays: the goal is world-truth, not recollection.
        f"{journey_context_section(destination) if mind_block else (wn.get('journey_context') or journey_context_section(destination, previous_day))}"
        f"{special_instructions_section(day.get('day_number'), bool(day.get('is_last_day')), char_name, destination, character.get('introduction_instructions'))}"
        f"{climate_state_section(climate_state_block)}"
        f"{terminal_notice_section(char_name) if is_terminal else ''}"
        f"{wn.get('lands') or ''}"
        f"{chr(10) * 2 if wn.get('lands') else ''}"
        f"{timeline}\n\n"
        f"{chapter_rules_section([(b.get('encounter') or {}).get('entity', {}).get('name') for b in beats if b.get('kind') == 'encounter'], terminal_closing_instruction(char_name) if is_terminal else closing_instruction(day.get('day_number')), any('(a memory' in ev for b in beats for ev in b.get('evoked') or []))}"
    )

    return {'system': system, 'user': user}
