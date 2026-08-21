// ============================================================================
// Meal notes (NO AI)
// ----------------------------------------------------------------------------
// Turns the day's resolved meals into reference notes for the narrator. Two
// meals are taken each day: a midday halt on the road and an evening meal at
// camp. The notes say WHAT was eaten and drunk, never how much, and never a
// number — the narrator renders them in its own words.
//
// A meal looks like:
//   { slot: 'midday'|'evening', food: string|null, drink: string|null, slug }
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

/** True when the meal produced neither food nor drink. */
function isEmptyMeal(meal) {
  return !meal || (!meal.food && !meal.drink);
}

/**
 * One reference line for a single meal.
 * @param {Object|null} meal - { slot, food, drink, slug }
 * @param {() => number} [rng]
 * @returns {string} '' when there is nothing worth telling
 */
export function describeMeal(meal, rng = Math.random) {
  if (!meal) return '';

  const isEvening = meal.slot === 'evening';
  const lead = pick(isEvening ? EVENING_LEADS : MIDDAY_LEADS, rng);

  if (isEmptyMeal(meal)) {
    return pick(isEvening ? HUNGRY_EVENING : HUNGRY_MIDDAY, rng);
  }

  const parts = [];
  if (meal.food) {
    parts.push(meal.food);
  } else {
    parts.push(pick(isEvening ? HUNGRY_EVENING : HUNGRY_MIDDAY, rng));
  }
  parts.push(meal.drink ? meal.drink : pick(DRY, rng));

  const cooked = isEvening && meal.food
    ? ' The fire allows what is eaten to be warmed, if it is worth warming.'
    : '';

  return `${lead}: ${parts.join('; ')}.${cooked}`;
}

/**
 * Reference notes for the day's meals, keyed by the phase block they belong to.
 * The midday halt belongs to the AFTERNOON block, supper to NIGHT AT CAMP.
 * @param {Array<Object>} meals - resolved meals from resolveDailyMeals
 * @param {() => number} [rng]
 * @returns {{ afternoon: string, night: string }}
 */
export function describeMeals(meals = [], rng = Math.random) {
  const bySlot = {};
  for (const meal of meals || []) {
    if (meal?.slot) bySlot[meal.slot] = meal;
  }
  return {
    afternoon: describeMeal(bySlot.midday, rng),
    night: describeMeal(bySlot.evening, rng),
  };
}
