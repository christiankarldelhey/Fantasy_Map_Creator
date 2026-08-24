# ============================================================================
# Meal notes (NO AI)
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/naturalLanguage/mealNotes.js.
# ============================================================================
import random

from app.text import pick

MIDDAY_LEADS = [
    'A short halt at midday',
    'The midday halt, taken standing',
    'A pause at the height of the day',
    'The road gives way to a brief midday rest',
]

EVENING_LEADS = [
    'The evening meal at camp',
    'Supper by the fire',
    'The last meal of the day, taken at camp',
    'Food at camp, once the packs are down',
]

HUNGRY_MIDDAY = [
    'no midday meal — the satchel offers nothing and the walking goes on unfed',
    'nothing to eat at the midday halt; the belt is drawn a notch tighter',
]

HUNGRY_EVENING = [
    'no supper at camp — the fire is lit over an empty pot',
    'camp is made without a meal; there is nothing left to cook',
]

DRY = [
    'nothing to drink; the waterskin is empty',
    'no water to wash it down',
]


def _is_empty_meal(meal):
    """True when the meal produced neither food nor drink."""
    return not meal or (not meal.get('food') and not meal.get('drink'))


def describe_meal(meal, rng=random.random):
    """One reference line for a single meal. '' when there is nothing worth telling."""
    if not meal:
        return ''

    is_evening = meal.get('slot') == 'evening'
    lead = pick(EVENING_LEADS if is_evening else MIDDAY_LEADS, rng)

    if _is_empty_meal(meal):
        return pick(HUNGRY_EVENING if is_evening else HUNGRY_MIDDAY, rng)

    parts = []
    if meal.get('food'):
        parts.append(meal['food'])
    else:
        parts.append(pick(HUNGRY_EVENING if is_evening else HUNGRY_MIDDAY, rng))
    parts.append(meal.get('drink') if meal.get('drink') else pick(DRY, rng))

    cooked = ' The fire allows what is eaten to be warmed, if it is worth warming.' if (is_evening and meal.get('food')) else ''

    return f"{lead}: {'; '.join(parts)}.{cooked}"


def describe_meals(meals=None, rng=random.random):
    """Reference notes for the day's meals, keyed by the phase block they belong to."""
    by_slot = {}
    for meal in (meals or []):
        if meal and meal.get('slot'):
            by_slot[meal['slot']] = meal
    return {
        'afternoon': describe_meal(by_slot.get('midday'), rng),
        'night': describe_meal(by_slot.get('evening'), rng),
    }
