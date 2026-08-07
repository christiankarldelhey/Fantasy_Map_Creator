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
 * The single element the chapter's opening must be built around.
 * @param {string} focus - from pickTodaysWayIn()
 * @returns {string}
 */
export function todaysWayInSection(focus) {
  return `=== TODAY'S WAY IN ===
Open the chapter's morning movement in the middle of an action, not at dawn or with the weather. Build today's landscape around ONE element: ${focus}. Do not inventory the scenery — enter through that one sense and let the rest stay in shadow.`;
}

/**
 * Opening line of TODAY'S ROAD for an ordinary (non-terminal) day.
 * @param {number} dayNumber
 * @returns {string}
 */
export function roadIntro(dayNumber) {
  return `Day ${dayNumber}. Narrate a single day's journey in three movements: morning, afternoon, and the night at camp.`;
}
