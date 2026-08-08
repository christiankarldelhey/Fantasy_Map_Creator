// ============================================================================
// Prompt builder (NO AI)
// ----------------------------------------------------------------------------
// Assembles the narrator prompt for one day. This file is deliberately only a
// layout: every block of text comes from a named section in ./sections, and all
// geographic/weather wording comes from the rule-based naturalLanguage service.
// Read top to bottom to see the chapter the model receives.
//
// Where things live:
//   systemPrompt.js              the narrator's voice (system message)
//   sections/character.js        who walks, and through whose eyes
//   sections/journey.js          destination, yesterday, season, first/last day
//   sections/dayContext.js       lands, roads and climbing for the whole day
//   sections/phaseBlock.js       MORNING / AFTERNOON / NIGHT AT CAMP blocks
//   sections/encounters.js       the resolved encounters of a phase
//   sections/antiRepetition.js   avoid-list + rotating closing instruction
//   sections/climateState.js     multi-day and unusual weather state
//   sections/terminalDay.js      the chapter where the character dies
//   sections/instructions.js     the fixed rule blocks
// ============================================================================

import { getMoonPhase } from '../data/moonPhase.js';
import {
  collectClimateNotesByPhase,
  collectNighttimeConditions,
  describeOvernightLocation,
  emptyPhaseBuckets,
  groupByPhase,
  pickTodaysWayIn,
} from '../naturalLanguage/index.js';
import { SYSTEM_PROMPT } from './systemPrompt.js';
import { bannedPhrasesSection, closingInstruction } from './sections/antiRepetitionSection.js';
import { characterHeaderSection, characterName, narratorLensSection } from './sections/characterSection.js';
import { dayContextSection } from './sections/dayContextSection.js';
import {
  ENCOUNTER_RULES,
  LAND_NOTES_RULES,
  OVERNIGHT_COLOUR_NOTE,
  SPANISH_INSTRUCTION,
  roadIntro,
  todaysWayInSection,
} from './sections/instructionsSection.js';
import {
  destinationName,
  journeyContextSection,
  seasonPhrase,
  specialInstructionsSection,
} from './sections/journeySection.js';
import { climateStateSection } from './sections/climateSection.js';
import { phaseBlock } from './sections/phaseSection.js';
import {
  terminalClosingInstruction,
  terminalNoticeSection,
  terminalRoadIntro,
} from './sections/terminalDaySection.js';

export { SYSTEM_PROMPT };

/** Group the day's encounters into the three narrative phases. */
function encountersByPhase(encounters) {
  const buckets = emptyPhaseBuckets();
  for (const encounter of encounters || []) {
    const phase = encounter.phase || 'night';
    if (buckets[phase]) buckets[phase].push(encounter);
  }
  return buckets;
}

/** The camp lead-in for the NIGHT block: where they slept and how the night went. */
function nightLead(day) {
  const camp = describeOvernightLocation(day.overnight_location, day.overnight_interaction);
  const conditions = collectNighttimeConditions(day.nighttime_climate, day.rng);
  return [
    `Overnight camp:\n${camp}`,
    conditions.length ? `Nighttime conditions (reference only):\n${conditions.join('\n')}` : '',
  ].filter(Boolean).join('\n\n');
}

/**
 * Build the narration prompt for a day.
 * @param {Object} params
 * @param {Object} params.day - output of generateDay (or a day row rehydrated to it)
 * @param {Object} [params.trip] - parent trip, for the destination name
 * @param {Object} [params.character] - { name, description, system_prompt, introduction_instructions, entity_name }
 * @param {string} [params.language] - 'english' or 'spanish'
 * @param {string|null} [params.previousDaySummary] - non-AI summary of yesterday
 * @param {string} [params.conditionBlock] - TRAVELLER'S CONDITION (energy/shadow)
 * @param {string} [params.equipmentBlock] - EQUIPAJE (gear, food, coins)
 * @param {string} [params.endStateBlock] - death block; non-empty makes the day terminal
 * @param {string} [params.climateStateBlock] - multi-day / unusual weather state
 * @param {string[]} [params.bannedPhrases] - phrases over-used in earlier chapters
 * @returns {{ system: string, user: string }}
 */
export function buildDayPrompt({
  day,
  trip = {},
  character = {},
  language = 'english',
  previousDaySummary = null,
  conditionBlock = '',
  equipmentBlock = '',
  endStateBlock = '',
  climateStateBlock = '',
  bannedPhrases = [],
}) {
  const charName = characterName(character);
  const destination = destinationName(trip.name);
  const rng = day.rng || Math.random;
  // A non-empty end-state block means the character dies today: no camp, and the
  // chapter must close on the death.
  const isTerminal = !!endStateBlock;

  const moon = day.moon_phase || getMoonPhase(day.date);
  const weatherByPhase = collectClimateNotesByPhase(day.climate, moon);
  const biomesByPhase = groupByPhase(day.biomes);
  const locationsByPhase = groupByPhase(day.locations);
  const waterByPhase = groupByPhase(day.water_crossings);
  const encounterByPhase = encountersByPhase(day.encounters);

  const blockFor = (title, phase, extraLead = '') => phaseBlock({
    title,
    extraLead,
    weather: weatherByPhase[phase],
    biomes: biomesByPhase[phase],
    locations: locationsByPhase[phase],
    waterCrossings: waterByPhase[phase],
    encounters: encounterByPhase[phase],
    regions: day.regions,
    terrainPhrases: day.terrain_phrases,
    rng,
  });

  const user = `${characterHeaderSection(character)}${narratorLensSection(character)}${conditionBlock}${equipmentBlock}${endStateBlock}${journeyContextSection(destination, previousDaySummary)}${specialInstructionsSection({
    dayNumber: day.day_number,
    isLastDay: !!day.is_last_day,
    characterName: charName,
    destination,
    introductionInstructions: character.introduction_instructions,
  })}${climateStateSection(climateStateBlock)}${bannedPhrasesSection(bannedPhrases)}${isTerminal ? terminalNoticeSection(charName) : ''}${LAND_NOTES_RULES}

${ENCOUNTER_RULES}

${todaysWayInSection(pickTodaysWayIn(rng))}

=== TODAY'S ROAD ===
${isTerminal ? terminalRoadIntro(day.day_number, charName) : roadIntro(day.day_number)} ${seasonPhrase(day.date)}

${dayContextSection({
    regions: day.regions,
    roadTypes: day.road_types,
    terrainPhrases: day.terrain_phrases,
    elevationProfile: day.elevation_profile,
    rng,
  })}

${blockFor('MORNING', 'morning')}

${blockFor('AFTERNOON', 'afternoon')}

${isTerminal ? '' : blockFor('NIGHT AT CAMP', 'night', nightLead(day))}

${isTerminal ? terminalClosingInstruction(charName) : closingInstruction(day.day_number)}
${isTerminal ? '' : OVERNIGHT_COLOUR_NOTE}

${language === 'spanish' ? SPANISH_INSTRUCTION : ''}`;

  return { system: SYSTEM_PROMPT, user };
}
