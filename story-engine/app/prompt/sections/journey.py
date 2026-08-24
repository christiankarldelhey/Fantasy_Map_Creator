# ============================================================================
# Journey framing sections
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/prompt/sections/journeySection.js.
# ============================================================================
from datetime import datetime

SPRING_MONTHS = [2, 3, 4]
SUMMER_MONTHS = [5, 6, 7]
AUTUMN_MONTHS = [8, 9, 10]


def destination_name(trip_name=None):
    """The journey's destination, taken from the trip name ("Bree to Rivendell")."""
    if not trip_name:
        return 'their destination'
    parts = trip_name.split(' to ')
    return parts[-1] if len(parts) > 1 else trip_name


def _parse_date(date):
    if isinstance(date, datetime):
        return date
    # Accept 'YYYY-MM-DD' or full ISO timestamps; JS `new Date().getMonth()` is 0-indexed.
    text = str(date)[:10]
    return datetime.strptime(text, '%Y-%m-%d')


def season_phrase(date):
    """One sentence placing the day in the year."""
    month = _parse_date(date).month  # 1-indexed here, JS getMonth() is 0-indexed
    js_month = month - 1
    if js_month in SPRING_MONTHS:
        return 'It is spring.'
    if js_month in SUMMER_MONTHS:
        return 'It is summer.'
    if js_month in AUTUMN_MONTHS:
        return 'It is autumn.'
    return 'It is the dead of winter.'


def journey_context_section(destination, previous_day_summary=None):
    """Destination plus (when known) a plain summary of yesterday, for continuity."""
    lines = [f'Ultimate Destination: {destination}']
    if previous_day_summary:
        lines.append(previous_day_summary)
        lines.append("Please use this context to maintain narrative continuity from yesterday's events.")
    return f"=== JOURNEY CONTEXT ===\n{chr(10).join(lines)}\n\n"


def _character_introduction(instructions, destination):
    """The character's own introduction instructions, with the destination filled in."""
    return instructions.replace('their destination', destination).replace('her destination', destination)


def _default_introduction(character_name, destination):
    """Default opening instructions when the character has none of their own."""
    return (
        f"This is the first day and the introduction of the entire journey.\n"
        f"In this chapter, please describe {character_name}'s departure, their motivation, and their strong intention to reach {destination}. "
        f"Let the prose feel like a beginning, with hope or gravity as fits their personality."
    )


def _arrival_instructions(character_name, destination):
    """Closing instructions for the chapter that reaches the destination."""
    return (
        f"This is the final day and the conclusion of the entire journey!\n"
        f"{character_name} has finally reached their ultimate destination: {destination}.\n"
        f"In this chapter, narrate their arrival at {destination}. Give a deep, meaningful reflection on the long path walked, "
        f"the obstacles overcome, and the achievement of their goal. This reflection must be highly aligned with and expressive "
        f"of {character_name}'s personality, bio, and background."
    )


def special_instructions_section(day_number, is_last_day, character_name, destination, introduction_instructions=None):
    """Special instructions for the first and last chapters ('' for the days between)."""
    if day_number == 1:
        body = (
            _character_introduction(introduction_instructions, destination)
            if introduction_instructions
            else _default_introduction(character_name, destination)
        )
        return f'=== SPECIAL INSTRUCTIONS (INTRODUCTION) ===\n{body}\n\n'

    if is_last_day:
        return f"=== SPECIAL INSTRUCTIONS (THE JOURNEY'S END) ===\n{_arrival_instructions(character_name, destination)}\n\n"

    return ''


def previous_day_summary(previous_day):
    """Plain, non-AI summary of the previous day, used for narrative continuity."""
    def names(list_, fallback):
        joined = ', '.join(item.get('name') for item in (list_ or []) if item and item.get('name'))
        return joined or fallback

    regions = names(previous_day.get('regions'), 'unknown lands')
    locations = names(previous_day.get('locations'), 'no major settlements')
    encounters = names(
        [e.get('entity') for e in (previous_day.get('encounters') or [])],
        'no major encounters',
    )

    return f"In Chapter {previous_day.get('day_number')} (yesterday), the traveller journeyed through: {regions}. They passed near: {locations}. Notable encounters/sights: {encounters}."
