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

import { climateStats } from '../../adapters/mapClient.js';
import { resolveDailyMeals, resolveDailyWater, resolveLodging, resolveShelterLodging, computeWaterNeed, feltTemperature, terrainWaterAvailable } from './inventory.js';
import {
  buildDayNote,
  classifyRegionFamilies,
  clamp,
  computeEnergyDelta,
  computeShadowDelta,
  countCombat,
  countTension,
  energyBand,
  isHarshWeatherAllDay,
  isQuietNight,
  isSanctuary,
  passedSettlement,
  resolveFate,
  WOUND_COSTS,
  TUNING,
} from './characterState.js';
import { resolveConditions, WOUND_ORDER } from './conditions.js';
import { rollSkillCheck } from './skillCheck.js';

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
      eaten: meal.itemId != null || meal.provided === true || meal.paid === true || meal.slug === 'tavern_meal',
      food: meal.food,
      drink: meal.drink,
      source: lodging.paid ? 'tavern' : (meal.provided ? 'shelter' : 'rations'),
      itemId: meal.itemId,
    });
  }
  if (!food.consumed && food.newDaysWithoutFood > 0) {
    events.push({ type: 'food', consumed: false, daysWithoutFood: food.newDaysWithoutFood });
  }
  if (water.drank) {
    events.push({
      type: 'water', drank: water.drank, refilled: water.refilled,
      // The sky itself quenched them — a tag, not a number: the day the
      // rain was enough is a fact the mind can hold.
      ...(water.rain ? { rain: true } : {}),
    });
  } else if (water.newDaysWithoutWater > 0) {
    events.push({ type: 'water', drank: false, daysWithoutWater: water.newDaysWithoutWater });
  }
  if (lodging.paid) {
    events.push({ type: 'lodging', paid: true, cost: lodging.cost, coinsAfter: lodging.coinsAfter, place: lodging.place });
  } else if (lodging.charity) {
    // The traveller begged a bed and someone said yes — a barn, a hearth.
    events.push({ type: 'lodging', charity: true, place: lodging.place, check: lodging.charityCheck });
  } else if (lodging.turnedAway) {
    events.push({ type: 'lodging', turnedAway: true, place: lodging.place, check: lodging.charityCheck });
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
 *   conditions: {fatigue:number, wounded:string},
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

  // C27: encounter gifts (day.commands) — unconditional effects the world
  // applies outright: a shared meal, a refilled skin, a bundle of arrows,
  // a handful of coins, a wound tended. The stance said it; the host makes
  // it true. A gifted coin lands BEFORE lodging resolves, so a stranger's
  // generosity can pay for tonight's bed.
  const dayCommands = (day.commands || []).filter((c) => c && typeof c === 'object');
  const giftCoins = dayCommands
    .filter((c) => c.type === 'coins' && Number.isFinite(c.amount))
    .reduce((sum, c) => sum + c.amount, 0);
  const waterRefill = dayCommands.some((c) => c.type === 'water_refill');
  const providedMeals = dayCommands
    .filter((c) => c.type === 'meal')
    .map((c) => ({
      slot: c.slot ?? ((c.hour_float ?? 12) < 15 ? 'midday' : 'evening'),
      food: c.food ?? null,
      drink: c.drink ?? null,
      slug: c.slug ?? null,
    }));
  const grants = dayCommands
    .filter((c) => c.type === 'item' && c.slug && Number.isFinite(c.qty) && c.qty > 0)
    .map((c) => ({ slug: c.slug, qty: c.qty }));
  const healed = dayCommands.some((c) => c.type === 'heal');
  const coins = Math.max(0, (startState?.coins ?? TUNING.STARTING_COINS) + giftCoins);

  // A shelter decision taken at dusk (B5): the encounter's offer became
  // the night's roof. day.overnight_* already carry the shelter's rest —
  // this path only decides whether the coin was paid and whether the
  // board/well that comes with it feeds the traveller.
  const shelterChoice = day.shelter_choice ?? null;
  const lodging = shelterChoice
    ? resolveShelterLodging({ shelter: shelterChoice, coins, currentEnergy: openingEnergy })
    : resolveLodging({
        overnightLocation: day.overnight_location,
        overnightInteraction: day.overnight_interaction,
        coins,
        currentEnergy: openingEnergy,
        currentShadow: openingShadow,
        skillPersuasion: startState?.skill_persuasion ?? 0,
        rng: day.rng || Math.random,
        sanctuary,
      });
  lodging.place = day.overnight_location?.name ?? null;

  // Frozen flask: natural sources are unavailable, but a settlement well still works.
  const flaskFrozen = Number.isFinite(meanTemperature) && meanTemperature <= TUNING.FLASK_FREEZE_TEMP;
  const hasFreshwater = (day.water_crossings?.length > 0) || (day.water_sources?.length > 0);
  // Traced rivers and lakes are sparse, so terrain that is not desert also
  // yields water. A settlement well works even when everything else is frozen.
  const naturalWater = hasFreshwater || terrainWaterAvailable(day.biomes);
  const refillAvailable = passedSettlement(day) || (naturalWater && !flaskFrozen);
  // A frozen world is still made of water: the night's fire melts snow —
  // unless the land itself is waterless (a frozen desert can kill of thirst).
  const meltAtCamp = flaskFrozen && naturalWater;
  const totalPrecipitation = climateStats(day.climate).totalPrecipitation;

  let water = resolveDailyWater({
    waterHeld: effects.waterHeld,
    capacity: effects.waterCapacity,
    meanTemperature,
    refillAvailable,
    meltAtCamp,
    rainMm: totalPrecipitation,
    frozen: flaskFrozen,
    daysWithoutWater,
  });

  // Paid lodging — a shelter that offers its spring — or a stranger who
  // draws water for the traveller: the flask is topped up either way.
  if (lodging.paid || shelterChoice?.water || waterRefill) {
    water = { drank: computeWaterNeed(meanTemperature), waterAfter: effects.waterCapacity, newDaysWithoutWater: 0, refilled: true, frozen: flaskFrozen };
  }

  // Two meals a day: a midday halt on the road and supper at camp.
  const food = resolveDailyMeals({
    rations: effects.rations,
    daysWithoutFood,
    rows: inventoryRows,
    waterDrunk: water.drank,
    tavernMeal: lodging.paid || !!shelterChoice?.meal,
    mealSlug: shelterChoice?.meal_slug ?? null,
    mealPaid: lodging.paid,
    providedMeals,
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

  // A freezing night under open sky: the body rolls endurance against the
  // felt cold (garments already shift it) or the night is lost to shivering
  // — no recovery, a deeper chill on top, and a bad miss leaves a wound.
  // An indoor bed never rolls: a roof is the whole point of a roof.
  const feltTemp = feltTemperature(meanTemperature, effects?.coldShift ?? 0);
  const outdoorRest = !effectiveOvernightLocation?.indoor;
  const coldCheck = (
    outdoorRest
    && Number.isFinite(feltTemp)
    && feltTemp < TUNING.COLD_CHECK_TEMP_MAX
  ) ? rollSkillCheck({
    skill: startState?.skill_endurance ?? 0,
    difficulty: TUNING.COLD_CHECK_BASE_DIFFICULTY
      + Math.floor((TUNING.COLD_CHECK_TEMP_MAX - feltTemp) / 5)
      * TUNING.COLD_CHECK_PER_5C,
    skillName: 'endurance',
    energy: openingEnergy,
    shadow: openingShadow,
    rng: day.rng || Math.random,
  }) : null;
  const coldCheckFailed = !!coldCheck && !coldCheck.success;

  // Ambient situations (ADR-0015): the wind of Angmar wears the spirit too —
  // their outcome shadow_effect rides the same rail as the night's.
  const ambientShadow = (day.ambient || [])
    .reduce((sum, a) => sum + (Number(a?.effects?.shadow_effect) || 0), 0);
  const shadowEffect = (day.overnight_interaction?.shadow_effect ?? 0) + ambientShadow;

  // Energy and shadow deltas: the only place these are computed for a day.
  const { delta: energyDelta, parts: energyParts } = computeEnergyDelta({
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
    coldCheckFailed,
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
    resistance: startState?.resistance ?? 0,
  });

  // Apply wounds and fate
  const rawEnergy = sanctuary ? 100 : openingEnergy + energyDelta;
  const rawShadow = openingShadow + shadowDelta;

  const { outcomes, woundEnergy, woundShadow } = tallyWoundCosts(encounters);
  let newEnergy = clamp(rawEnergy + woundEnergy);
  const newShadow = clamp(rawShadow + woundShadow);

  // Forced halt — nobody walks themselves dead. A traveller who wakes
  // 'spent' does not march; one the march would empty stops where they
  // are and the rest comes early. The halt gives back what the night
  // gives — a camp that returns nothing (deep freeze, no fire, hunger)
  // still kills; that is the one extreme nobody survives by stopping.
  const spentAtDawn = energyBand(openingEnergy) === 'spent';
  let halted = false;
  if (!sanctuary && (spentAtDawn || newEnergy <= 0)) {
    const restShare = energyParts.recovery + energyParts.quietBonus
      + energyParts.mealBonus + woundEnergy;
    // At dawn the march is waived — ambient cold and deprivation are
    // still paid; mid-day the day already cost what it cost and only
    // the early rest remains.
    newEnergy = spentAtDawn
      ? clamp(openingEnergy + restShare + energyParts.temperature
          + energyParts.wind + energyParts.fastingCost
          + energyParts.thirstCost)
      : clamp(restShare);
    halted = true;
  }

  const fate = resolveFate({ energy: newEnergy, shadow: newShadow, encounterOutcomes: outcomes });
  const restedWell = restQuality != null && restQuality >= TUNING.REST_TRACK_MIN;
  const note = buildDayNote(day, day.overnight_interaction);

  // Persistent conditions: fatigue and wounded track separately from the
  // energy number above, using the same day drivers already computed here.
  const conditions = resolveConditions({
    previousFatigue: startState?.fatigue ?? 0,
    previousWounded: startState?.wounded ?? 'none',
    distanceKm: day.distance_km,
    encounterOutcomes: outcomes,
    combatCount: countCombat(encounters),
    tensionCount: countTension(encounters),
    harshWeatherAllDay: isHarshWeatherAllDay(day.climate),
    interruptedNight,
    restQuality: effectiveRestQuality,
  });

  // A freezing night lost by a wide margin bites into the flesh itself —
  // frostbite, a wound a tier deeper. (A lost roll already cost the night.)
  if (coldCheck && coldCheck.margin <= -TUNING.COLD_CHECK_WOUND_MARGIN) {
    const idx = WOUND_ORDER.indexOf(conditions.wounded);
    if (idx < WOUND_ORDER.length - 1) conditions.wounded = WOUND_ORDER[idx + 1];
  }

  // C27: a healer's gift steps the wound down a tier on the spot — the
  // encounter says the hands were laid on; the body keeps that truth.
  if (healed && conditions.wounded !== 'none') {
    const idx = WOUND_ORDER.indexOf(conditions.wounded);
    if (idx > 0) conditions.wounded = WOUND_ORDER[idx - 1];
  }

  const notableItems = (inventoryRows || [])
    .filter((r) => r.rarity === 'rare' || r.slug === 'lorien_elven_cloak')
    .map((r) => r.prose_singular);

  const dayEvents = buildDayEvents(food, water, lodging);
  // A day that ended early — the body called the halt, not the clock.
  if (halted) dayEvents.push({ type: 'halt' });

  return {
    openingEnergy,
    openingShadow,
    newEnergy,
    newShadow,
    fate,
    dayEvents,
    note,
    restedWell,
    conditions,
    food,
    meals: food.meals,
    lodging,
    meanTemperature,
    meanWind,
    notableItems,
    water,
    flaskFrozen,
    halted,
    coldCheck,
    grants,
  };
}
