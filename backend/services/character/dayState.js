// ============================================================================
// Day resolution: one place where a day changes the character
// ----------------------------------------------------------------------------
// Every mechanical effect on the traveller's body and spirit for a single day
// is computed here. If you want to add a new source of energy or shadow cost
// (a blizzard, a curse, a river crossing, a new item effect) this is the file
// that must know about it.
//
// The function receives the generated day, the opening state and the already
// aggregated inventory effects, and returns everything the route needs to
// persist. It does NOT touch the DB; it is pure computation.
// ============================================================================

import { climateStats } from '../data/climateData.js';
import { resolveDailyMeals, resolveDailyWater, resolveLodging, computeWaterNeed } from './inventory.js';
import {
  buildDayNote,
  classifyRegionFamilies,
  clamp,
  computeEnergyDelta,
  computeShadowDelta,
  countCombat,
  countTension,
  isHarshWeatherAllDay,
  isQuietNight,
  isSanctuary,
  resolveFate,
  WOUND_COSTS,
  TUNING,
} from './characterState.js';

// ---------------------------------------------------------------------------
// Wound costs from encounter outcomes
// ---------------------------------------------------------------------------
function tallyWoundCosts(encounters) {
  const outcomes = [];
  let woundEnergy = 0;
  let woundShadow = 0;
  for (const e of encounters || []) {
    const outcome = e.interaction?.outcome;
    if (outcome && WOUND_COSTS[outcome]) {
      outcomes.push(outcome);
      woundEnergy += WOUND_COSTS[outcome].energy;
      woundShadow += WOUND_COSTS[outcome].shadow;
    }
  }
  return { outcomes, woundEnergy, woundShadow };
}

// ---------------------------------------------------------------------------
// Food + lodging -> narrative day events
// ---------------------------------------------------------------------------
function buildDayEvents(food, water, lodging) {
  const events = [];
  for (const meal of food.meals || []) {
    events.push({
      type: 'meal',
      slot: meal.slot,
      eaten: meal.itemId != null || meal.slug === 'tavern_meal',
      food: meal.food,
      drink: meal.drink,
      source: lodging.paid ? 'tavern' : 'rations',
      itemId: meal.itemId,
    });
  }
  if (!food.consumed && food.newDaysWithoutFood > 0) {
    events.push({ type: 'food', consumed: false, daysWithoutFood: food.newDaysWithoutFood });
  }
  if (water.drank) {
    events.push({ type: 'water', drank: water.drank, refilled: water.refilled });
  } else if (water.newDaysWithoutWater > 0) {
    events.push({ type: 'water', drank: false, daysWithoutWater: water.newDaysWithoutWater });
  }
  if (lodging.paid) {
    events.push({ type: 'lodging', paid: true, cost: lodging.cost, coinsAfter: lodging.coinsAfter });
  } else if (lodging.turnedAway) {
    events.push({ type: 'lodging', turnedAway: true });
  }
  return events;
}

/**
 * Resolve a single day's mechanical effect on the character.
 * This is the single source of truth for how energy and shadow move.
 *
 * @param {Object} params
 * @param {Object} params.day           - output of generateDay()
 * @param {Object} params.startState    - output of loadCharacterState()
 * @param {Object} params.effects       - output of aggregateEffects(inventoryRows)
 * @param {Array}  params.inventoryRows - loaded inventory rows (for notableItems)
 * @returns {{
 *   openingEnergy: number,
 *   openingShadow: number,
 *   newEnergy: number,
 *   newShadow: number,
 *   fate: {fate:string, status:string, halted:boolean},
 *   dayEvents: Array,
 *   note: string|null,
 *   restedWell: boolean,
 *   food: Object,
 *   water: Object,
 *   lodging: Object,
 *   meanTemperature: number|null,
 *   meanWind: number|null,
 *   notableItems: string[],
 *   flaskFrozen: boolean
 * }}
 */
export function resolveDayState({
  day,
  startState,
  effects,
  inventoryRows,
}) {
  const openingEnergy = startState ? startState.energy : 100;
  const openingShadow = startState ? startState.shadow : 0;

  const { meanTemperature, meanWind } = climateStats(day.climate);

  const encounters = day.encounters || [];
  const nightEncounters = encounters.filter((e) => e.phase === 'night');
  const families = (day.regions || []).map((r) => r.cultural_family);
  const regionNames = (day.regions || []).map((r) => r.name);
  const { throughEnemy } = classifyRegionFamilies(families, regionNames);

  const hostileCount = countCombat(encounters) + countTension(encounters);
  const quietFriendlyDay = hostileCount === 0 && !throughEnemy;

  const quietNight = isQuietNight(nightEncounters, day.nighttime_climate);
  const interruptedNight = !quietNight;

  const sanctuary = isSanctuary(day.overnight_location, day.overnight_interaction);

  const daysWithoutFood = startState?.days_without_food ?? 0;
  const daysWithoutWater = startState?.days_without_water ?? 0;
  const coins = startState?.coins ?? TUNING.STARTING_COINS;

  const lodging = resolveLodging({
    overnightLocation: day.overnight_location,
    overnightInteraction: day.overnight_interaction,
    coins,
    currentEnergy: openingEnergy,
    sanctuary,
  });

  // Frozen flask: natural sources are unavailable, but a settlement well still works.
  const flaskFrozen = Number.isFinite(meanTemperature) && meanTemperature <= TUNING.FLASK_FREEZE_TEMP;
  const hasFreshwater = (day.water_crossings?.length > 0) || (day.water_sources?.length > 0);
  const refillAvailable = (day.overnight_location?.indoor) || (hasFreshwater && !flaskFrozen);
  const totalPrecipitation = climateStats(day.climate).totalPrecipitation;

  let water = resolveDailyWater({
    waterHeld: effects.waterHeld,
    capacity: effects.waterCapacity,
    meanTemperature,
    refillAvailable,
    rainMm: totalPrecipitation,
    frozen: flaskFrozen,
    daysWithoutWater,
  });

  // Paid lodging feeds and waters the traveller: the flask is topped up too.
  if (lodging.paid) {
    water = { drank: computeWaterNeed(meanTemperature), waterAfter: effects.waterCapacity, newDaysWithoutWater: 0, refilled: true, frozen: flaskFrozen };
  }

  // Two meals a day: a midday halt on the road and supper at camp.
  const food = resolveDailyMeals({
    rations: effects.rations,
    daysWithoutFood,
    rows: inventoryRows,
    waterDrunk: water.drank,
    tavernMeal: lodging.paid,
  });

  const effectiveOvernightLocation = lodging.turnedAway
    ? { ...day.overnight_location, indoor: false }
    : day.overnight_location;

  const restInLocation = !!day.overnight_location && !lodging.turnedAway;
  const restFamily = day.overnight_interaction?.region?.cultural_family || null;
  const restRegionName = day.overnight_interaction?.region?.name || null;
  const { throughEnemy: restIsEnemy } = classifyRegionFamilies([restFamily], [restRegionName]);

  const restQuality = day.overnight_interaction?.rest_quality ?? null;
  const effectiveRestQuality = lodging.restQuality != null ? lodging.restQuality : restQuality;
  const shadowEffect = day.overnight_interaction?.shadow_effect ?? 0;

  // Energy and shadow deltas: the only place these are computed for a day.
  const { delta: energyDelta } = computeEnergyDelta({
    distanceKm: day.distance_km,
    encounters,
    restQuality: effectiveRestQuality,
    harshWeatherAllDay: isHarshWeatherAllDay(day.climate),
    quietNight,
    meanTemperature,
    meanWind,
    overnightLocation: effectiveOvernightLocation,
    currentEnergy: openingEnergy,
    interruptedNight,
    sanctuary,
    coldShift: effects.coldShift,
    restBonus: effects.restBonus,
    daysWithoutFood: food.newDaysWithoutFood,
    daysWithoutWater: water.newDaysWithoutWater,
    recoveryOverride: lodging.recoveryOverride,
    consumedFood: food.consumed,
    drankWater: water.drank >= computeWaterNeed(meanTemperature),
    mealEnergyBonus: food.energyBonus,
  });

  const { delta: shadowDelta } = computeShadowDelta({
    shadowEffect,
    encounters,
    throughEnemyRegion: throughEnemy,
    quietFriendlyDay,
    restQuality,
    restInLocation,
    restNonEnemy: restInLocation && !restIsEnemy,
    sanctuary,
  });

  // Apply wounds and fate
  const rawEnergy = sanctuary ? 100 : openingEnergy + energyDelta;
  const rawShadow = openingShadow + shadowDelta;

  const { outcomes, woundEnergy, woundShadow } = tallyWoundCosts(encounters);
  const newEnergy = clamp(rawEnergy + woundEnergy);
  const newShadow = clamp(rawShadow + woundShadow);

  const fate = resolveFate({ energy: newEnergy, shadow: newShadow, encounterOutcomes: outcomes });
  const restedWell = restQuality != null && restQuality >= TUNING.REST_TRACK_MIN;
  const note = buildDayNote(day, day.overnight_interaction);

  const notableItems = (inventoryRows || [])
    .filter((r) => r.rarity === 'rare' || r.slug === 'lorien_elven_cloak')
    .map((r) => r.prose_singular);

  const dayEvents = buildDayEvents(food, water, lodging);

  return {
    openingEnergy,
    openingShadow,
    newEnergy,
    newShadow,
    fate,
    dayEvents,
    note,
    restedWell,
    food,
    meals: food.meals,
    lodging,
    meanTemperature,
    meanWind,
    notableItems,
    water,
    flaskFrozen,
  };
}
