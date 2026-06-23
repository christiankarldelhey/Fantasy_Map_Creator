import { WALK_START_HOUR, WALK_END_HOUR } from './tripDay.js';
import {
  describeClimate,
  describeRegions,
  describeLandscape,
  describeLocations,
  describeRoads,
} from './naturalLanguage.js';

// ============================================================================
// Prompt builder (no AI)
// ----------------------------------------------------------------------------
// Turns a generated day object + the character into a Tolkien-style chapter
// prompt. The geographic/weather data is first run through the (rule-based)
// naturalLanguage service, then laid out in the chapter template. The day is
// split into three parts — morning, afternoon and night at camp.
// Returns { system, user }.
// ============================================================================

export const SYSTEM_PROMPT = `You are a storyteller in the tradition of J.R.R. Tolkien. Sober, concrete prose: you name hills, rivers and roads for what they are and let the facts suggest emotion rather than declaring it.

Style rules:
- Restraint over ornament. Tolkien rarely grows excited; when he does, it carries weight.
- No abstract filler ("a sense of wonder", "his heart pounded", "full of magic"). If you name an emotion, anchor it to a gesture or a physical detail.
- Do not repeat images or phrases within the chapter.
- Weather is atmosphere, not a report: it appears only when it shifts the mood or hinders the march. Never give figures or exact hours.
- Every encounter must MAKE something happen: a decision, an exchange, a consequence. Do not describe a threat only to dissolve it without effect.
- Flowing prose, no bullet points. A short verse only if it truly fits.

Rules for using the data:
- The data below is RAW MATERIAL, not a checklist. Use what serves the story and discard the rest. You need not mention every region, biome, road or weather reading.
- Do not invent names of places or creatures that do not appear in the data.`;

// Three parts of the day: morning + afternoon (walking), and night at camp.
const MIDDAY = (WALK_START_HOUR + WALK_END_HOUR) / 2; // 13:00 for 7–19

function partFor(hourFloat) {
  if (hourFloat >= WALK_END_HOUR || hourFloat < WALK_START_HOUR) return 'night';
  if (hourFloat < MIDDAY) return 'morning';
  return 'afternoon';
}

function describeEncounter(e) {
  const ent = e.entity || {};
  const danger = ent.danger != null ? `, danger ${ent.danger}/5` : '';
  const desc = ent.description ? ` — ${ent.description}` : '';
  return `${ent.name} (${ent.type || 'creature'}, ${ent.active || 'all-day'}${danger}) in ${e.region}${desc}`;
}

function encounterSection(list) {
  if (!list || list.length === 0) return '  (no encounters)';
  return list.map((e) => `  * ${describeEncounter(e)}`).join('\n');
}

/**
 * Build the narration prompt for a day object.
 * @param {Object} day - output of generateDay
 * @param {Object} [trip] - parent trip (for name/context)
 * @param {Object} [character] - { name, description, entity_name }
 * @param {string} [language] - 'english' or 'spanish'
 * @returns {{ system: string, user: string }}
 */
export function buildDayPrompt(day, trip = {}, character = {}, language = 'english') {
  const parts = { morning: [], afternoon: [], night: [] };
  for (const e of day.encounters || []) {
    parts[partFor(e.hour_float)].push(e);
  }

  const charName = character.name || 'The traveller';
  const charKind = character.entity_name ? `, ${character.entity_name} of the northern lands` : '';
  const charBio = character.description ? `\n${character.description}` : '';

  // Extract season from date
  const date = new Date(day.date);
  const month = date.getMonth(); // 0-11
  let seasonContext = '';
  if (month >= 2 && month <= 4) {
    seasonContext = 'It is spring.';
  } else if (month >= 5 && month <= 7) {
    seasonContext = 'It is summer.';
  } else if (month >= 8 && month <= 10) {
    seasonContext = 'It is autumn.';
  } else {
    seasonContext = 'It is the dead of winter.';
  }

  const user = `=== THE TRAVELLER ===
${charName}${charKind}.${charBio}

=== TODAY'S ROAD ===
Day ${day.day_number}. Narrate a single day's journey, from dawn to the night at camp.
${seasonContext}

Lands crossed (in order), with their character:
${describeRegions(day.regions)}

Places near the road:
${describeLocations(day.locations)}

The landscape crossed:
${describeLandscape(day.biomes, day.altitude)}

Where the road runs:
${describeRoads(day.road_types, day.regions)}

The weather through the day:
${describeClimate(day.climate)}

=== ENCOUNTERS ===
Morning:
${encounterSection(parts.morning)}
Afternoon:
${encounterSection(parts.afternoon)}
Night at camp:
${encounterSection(parts.night)}

Write the chapter as flowing prose in three movements — morning, afternoon, and the night at camp. Let each encounter cause something to happen.

${language === 'spanish' ? 'Please write the entire response in Spanish.' : ''}`;

  return { system: SYSTEM_PROMPT, user };
}
