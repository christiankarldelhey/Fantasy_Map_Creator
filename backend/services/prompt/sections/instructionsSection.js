// ============================================================================
// Fixed instruction sections
// ----------------------------------------------------------------------------
// Constant blocks of the user message: how to treat the land notes, how to treat
// encounters, and the per-day sensory way in. Kept here so the chapter template
// in index.js reads as a table of contents rather than a wall of text.
// ============================================================================

export const LAND_NOTES_RULES = `=== HOW TO USE THE LAND NOTES ===
The notes below are REFERENCE ONLY. Never copy their wording into the prose. Render them fresh in your own words. They tell you what is there, not how to say it. The day is laid out chronologically: the MORNING, AFTERNOON and NIGHT AT CAMP blocks each gather the terrain, weather, water and encounters that belong to that part of the day. Narrate them in that order.`;

export const ENCOUNTER_RULES = `=== ENCOUNTER RULES ===
Render the given form, dialogue and outcome for each encounter. Do not invent a different form. Vary the beats across the chapter. The way an encounter resolves must differ from how recent encounters resolved.`;

export const OVERNIGHT_COLOUR_NOTE = 'If the overnight location is a town or inn, let the narrative reflect this — a meal taken, a fire shared, a bed found. If it is a fortress or ruin, let it colour the night accordingly.';

export const SPANISH_INSTRUCTION = 'Please write the entire response in Spanish.';

/**
 * The single element the chapter's opening must be built around, plus the
 * grammatical shape of the first sentence and the openings already spent.
 * @param {Object} params
 * @param {string} params.focus - from pickTodaysWayIn()
 * @param {string} params.strategy - from pickOpeningStrategy()
 * @param {string} [params.characterName] - the traveller's name
 * @param {string[]} [params.previousOpenings] - first sentences of earlier chapters
 * @returns {string}
 */
export function todaysWayInSection({ focus, strategy, characterName = '', previousOpenings = [] }) {
  const nameRule = characterName
    ? ` Never open the chapter with "${characterName}" as the first word, and never open with ${characterName} walking, advancing or setting out — the journey is already in motion; enter it sideways.`
    : ' Never open the chapter with the traveller\'s name as the first word, and never open with the traveller walking, advancing or setting out.';

  const openingsBlock = previousOpenings.length
    ? `\nEarlier chapters opened with these sentences — today's first sentence must differ from ALL of them in structure, subject and rhythm:\n${previousOpenings.map((s) => `- "${s}"`).join('\n')}`
    : '';

  return `=== TODAY'S WAY IN ===
Build today's opening around ONE element: ${focus}. Shape of the first sentence: ${strategy}.${nameRule} Do not inventory the scenery — enter through that one sense and let the rest stay in shadow.${openingsBlock}`;
}

/**
 * Opening line of TODAY'S ROAD for an ordinary (non-terminal) day.
 * @param {number} dayNumber
 * @returns {string}
 */
export function roadIntro(dayNumber) {
  return `Day ${dayNumber}. Narrate a single day's journey in three movements: morning, afternoon, and the night at camp.`;
}
