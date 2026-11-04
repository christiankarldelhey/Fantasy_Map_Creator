# ============================================================================
# Prompt builder (NO AI)
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/prompt/index.js. Assembles the
# narrator prompt for one day. Every block of text comes from a named section;
# every world word arrives already verbalized in day.world_notes (#52) —
# the engine lays out prose, it never phrases world numbers.
# ============================================================================
import random

from app.day_phases import empty_phase_buckets
from app.prompt.sections.anti_repetition import closing_instruction
from app.prompt.sections.character import character_header_section, character_name, narrator_lens_section
from app.prompt.sections.climate import climate_state_section
from app.prompt.sections.instructions import (
    ENCOUNTER_RULES,
    LAND_NOTES_RULES,
    OVERNIGHT_COLOUR_NOTE,
    SPANISH_INSTRUCTION,
    pick_opening_strategy,
    pick_todays_way_in,
    road_intro,
    todays_way_in_section,
)
from app.prompt.sections.journey import destination_name, journey_context_section, season_phrase, special_instructions_section
from app.prompt.sections.phase import phase_block
from app.prompt.sections.terminal_day import terminal_closing_instruction, terminal_notice_section, terminal_road_intro
from app.prompt.system_prompt import SYSTEM_PROMPT


def _encounters_by_phase(encounters):
    """Group the day's encounters into the three narrative phases."""
    buckets = empty_phase_buckets()
    for encounter in (encounters or []):
        phase = encounter.get('phase') or 'night'
        if phase in buckets:
            buckets[phase].append(encounter)
    return buckets


def build_day_prompt(
    day,
    trip=None,
    character=None,
    language='english',
    previous_day=None,
    character_state=None,
    equipment_state=None,
    fate=None,
    climate_state_block='',
    mind_block='',
    memory_beats=None,
    world_notes=None,
):
    trip = trip or {}
    character = character or {}
    # World voice (#52): the day arrives already verbalized — the engine
    # lays out the host's prose and never phrases the world itself.
    wn = world_notes if world_notes is not None else (day.get('world_notes') or {})

    char_name = character_name(character)
    destination = destination_name(trip.get('name'))
    rng = day.get('rng') or random.random
    # A non-living fate means the character dies today: no camp, and the
    # chapter must close on the death.
    is_terminal = bool(fate and fate != 'living')

    todays_way_in = pick_todays_way_in(rng)
    opening_strategy = pick_opening_strategy(rng)
    weather_by_phase = wn.get('weather') or {}
    encounter_by_phase = _encounters_by_phase(day.get('encounters'))
    meal_by_phase = wn.get('meals') or {}
    wn_terrain = wn.get('terrain') or {}
    wn_locations = wn.get('locations') or {}
    wn_water = wn.get('water') or {}

    def block_for(title, phase, extra_lead=''):
        return phase_block(
            title=title,
            extra_lead=extra_lead,
            weather=weather_by_phase.get(phase),
            encounters=encounter_by_phase.get(phase),
            meal=meal_by_phase.get(phase) or '',
            echoes=(memory_beats or {}).get(phase),
            terrain_notes=wn_terrain.get(phase),
            location_notes=wn_locations.get(phase),
            water_notes=wn_water.get(phase),
        )

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
        f"{todays_way_in_section(todays_way_in, opening_strategy, char_name)}\n\n"
        f"=== TODAY'S ROAD ===\n"
        f"{terminal_road_intro(day.get('day_number'), char_name) if is_terminal else road_intro(day.get('day_number'))} {season_phrase(day.get('date'))}\n\n"
        f"{wn.get('lands') or ''}\n\n"
        f"{block_for('MORNING', 'morning')}\n\n"
        f"{block_for('AFTERNOON', 'afternoon')}\n\n"
        f"{'' if is_terminal else block_for('NIGHT AT CAMP', 'night', wn.get('night_lead') or '')}\n\n"
        f"{terminal_closing_instruction(char_name) if is_terminal else closing_instruction(day.get('day_number'))}\n"
        f"{'' if is_terminal else OVERNIGHT_COLOUR_NOTE}\n\n"
        f"{SPANISH_INSTRUCTION if language == 'spanish' else ''}"
    )

    return {'system': SYSTEM_PROMPT, 'user': user}
