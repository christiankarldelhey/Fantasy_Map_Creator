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
from app.prompt.sections.anti_repetition import banned_phrases_section, closing_instruction
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


def _night_lead(day, rng):
    """The camp lead-in for the NIGHT block: where they slept and how the night went."""
    camp = describe_overnight_location(day.get('overnight_location'), day.get('overnight_interaction'))
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
    previous_day_summary=None,
    condition_block='',
    equipment_block='',
    end_state_block='',
    climate_state_block='',
    banned_phrases=None,
    previous_openings=None,
):
    trip = trip or {}
    character = character or {}
    banned_phrases = banned_phrases or []
    previous_openings = previous_openings or []

    char_name = character_name(character)
    destination = destination_name(trip.get('name'))
    rng = day.get('rng') or random.random
    # A non-empty end-state block means the character dies today: no camp, and the
    # chapter must close on the death.
    is_terminal = bool(end_state_block)

    moon = day.get('moon_phase') or get_moon_phase(day.get('date'))
    todays_way_in = pick_todays_way_in(rng)
    opening_strategy = pick_opening_strategy(rng)
    weather_by_phase = collect_climate_notes_by_phase(day.get('climate'), moon)
    biomes_by_phase = group_by_phase(day.get('biomes'))
    locations_by_phase = group_by_phase(day.get('locations'))
    water_by_phase = group_by_phase(day.get('water_crossings'))
    encounter_by_phase = _encounters_by_phase(day.get('encounters'))
    meal_by_phase = describe_meals(day.get('meals'), rng)

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
            rng=rng,
        )

    user = (
        f"{character_header_section(character)}"
        f"{narrator_lens_section(character)}"
        f"{condition_block}"
        f"{equipment_block}"
        f"{end_state_block}"
        f"{journey_context_section(destination, previous_day_summary)}"
        f"{special_instructions_section(day.get('day_number'), bool(day.get('is_last_day')), char_name, destination, character.get('introduction_instructions'))}"
        f"{climate_state_section(climate_state_block)}"
        f"{banned_phrases_section(banned_phrases)}"
        f"{terminal_notice_section(char_name) if is_terminal else ''}"
        f"{LAND_NOTES_RULES}\n\n"
        f"{ENCOUNTER_RULES}\n\n"
        f"{todays_way_in_section(todays_way_in, opening_strategy, char_name, previous_openings)}\n\n"
        f"=== TODAY'S ROAD ===\n"
        f"{terminal_road_intro(day.get('day_number'), char_name) if is_terminal else road_intro(day.get('day_number'))} {season_phrase(day.get('date'))}\n\n"
        f"{day_context_section(day.get('regions'), day.get('road_types'), day.get('terrain_phrases'), day.get('elevation_profile'), rng)}\n\n"
        f"{block_for('MORNING', 'morning')}\n\n"
        f"{block_for('AFTERNOON', 'afternoon')}\n\n"
        f"{'' if is_terminal else block_for('NIGHT AT CAMP', 'night', _night_lead(day, rng))}\n\n"
        f"{terminal_closing_instruction(char_name) if is_terminal else closing_instruction(day.get('day_number'))}\n"
        f"{'' if is_terminal else OVERNIGHT_COLOUR_NOTE}\n\n"
        f"{SPANISH_INSTRUCTION if language == 'spanish' else ''}"
    )

    return {'system': SYSTEM_PROMPT, 'user': user}
