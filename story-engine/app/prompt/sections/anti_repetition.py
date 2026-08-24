# ============================================================================
# Anti-repetition sections
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/prompt/sections/antiRepetitionSection.js.
# ============================================================================

CLOSING_VARIANTS = [
    'Write the chapter as flowing prose in three movements. Let each encounter cause something to happen — a decision, a change of route, a cost.',
    'Three movements: morning, afternoon, night. Each encounter must leave a mark — on the route, on the body, or on what the traveller now knows.',
    'Prose in three movements. No encounter passes without consequence. The day must end differently than it began.',
    'Three prose movements. What happens must cost something. An encounter that resolves without effect is not an encounter — it is scenery.',
]


def _rotate(list_, day_number):
    """Positive modulo, so day 0 or a negative day still lands inside the list."""
    n = day_number if isinstance(day_number, int) else 1
    return list_[((n % len(list_)) + len(list_)) % len(list_)]


def banned_phrases_section(banned_phrases):
    """The avoid-list of over-used phrases ('' when there is nothing to avoid)."""
    if not isinstance(banned_phrases, list) or len(banned_phrases) == 0:
        return ''
    phrase_list = ', '.join(f'"{p}"' for p in banned_phrases)
    return f'=== AVOID THESE PHRASES ===\nThese phrases (and close variants) were already used in earlier chapters. Do not reuse them; find fresh wording: {phrase_list}.\n\n'


def closing_instruction(day_number):
    """The closing instruction for the chapter, rotated per day."""
    return _rotate(CLOSING_VARIANTS, day_number)
