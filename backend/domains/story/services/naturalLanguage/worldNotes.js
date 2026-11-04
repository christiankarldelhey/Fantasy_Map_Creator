// ============================================================================
// World notes — the day's world data already verbalized for the narrator
// ----------------------------------------------------------------------------
// The world-voice migration (issue #52): everything the story-engine used to
// phrase itself is produced HERE, before the HTTP call. The engine receives
// prose + structure and only assembles the prompt — it never sees a raw
// world number it must turn into words.
//
// Keys mirror the fields the prompt pipeline consumes:
//   climate_state, weather{phase}, meals{phase}, terrain{phase},
//   locations{phase}, water{phase}, night_lead, lands, condition, equipage,
//   end_state, journey_context
// ============================================================================

import { collectClimateNotesByPhase, resolveClimateState } from './climateNotes.js';
import { collectNighttimeConditions } from './nightNotes.js';
import { collectTerrainNotes } from './terrainNotes.js';
import { describeElevation } from './elevationNotes.js';
import { collectRoadNotes } from './roadNotes.js';
import { describeWaterCrossings } from './waterNotes.js';
import { describeMeals } from './mealNotes.js';
import {
  collectLocationNotes,
  describeOvernightLocation,
  describeRegions,
} from './placeNotes.js';
import { conditionSection, equipmentSection, endStateSection } from './stateBlocks.js';
import { journeyContextSection } from './journeyNotes.js';
import { groupByPhase } from './dayPhases.js';

/** The journey's destination, taken from the trip name ("Bree to Rivendell"). */
function destinationName(tripName) {
  if (!tripName) return 'their destination';
  const parts = tripName.split(' to ');
  return parts.length > 1 ? parts[parts.length - 1] : tripName;
}

/** The camp lead-in for the NIGHT block: where they slept and how it went. */
function nightLead(day, rng) {
  const camp = describeOvernightLocation(day.overnight_location, day.overnight_interaction);
  const conditions = collectNighttimeConditions(day.nighttime_climate, rng);
  const parts = [
    `Overnight camp:\n${camp}`,
    conditions.length
      ? `Nighttime conditions (reference only):\n${conditions.join('\n')}`
      : '',
  ];
  return parts.filter(Boolean).join('\n\n');
}

/** Lands crossed + road notes + terrain effort — the day-level context block. */
function landsContext(day, rng) {
  const parts = [
    `Lands crossed (in order), with their character:\n${describeRegions(day.regions)}`,
  ];

  const roadNotes = collectRoadNotes(day.road_types, day.regions, day.terrain_phrases, rng);
  if (roadNotes.length) {
    parts.push(`Road notes (reference only — render, don't quote):\n${roadNotes.join('\n')}`);
  }

  const elevationNote = describeElevation(day.elevation_profile, rng);
  if (elevationNote) {
    parts.push(`Terrain effort (across the whole day):\n${elevationNote}`);
  }

  return parts.join('\n\n');
}

/**
 * Every phrase the day needs, rendered once from the wire-ready fields.
 * `day` here is the SLIMMED day (the same fields the payload carries), so
 * what Node phrases and what the engine would have phrased are identical.
 */
export function buildWorldNotes({
  day,
  tripName = null,
  characterName = 'The traveller',
  characterState = null,
  equipmentState = null,
  fate = null,
  previousDay = null,
  recentDayClimates = [],
  rng = Math.random,
}) {
  const biomesByPhase = groupByPhase(day.biomes);
  const locationsByPhase = groupByPhase(day.locations);
  const waterByPhase = groupByPhase(day.water_crossings);

  const terrain = {};
  const locations = {};
  const water = {};
  for (const phase of ['morning', 'afternoon', 'night']) {
    terrain[phase] = biomesByPhase[phase].length
      ? collectTerrainNotes(biomesByPhase[phase], [], day.regions, day.terrain_phrases, rng)
      : [];
    locations[phase] = locationsByPhase[phase].length
      ? collectLocationNotes(locationsByPhase[phase])
      : [];
    water[phase] = waterByPhase[phase].length
      ? describeWaterCrossings(waterByPhase[phase], rng)
      : null;
  }

  return {
    climate_state: resolveClimateState(recentDayClimates, rng).narrative,
    weather: collectClimateNotesByPhase(day.climate, day.moon_phase, rng),
    meals: describeMeals(day.meals, rng),
    terrain,
    locations,
    water,
    night_lead: nightLead(day, rng),
    lands: landsContext(day, rng),
    condition: conditionSection(characterState, characterName),
    equipage: equipmentSection(equipmentState),
    end_state: endStateSection(fate, characterName),
    journey_context: journeyContextSection(destinationName(tripName), previousDay),
  };
}
