// ============================================================================
// Meal notes (NO AI)
// ----------------------------------------------------------------------------
// Restored to Node as part of the world-voice migration (issue #52): the
// mind-engine Python twin was removed in #54 — this module is the only copy.
// ============================================================================

import { pick } from './text.js';

const MIDDAY_LEADS = [
  'A short halt at midday',
  'The midday halt, taken standing',
  'A pause at the height of the day',
  'The road gives way to a brief midday rest',
];

const EVENING_LEADS = [
  'The evening meal at camp',
  'Supper by the fire',
  'The last meal of the day, taken at camp',
  'Food at camp, once the packs are down',
];

const HUNGRY_MIDDAY = [
  'no midday meal — the satchel offers nothing and the walking goes on unfed',
  'nothing to eat at the midday halt; the belt is drawn a notch tighter',
];

const HUNGRY_EVENING = [
  'no supper at camp — the fire is lit over an empty pot',
  'camp is made without a meal; there is nothing left to cook',
];

const DRY = [
  'nothing to drink; the waterskin is empty',
  'no water to wash it down',
];

function isEmptyMeal(meal) {
  return !meal || (!meal.food && !meal.drink);
}

// Slug → display name fallbacks, identical to the seeded NL pack — the host
// names what was eaten, this only keeps canonical slugs out of the prose.
export const MEAL_NAME_FALLBACK = {
  tavern_meal: 'a hot meal bought at the inn',
  tavern_ale: 'ale and clean water',
  waterskin: 'water from the skin',
  shared_pot: 'a share of the pot at their fire',
};

export function mealLabel(value) {
  if (!value) return value;
  return MEAL_NAME_FALLBACK[value] || value;
}

/** One reference line for a single meal. '' when there is nothing worth telling. */
export function describeMeal(meal, rng = Math.random) {
  if (!meal) return '';

  const isEvening = meal.slot === 'evening';
  const lead = pick(isEvening ? EVENING_LEADS : MIDDAY_LEADS, rng);

  if (isEmptyMeal(meal)) {
    return pick(isEvening ? HUNGRY_EVENING : HUNGRY_MIDDAY, rng);
  }

  const parts = [];
  if (meal.food) {
    parts.push(mealLabel(meal.food));
  } else {
    parts.push(pick(isEvening ? HUNGRY_EVENING : HUNGRY_MIDDAY, rng));
  }
  parts.push(meal.drink ? mealLabel(meal.drink) : pick(DRY, rng));

  const cooked = isEvening && meal.food
    ? ' The fire allows what is eaten to be warmed, if it is worth warming.'
    : '';

  return `${lead}: ${parts.join('; ')}.${cooked}`;
}

/** Reference notes for the day's meals, keyed by the phase block they belong to. */
export function describeMeals(meals = [], rng = Math.random) {
  const bySlot = {};
  for (const meal of meals || []) {
    if (meal && meal.slot) bySlot[meal.slot] = meal;
  }
  return {
    afternoon: describeMeal(bySlot.midday, rng),
    night: describeMeal(bySlot.evening, rng),
  };
}
