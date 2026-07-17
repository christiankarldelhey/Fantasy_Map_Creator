import { getMoonPhase } from './moonPhase.js';
import {
  describeRegions,
  describeOvernightLocation,
  describeElevation,
  describeWaterCrossings,
  collectTerrainNotes,
  collectRoadNotes,
  collectClimateNotesByPhase,
  collectNighttimeConditions,
  collectLocationNotes,
  pickTodaysWayIn,
  phaseForHour,
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
- Do not repeat phrases or images that appear in the per-phase reference notes. Use them as inspiration, never as copy-paste material.
- Weather is atmosphere, not a report: it appears only when it shifts the mood or hinders the march. Never give figures or exact hours.
- Every encounter must MAKE something happen: a decision, an exchange, a consequence. Do not describe a threat only to dissolve it without effect.
- Flowing prose, no bullet points. A short verse only if it truly fits.

Rules for using the data:
- The data below is RAW MATERIAL, not a checklist. Use what serves the story and discard the rest. You need not mention every region, biome, road or weather reading.
- All the reference notes (the Weather, Terrain, Locations, Water crossings, Road and Creature notes) are REFERENCE ONLY. Never copy their wording into the prose. Render them fresh in your own words each day. They tell you what is there, not how to say it.
- Do not invent names of places or creatures that do not appear in the data.

Cities and major towns:
- When a location is marked as "passes through" (distance_km: 0), the traveller's road actually goes through the settlement. This is a significant event: describe the city, its streets, its people, and how the traveller moves through it. Give it narrative weight — it is not a backdrop but a place the traveller inhabits for a time.
- When a location is marked as "passed close by" or "passed at some distance", the traveller only sees it from afar: roofs on the horizon, smoke rising, the shape of walls. Do not invent a visit or entry.`;

// Three parts of the day: morning + afternoon (walking), and night at camp.
// Encounters now have a 'phase' property directly, so we use that instead of computing from hour.

// Plain-language outcome directives — no numbers, no mechanics
const OUTCOME_DIRECTIVES = {
  unscathed:      'the traveller drives it off cleanly, no harm done',
  wounded:        'the traveller prevails but is hurt; the wound lingers through the day',
  'badly wounded':'grave injury, a narrow escape — the wound must colour the rest of the chapter',
  slain:          'the traveller falls here. Narrate their death as the final scene of the journey.',
};

function describeEncounter(e, charName) {
  const ent = e.entity || {};
  // Keep the encounter header concise: name, type, region. The creature's
  // description lives once in the CREATURE NOTES reference section, so we do
  // not repeat it here.
  const header = `${ent.name} (${ent.type || 'creature'}, ${ent.active || 'all-day'}) in ${e.region}`;

  const interaction = e.interaction;
  if (!interaction) return `  * ${header}.`;

  let lines = `  * ${header}.\n    FORM: ${interaction.form}. ${interaction.prose_hint}`;

  if (interaction.topic) {
    lines += `\n    TOPIC: ${interaction.topic.prose_hint}`;
  }

  if (interaction.stance) {
    lines += `\n      MANNER (${charName}): ${interaction.stance.prose_hint}`;
  }

  if (interaction.outcome) {
    lines += `\n\n    OUTCOME (narrate this, do not change it): ${interaction.outcome}.`;
  }

  return lines;
}

function encounterSection(list, charName) {
  if (!list || list.length === 0) return '  (no encounters)';
  const hasTiming = list.some((e) => e.night_timing);
  if (!hasTiming) {
    return list.map((e) => describeEncounter(e, charName)).join('\n');
  }

  const beforeSleep = list.filter((e) => e.night_timing === 'before_sleep');
  const midNight = list.filter((e) => e.night_timing === 'mid_night');
  const lines = [];
  if (beforeSleep.length) {
    lines.push('Before settling in:');
    lines.push(...beforeSleep.map((e) => describeEncounter(e, charName)));
  }
  if (midNight.length) {
    lines.push('In the depth of night:');
    lines.push(...midNight.map((e) => describeEncounter(e, charName)));
  }
  if (lines.length === 0) {
    return list.map((e) => describeEncounter(e, charName)).join('\n');
  }
  return lines.join('\n');
}

function collectCreatureNotes(encounters) {
  if (!Array.isArray(encounters) || encounters.length === 0) return [];
  const seen = new Set();
  const notes = [];
  for (const e of encounters) {
    const ent = e.entity || {};
    if (!ent.name || seen.has(ent.name)) continue;
    seen.add(ent.name);
    const desc = ent.description_summary || ent.description || '';
    if (desc) {
      notes.push(`- ${ent.name}: ${desc}`);
    }
  }
  return notes;
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
 * @param {string} [conditionBlock] - TRAVELLER'S CONDITION block (energy/shadow), or ''
 * @returns {{ system: string, user: string }}
 */
export function buildDayPrompt(day, trip = {}, character = {}, language = 'english', previousDaySummary = null, conditionBlock = '') {
  const charName = character.name || 'The Traveller';
  const charKind = character.entity_name ? `, ${character.entity_name}` : '';
  const charBio = character.description ? `\n${character.description}` : '';

  // Determine pronouns based on character gender
  const gender = character.gender || 'female';
  const pronouns = gender === 'male'
    ? { subject: 'he', object: 'him', possessive: 'his', possessive2: 'his' }
    : { subject: 'she', object: 'her', possessive: 'her', possessive2: 'hers' };

  const parts = { morning: [], afternoon: [], night: [] };
  for (const e of day.encounters || []) {
    // Use the phase property directly from the encounter
    const phase = e.phase || 'night'; // Fallback to night for backward compatibility
    if (parts[phase]) {
      parts[phase].push(e);
    }
  }

  // --- Day-level reference notes (no per-phase timing) ---
  const roadNotes = collectRoadNotes(day.road_types, day.regions, day.terrain_phrases, day.rng);
  const elevationNote = describeElevation(day.elevation_profile, day.rng);
  const todaysWayIn = pickTodaysWayIn(day.rng);
  const creatureNotes = collectCreatureNotes(day.encounters || []);

  // --- Time-tagged data, grouped into the three narrative phases ---
  const moon = day.moon_phase || getMoonPhase(day.date);
  const climateByPhase = collectClimateNotesByPhase(day.climate, moon);

  const biomesByPhase = { morning: [], afternoon: [], night: [] };
  for (const b of day.biomes || []) {
    biomesByPhase[phaseForHour(b.hour_float)].push(b);
  }

  const locationsByPhase = { morning: [], afternoon: [], night: [] };
  for (const l of day.locations || []) {
    locationsByPhase[phaseForHour(l.hour_float)].push(l);
  }

  const waterByPhase = { morning: [], afternoon: [], night: [] };
  for (const w of day.water_crossings || []) {
    waterByPhase[phaseForHour(w.hour_float)].push(w);
  }

  // Build one chronological block per phase, omitting empty subsections.
  const buildPhaseBlock = (title, phaseKey, extraLead = '') => {
    const sub = [];

    if (climateByPhase[phaseKey]) {
      sub.push(`Weather: ${climateByPhase[phaseKey]}`);
    }

    if (biomesByPhase[phaseKey].length) {
      const terrainNotes = collectTerrainNotes(
        biomesByPhase[phaseKey], [], day.regions, day.terrain_phrases, day.rng
      );
      if (terrainNotes.length) {
        sub.push(`Terrain:\n${terrainNotes.join('\n')}`);
      }
    }

    if (locationsByPhase[phaseKey].length) {
      sub.push(`Locations:\n${collectLocationNotes(locationsByPhase[phaseKey]).join('\n')}`);
    }

    if (waterByPhase[phaseKey].length) {
      const water = describeWaterCrossings(waterByPhase[phaseKey], day.rng);
      if (water) sub.push(`Water crossings:\n${water}`);
    }

    if (extraLead) sub.push(extraLead);

    const enc = encounterSection(parts[phaseKey], charName);
    sub.push(`Encounters:\n${enc}`);

    return `=== ${title} ===\n${sub.join('\n\n')}`;
  };

  // Build thoughts section if present
  let thoughtsSection = '';
  if (day.thoughts && day.thoughts.options && day.thoughts.options.length > 0) {
    const phase = day.thoughts.phase;
    const thoughtsList = day.thoughts.options.map(t => `- ${t.thought}`).join('\n');
    thoughtsSection = `=== CHARACTER STATE OF MIND ===
Once in the ${phase}, slip only one of these thoughts into the narration,
near-verbatim, triggered by something ${pronouns.subject} sees or does. ${pronouns.possessive.charAt(0).toUpperCase() + pronouns.possessive.slice(1)} own voice —
no quotes, no italics, no "${pronouns.subject} thought", no explaining it after.
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
${character.introduction_instructions.replace(/their destination/g, destName).replace(/her destination/g, destName)}

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

  // Add character-specific narrator lens if available (perspective filter, not style rules)
  let narratorVoiceSection = '';
  if (character.system_prompt) {
    narratorVoiceSection = `=== NARRATOR'S LENS FOR ${charName.toUpperCase()} ===
${character.system_prompt}

`;
  }

  // Day-level context that has no per-phase timing.
  const dayContextParts = [];
  dayContextParts.push(`Lands crossed (in order), with their character:\n${describeRegions(day.regions)}`);
  if (roadNotes.length) {
    dayContextParts.push(`Road notes (reference only — render, don't quote):\n${roadNotes.join('\n')}`);
  }
  if (elevationNote) {
    dayContextParts.push(`Terrain effort (across the whole day):\n${elevationNote}`);
  }

  // Three chronological phase blocks. Night carries the camp conditions.
  const morningBlock = buildPhaseBlock('MORNING', 'morning');
  const afternoonBlock = buildPhaseBlock('AFTERNOON', 'afternoon');
  const nighttimeConditions = collectNighttimeConditions(day.nighttime_climate, day.rng);
  const nightExtraLead = [
    `Overnight camp:\n${describeOvernightLocation(day.overnight_location, day.overnight_interaction)}`,
    nighttimeConditions.length ? `Nighttime conditions (reference only):\n${nighttimeConditions.join('\n')}` : '',
  ].filter(Boolean).join('\n\n');
  const nightBlock = buildPhaseBlock('NIGHT AT CAMP', 'night', nightExtraLead);

  const user = `=== ${charName.toUpperCase()} ===
${charName}${charKind}.${charBio}

${narratorVoiceSection}${conditionBlock || ''}${journeyContextSection}${specialInstructionsSection}${thoughtsSection}=== HOW TO USE THE LAND NOTES ===
The notes below are REFERENCE ONLY. Never copy their wording into the prose. Render them fresh in your own words. They tell you what is there, not how to say it. The day is laid out chronologically: the MORNING, AFTERNOON and NIGHT AT CAMP blocks each gather the terrain, weather, water and encounters that belong to that part of the day. Narrate them in that order.

=== ENCOUNTER RULES ===
Render the given form, dialogue and outcome for each encounter. Do not invent a different form. Vary the beats across the chapter. The way an encounter resolves must differ from how recent encounters resolved.

=== TODAY'S WAY IN ===
Open the chapter's morning movement in the middle of an action, not at dawn or with the weather. Build today's landscape around ONE element: ${todaysWayIn}. Do not inventory the scenery — enter through that one sense and let the rest stay in shadow.

=== TODAY'S ROAD ===
Day ${day.day_number}. Narrate a single day's journey in three movements: morning, afternoon, and the night at camp. ${seasonContext}

${dayContextParts.join('\n\n')}

=== CREATURE NOTES (reference only) ===
${creatureNotes.join('\n') || '- No creatures of note today.'}

${morningBlock}

${afternoonBlock}

${nightBlock}

Write the chapter as flowing prose in three movements. Let each encounter cause something to happen — a decision, a change of route, a cost.
If the overnight location is a town or inn, let the narrative reflect this — a meal taken, a fire shared, a bed found. If it is a fortress or ruin, let it colour the night accordingly.

${language === 'spanish' ? 'Please write the entire response in Spanish.' : ''}`;

  // Use default SYSTEM_PROMPT for all characters (character-specific narrator lens is in user message)
  return { system: SYSTEM_PROMPT, user };
}
