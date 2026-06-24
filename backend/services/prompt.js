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

const getDestinationName = (tripName) => {
  if (!tripName) return 'their destination';
  const parts = tripName.split(' to ');
  return parts.length > 1 ? parts[parts.length - 1] : tripName;
};

/**
 * Build the narration prompt for a day object.
 * @param {Object} day - output of generateDay
 * @param {Object} [trip] - parent trip (for name/context)
 * @param {Object} [character] - { name, description, system_prompt, introduction_instructions, entity_name }
 * @param {string} [language] - 'english' or 'spanish'
 * @param {string} [previousDaySummary] - non-AI summary of the previous day
 * @returns {{ system: string, user: string }}
 */
export function buildDayPrompt(day, trip = {}, character = {}, language = 'english', previousDaySummary = null) {
  const charName = character.name || 'The Traveller';
  const charKind = character.entity_name ? `, ${character.entity_name} of the northern lands` : '';
  const charBio = character.description ? `\n${character.description}` : '';

  // Determine pronouns based on character gender
  const gender = character.gender || 'female';
  const pronouns = gender === 'male'
    ? { subject: 'he', object: 'him', possessive: 'his', possessive2: 'his' }
    : { subject: 'she', object: 'her', possessive: 'her', possessive2: 'hers' };

  const parts = { morning: [], afternoon: [], night: [] };
  for (const e of day.encounters || []) {
    parts[partFor(e.hour_float)].push(e);
  }

  // Build thoughts section if present
  let thoughtsSection = '';
  if (day.thoughts && day.thoughts.options && day.thoughts.options.length > 0) {
    const phase = day.thoughts.phase;
    const thoughtsList = day.thoughts.options.map(t => `- ${t.thought}`).join('\n');
    thoughtsSection = `=== CHARACTER STATE OF MIND (${phase.toUpperCase()}) ===
    ${pronouns.subject.charAt(0).toUpperCase() + pronouns.subject.slice(1)}/${pronouns.possessive} thoughts this stretch tend toward one of these undercurrents in the ${phase} let
    whichever fits the day's road surface naturally in what ${pronouns.subject} notices. 
    Do not quote these lines; do not announce a thought;
    do not explain it. (choose the one that best fits the situation):
    ${thoughtsList}

`;
  }

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

  let journeyContextSection = '';
  if (previousDaySummary) {
    const destName = getDestinationName(trip.name);
    journeyContextSection = `=== JOURNEY CONTEXT ===
Ultimate Destination: ${destName}
${previousDaySummary}
Please use this context to maintain narrative continuity from yesterday's events.

`;
  } else {
    const destName = getDestinationName(trip.name);
    journeyContextSection = `=== JOURNEY CONTEXT ===
Ultimate Destination: ${destName}

`;
  }

  let specialInstructionsSection = '';
  if (day.day_number === 1) {
    // Use character-specific introduction instructions if available
    if (character.introduction_instructions) {
      const destName = getDestinationName(trip.name);
      specialInstructionsSection = `=== SPECIAL INSTRUCTIONS (INTRODUCTION) ===
${character.introduction_instructions.replace('their destination', destName).replace('her destination', destName)}

`;
    } else {
      const destName = getDestinationName(trip.name);
      specialInstructionsSection = `=== SPECIAL INSTRUCTIONS (INTRODUCTION) ===
This is the first day and the introduction of the entire journey.
In this chapter, please describe ${charName}'s departure, their motivation, and their strong intention to reach ${destName}. Let the prose feel like a beginning, with hope or gravity as fits their personality.

`;
    }
  } else if (day.is_last_day) {
    const destName = getDestinationName(trip.name);
    specialInstructionsSection = `=== SPECIAL INSTRUCTIONS (THE JOURNEY'S END) ===
This is the final day and the conclusion of the entire journey!
${charName} has finally reached their ultimate destination: ${destName}.
In this chapter, narrate their arrival at ${destName}. Give a deep, meaningful reflection on the long path walked, the obstacles overcome, and the achievement of their goal. This reflection must be highly aligned with and expressive of ${charName}'s personality, bio, and background.

`;
  }

  // Add character-specific narrator voice if available
  let narratorVoiceSection = '';
  if (character.system_prompt) {
    narratorVoiceSection = `${character.system_prompt}

`;
  }

  const user = `=== ${charName.toUpperCase()} ===
${charName}${charKind}.${charBio}

${narratorVoiceSection}${journeyContextSection}${specialInstructionsSection}${thoughtsSection}=== HOW TO HANDLE ENCOUNTERS ===
Not every encounter is a meeting. Most are seen, not joined. For each,
choose the FORM that fits — and vary them across the chapter:
- glimpsed at a distance and passed by
- a trace or sign only (tracks, a call, droppings, a fire's smoke)
- the creature reacts to ${pronouns.object} and withdraws
- a brief, wary exchange
- actual contact (rare — use sparingly)

Animals are never greeters and never speak; ${pronouns.subject} reads them, the way ${pronouns.subject}
reads the land. Only Men may exchange words, and even then ${pronouns.subject} watches
more than ${pronouns.subject} joins — ${pronouns.subject} does not get "drawn into" anyone's circle and
does not feel "connection." Filter every encounter through ${pronouns.possessive} eye for
endings: what is dying here, what will not last.

Do NOT use the same beat twice. If one encounter is a meeting, the
others must not be.

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

  // Use default SYSTEM_PROMPT for all characters (character-specific narrator voice is now in user message)
  return { system: SYSTEM_PROMPT, user };
}
