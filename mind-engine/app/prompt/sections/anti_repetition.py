# ============================================================================
# Anti-repetition sections
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/prompt/sections/antiRepetitionSection.js.
# ============================================================================

CLOSING_VARIANTS = [
    'Write the chapter as flowing prose, following the day in its own order. Let each encounter cause something to happen — a decision, a change of route, a cost.',
    'Flowing prose, dawn to night. Each encounter must leave a mark — on the route, on the body, or on what the traveller now knows.',
    'One continuous narrative in the order the day happened. No encounter passes without consequence. The day must end differently than it began.',
    'Prose that follows the day as it unfolded. What happens must cost something. An encounter that resolves without effect is not an encounter — it is scenery.',
]


def _rotate(list_, day_number):
    """Positive modulo, so day 0 or a negative day still lands inside the list."""
    n = day_number if isinstance(day_number, int) else 1
    return list_[((n % len(list_)) + len(list_)) % len(list_)]


def closing_instruction(day_number):
    """The closing instruction for the chapter, rotated per day."""
    return _rotate(CLOSING_VARIANTS, day_number)
