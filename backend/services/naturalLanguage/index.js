// ============================================================================
// Natural Language service (NO AI)
// ----------------------------------------------------------------------------
// Deterministic, rule-based interpreters that turn the raw day data (climate,
// regions, biomes, altitude, locations, roads, water) into plain English notes
// for the narrator prompt. Nothing here calls an LLM, and nothing here emits
// figures or clock times — the prompt tells the model never to report numbers.
//
// Where things live:
//   text.js            shared prose primitives (pick, joinList, capitalize)
//   dayPhases.js       morning / afternoon / night, and clock -> prose time
//   weatherNotes.js    one weather phrase per phase
//   moonNotes.js       moon phrase for the night line
//   nightNotes.js      how the night treated a sleeping traveller
//   terrainNotes.js    biomes and altitude layers crossed
//   elevationNotes.js  the physical cost of the day's climbing
//   roadNotes.js       what the traveller treads on
//   waterNotes.js      rivers bridged, streams forded
//   placeNotes.js      lands crossed, settlements passed, overnight camp
//   openingFocus.js    the day's single sensory way in
//
// Import from this barrel (`services/naturalLanguage.js`) rather than reaching
// into the individual modules, so the internal layout stays free to change.
// ============================================================================

export {
  NARRATIVE_PHASES,
  emptyPhaseBuckets,
  groupByPhase,
  phaseForHour,
  timeOfDayPhrase,
} from './dayPhases.js';

export { collectClimateNotesByPhase } from './weatherNotes.js';
export { formatMoonNightPhrase } from './moonNotes.js';
export { collectNighttimeConditions } from './nightNotes.js';
export { collectTerrainNotes } from './terrainNotes.js';
export { describeElevation } from './elevationNotes.js';
export { collectRoadNotes } from './roadNotes.js';
export { describeWaterCrossings } from './waterNotes.js';
export {
  collectLocationNotes,
  describeOvernightLocation,
  describeRegions,
} from './placeNotes.js';
export { pickTodaysWayIn } from './openingFocus.js';
