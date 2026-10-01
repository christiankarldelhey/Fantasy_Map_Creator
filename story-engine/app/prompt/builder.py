# ============================================================================
# Prompt builder (NO AI)
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/prompt/index.js. Assembles the
# narrator prompt for one day. Every block of text comes from a named section,
# and all geographic/weather wording comes from the rule-based
# natural_language modules.
# ============================================================================
import random

from app.moon_phase import get_moon_phase
from app.natural_language import (
    collect_climate_notes_by_phase,
    collect_nighttime_conditions,
    describe_meals,
    describe_overnight_location,
    empty_phase_buckets,
    group_by_phase,
    pick_opening_strategy,
    pick_todays_way_in,
)
from app.prompt.sections.anti_repetition import closing_instruction
from app.prompt.sections.character import character_header_section, character_name, narrator_lens_section
from app.prompt.sections.climate import climate_state_section
from app.prompt.sections.day_context import day_context_section
from app.prompt.sections.instructions import (
    ENCOUNTER_RULES,
    LAND_NOTES_RULES,
    OVERNIGHT_COLOUR_NOTE,
    SPANISH_INSTRUCTION,
    road_intro,
    todays_way_in_section,
)
from app.prompt.sections.journey import destination_name, journey_context_section, season_phrase, special_instructions_section
from app.prompt.sections.phase import phase_block
from app.prompt.sections.state_blocks import condition_section, end_state_section, equipment_section
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


def _night_lead(day, rng, nl=None):
    """The camp lead-in for the NIGHT block: where they slept and how the night went."""
    camp = describe_overnight_location(day.get('overnight_location'), day.get('overnight_interaction'), nl=nl)
    conditions = collect_nighttime_conditions(day.get('nighttime_climate'), rng)
    parts = [
        f'Overnight camp:\n{camp}',
        f"Nighttime conditions (reference only):\n{chr(10).join(conditions)}" if conditions else '',
    ]
    return '\n\n'.join(p for p in parts if p)


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
    nl=None,
):
    trip = trip or {}
    character = character or {}

    char_name = character_name(character)
    destination = destination_name(trip.get('name'))
    rng = day.get('rng') or random.random
    # A non-living fate means the character dies today: no camp, and the
    # chapter must close on the death.
    is_terminal = bool(fate and fate != 'living')

    moon = day.get('moon_phase') or get_moon_phase(day.get('date'))
    todays_way_in = pick_todays_way_in(rng)
    opening_strategy = pick_opening_strategy(rng)
    weather_by_phase = collect_climate_notes_by_phase(day.get('climate'), moon, nl)
    biomes_by_phase = group_by_phase(day.get('biomes'))
    locations_by_phase = group_by_phase(day.get('locations'))
    water_by_phase = group_by_phase(day.get('water_crossings'))
    encounter_by_phase = _encounters_by_phase(day.get('encounters'))
    meal_by_phase = describe_meals(day.get('meals'), rng, nl)

    def block_for(title, phase, extra_lead=''):
        return phase_block(
            title=title,
            extra_lead=extra_lead,
            weather=weather_by_phase.get(phase),
            biomes=biomes_by_phase.get(phase),
            locations=locations_by_phase.get(phase),
            water_crossings=water_by_phase.get(phase),
            encounters=encounter_by_phase.get(phase),
            meal=meal_by_phase.get(phase) or '',
            regions=day.get('regions'),
            terrain_phrases=day.get('terrain_phrases'),
            echoes=(memory_beats or {}).get(phase),
            rng=rng,
        )

    # When a mind is driving, the lens already voices the body's condition
    # (needs + mood) — rendering TRAVELLER'S CONDITION too would narrate
    # the same state twice in two registers. The mind rides INSIDE the
    # lens (C17): one block of who they are and how they are today.
    condition = (
        '' if mind_block
        else condition_section(character_state, char_name, nl=nl)
    )
    user = (
        f"{character_header_section(character)}"
        f"{narrator_lens_section(character, mind_block)}"
        f"{condition}"
        f"{equipment_section(equipment_state, nl=nl)}"
        f"{end_state_section(fate, char_name, nl=nl)}"
        # With a mind driving, yesterday's continuity lives in the lens
        # ('Yesterday, as they remember it', C22) — the host summary would
        # state the same day twice, once as fact and once as memory. The
        # destination stays: the goal is world-truth, not recollection.
        f"{journey_context_section(destination, None if mind_block else previous_day, nl=nl)}"
        f"{special_instructions_section(day.get('day_number'), bool(day.get('is_last_day')), char_name, destination, character.get('introduction_instructions'))}"
        f"{climate_state_section(climate_state_block)}"
        f"{terminal_notice_section(char_name) if is_terminal else ''}"
        f"{LAND_NOTES_RULES}\n\n"
        f"{ENCOUNTER_RULES}\n\n"
        f"{todays_way_in_section(todays_way_in, opening_strategy, char_name)}\n\n"
        f"=== TODAY'S ROAD ===\n"
        f"{terminal_road_intro(day.get('day_number'), char_name) if is_terminal else road_intro(day.get('day_number'))} {season_phrase(day.get('date'))}\n\n"
        f"{day_context_section(day.get('regions'), day.get('road_types'), day.get('terrain_phrases'), day.get('elevation_profile'), rng)}\n\n"
        f"{block_for('MORNING', 'morning')}\n\n"
        f"{block_for('AFTERNOON', 'afternoon')}\n\n"
        f"{'' if is_terminal else block_for('NIGHT AT CAMP', 'night', _night_lead(day, rng, nl))}\n\n"
        f"{terminal_closing_instruction(char_name) if is_terminal else closing_instruction(day.get('day_number'))}\n"
        f"{'' if is_terminal else OVERNIGHT_COLOUR_NOTE}\n\n"
        f"{SPANISH_INSTRUCTION if language == 'spanish' else ''}"
    )

    return {'system': SYSTEM_PROMPT, 'user': user}
