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

from app.day_phases import DAWN_HOUR, implied_hour, phase_for_hour
from app.prompt.sections.anti_repetition import closing_instruction
from app.prompt.sections.character import character_header_section, character_name, narrator_lens_section
from app.prompt.sections.climate import climate_state_section
from app.prompt.sections.instructions import (
    ENCOUNTER_RULES,
    LAND_NOTES_RULES,
    OVERNIGHT_COLOUR_NOTE,
    SPANISH_INSTRUCTION,
    road_intro,
)
from app.prompt.sections.journey import destination_name, journey_context_section, season_phrase, special_instructions_section
from app.prompt.sections.terminal_day import terminal_closing_instruction, terminal_notice_section, terminal_road_intro
from app.prompt.sections.timeline import timeline_section
from app.prompt.system_prompt import SYSTEM_PROMPT


_PHASES = ('morning', 'afternoon', 'night')


def _beat(phase, hour, kind, **fields):
    return {'phase': phase or 'night', 'hour': hour, 'kind': kind, **fields}


def _as_list(value):
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def _event_beats(events, is_terminal):
    """One beat per event, tagged with its clock position (ADR-0019).
    Land-contact events ride the wire under the 'land' umbrella keyed by
    data.subtype (toEvents.js); encounters arrive through the encounters
    channel, and readings-less events (bare interactions) carry nothing
    the narrator can lay out."""
    beats = []
    for event in (events or []):
        when = event.get('when') or {}
        phase = when.get('phase')
        if is_terminal and phase == 'night':
            continue
        if event.get('type') == 'encounter':
            continue
        reading = ((event.get('data') or {}).get('reading')) or ''
        if not reading:
            continue
        # Only encounters carry when.hour today; land, meal and climate
        # events recover their clock position from the time phrase the
        # reading already contains (implied_hour — sort only).
        hour = when.get('hour')
        if hour is None:
            hour = implied_hour(reading)
        if phase is None:
            # Untimed event (e.g. the road's day-character): it opens the
            # day — the old 'night' default dumped it after supper.
            phase = (
                phase_for_hour(hour) if hour is not None else 'morning')
            hour = hour if hour is not None else DAWN_HOUR - 1
        kind = 'weather' if event.get('type') == 'climate' else 'note'
        beats.append(_beat(phase, hour, kind, text=reading))
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
    if not source:
        source = [_encounter_from_event(e) for e in (events or [])
                  if e.get('type') == 'encounter']
        source = [s for s in source if s]
    beats = []
    for enc in source:
        phase = enc.get('phase') or 'night'
        if is_terminal and phase == 'night':
            continue
        hour = enc.get('hour')
        if hour is None:
            hour = enc.get('hour_float')
        beats.append(_beat(phase, hour, 'encounter', encounter=dict(enc)))
    return beats


def _encounter_from_event(event):
    """Mirror of routes._encounter_prompt_shape for callers that send
    events but no day['encounters']."""
    data = event.get('data') or {}
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


def _stir_beats(memory_beats, encounter_beats, is_terminal):
    """What each part of the day stirs (C21/C35): an echo whose subject
    is one of this phase's encounters rides inside that encounter's
    block; the rest form a beat at the end of their own phase."""
    beats = []
    for phase in _PHASES:
        if is_terminal and phase == 'night':
            continue
        stirs = (memory_beats or {}).get(phase) or []
        if not stirs:
            continue
        phase_encounters = [
            b['encounter'] for b in encounter_beats
            if b.get('phase') == phase
        ]
        leftovers = []
        for stir in stirs:
            placed = False
            for enc in phase_encounters:
                name = ((enc.get('entity') or {}).get('name') or '').lower()
                subj = (stir.get('subject') or '').lower()
                # An encounter carries ONE echo inside its block; a second
                # match falls back to the stirs list. An echo that merely
                # restates the encounter's own substance is consumed —
                # placing it anywhere would repeat the same authored text.
                if subj and name and 'echo' not in enc and (
                        subj in name or name in subj):
                    placed = True
                    if not _echo_is_redundant(stir['line'], enc):
                        enc['echo'] = stir['line']
                    break
            if not placed:
                leftovers.append(stir)
        if leftovers:
            beats.append(_beat(phase, None, 'stirs', stirs=leftovers))
    return beats


def build_day_prompt(
    day,
    trip=None,
    character=None,
    language='english',
    previous_day=None,
    previous_rest=None,
    character_state=None,
    equipment_state=None,
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
    beats = note_beats + encounter_beats + _stir_beats(
        memory_beats, encounter_beats, is_terminal)

    intro = (
        terminal_road_intro(day.get('day_number'), char_name)
        if is_terminal else
        f"{road_intro(day.get('day_number'))} {season_phrase(day.get('date'))}"
    )
    timeline = timeline_section(
        intro=intro, beats=beats, previous_rest=previous_rest)

    # When a mind is driving, the lens already voices the body's condition
    # (needs + mood) — rendering TRAVELLER'S CONDITION too would narrate
    # the same state twice in two registers. The mind rides INSIDE the
    # lens (C17): one block of who they are and how they are today.
    condition = '' if mind_block else (wn.get('condition') or '')
    user = (
        f"{character_header_section(character)}"
        f"{narrator_lens_section(character, mind_block)}"
        f"{condition}"
        f"{wn.get('equipage') or ''}"
        f"{wn.get('end_state') or ''}"
        # With a mind driving, yesterday's continuity lives in the lens
        # ('Yesterday, as they remember it', C22) — the host summary would
        # state the same day twice, once as fact and once as memory. The
        # destination stays: the goal is world-truth, not recollection.
        f"{journey_context_section(destination) if mind_block else (wn.get('journey_context') or journey_context_section(destination, previous_day))}"
        f"{special_instructions_section(day.get('day_number'), bool(day.get('is_last_day')), char_name, destination, character.get('introduction_instructions'))}"
        f"{climate_state_section(climate_state_block)}"
        f"{terminal_notice_section(char_name) if is_terminal else ''}"
        f"{LAND_NOTES_RULES}\n\n"
        f"{ENCOUNTER_RULES}\n\n"
        f"{wn.get('lands') or ''}"
        f"{chr(10) * 2 if wn.get('lands') else ''}"
        f"{timeline}\n\n"
        f"{terminal_closing_instruction(char_name) if is_terminal else closing_instruction(day.get('day_number'))}\n"
        f"{'' if is_terminal else OVERNIGHT_COLOUR_NOTE}\n\n"
        f"{SPANISH_INSTRUCTION if language == 'spanish' else ''}"
    )

    return {'system': SYSTEM_PROMPT, 'user': user}
