// ============================================================================
// Journey framing sections
// ----------------------------------------------------------------------------
// Everything that tells the narrator *where this chapter sits in the journey*:
// the destination, yesterday's events, the season, and the special instructions
// for the first and last chapters.
// ============================================================================

const SPRING_MONTHS = [2, 3, 4];
const SUMMER_MONTHS = [5, 6, 7];
const AUTUMN_MONTHS = [8, 9, 10];

/**
 * The journey's destination, taken from the trip name ("Bree to Rivendell").
 * @param {string} [tripName]
 * @returns {string}
 */
export function destinationName(tripName) {
  if (!tripName) return 'their destination';
  const parts = tripName.split(' to ');
  return parts.length > 1 ? parts[parts.length - 1] : tripName;
}

/**
 * One sentence placing the day in the year.
 * @param {string|Date} date
 * @returns {string}
 */
export function seasonPhrase(date) {
  const month = new Date(date).getMonth();
  if (SPRING_MONTHS.includes(month)) return 'It is spring.';
  if (SUMMER_MONTHS.includes(month)) return 'It is summer.';
  if (AUTUMN_MONTHS.includes(month)) return 'It is autumn.';
  return 'It is the dead of winter.';
}

/**
 * Destination plus (when known) a plain summary of yesterday, for continuity.
 * @param {string} destination
 * @param {string|null} [previousDaySummary]
 * @returns {string}
 */
export function journeyContextSection(destination, previousDaySummary = null) {
  const lines = [`Ultimate Destination: ${destination}`];
  if (previousDaySummary) {
    lines.push(
      previousDaySummary,
      'Please use this context to maintain narrative continuity from yesterday\'s events.'
    );
  }
  return `=== JOURNEY CONTEXT ===\n${lines.join('\n')}\n\n`;
}

/** The character's own introduction instructions, with the destination filled in. */
function characterIntroduction(instructions, destination) {
  return instructions
    .replace(/their destination/g, destination)
    .replace(/her destination/g, destination);
}

/** Default opening instructions when the character has none of their own. */
function defaultIntroduction(characterName, destination) {
  return `This is the first day and the introduction of the entire journey.
In this chapter, please describe ${characterName}'s departure, their motivation, and their strong intention to reach ${destination}. Let the prose feel like a beginning, with hope or gravity as fits their personality.`;
}

/** Closing instructions for the chapter that reaches the destination. */
function arrivalInstructions(characterName, destination) {
  return `This is the final day and the conclusion of the entire journey!
${characterName} has finally reached their ultimate destination: ${destination}.
In this chapter, narrate their arrival at ${destination}. Give a deep, meaningful reflection on the long path walked, the obstacles overcome, and the achievement of their goal. This reflection must be highly aligned with and expressive of ${characterName}'s personality, bio, and background.`;
}

/**
 * Special instructions for the first and last chapters ('' for the days between).
 * @param {Object} params
 * @param {number} params.dayNumber
 * @param {boolean} params.isLastDay
 * @param {string} params.characterName
 * @param {string} params.destination
 * @param {string} [params.introductionInstructions] - character-specific opening
 * @returns {string}
 */
export function specialInstructionsSection({
  dayNumber,
  isLastDay,
  characterName,
  destination,
  introductionInstructions = null,
}) {
  if (dayNumber === 1) {
    const body = introductionInstructions
      ? characterIntroduction(introductionInstructions, destination)
      : defaultIntroduction(characterName, destination);
    return `=== SPECIAL INSTRUCTIONS (INTRODUCTION) ===\n${body}\n\n`;
  }

  if (isLastDay) {
    return `=== SPECIAL INSTRUCTIONS (THE JOURNEY'S END) ===\n${arrivalInstructions(characterName, destination)}\n\n`;
  }

  return '';
}

/**
 * Plain, non-AI summary of the previous day, used for narrative continuity.
 * @param {{day_number:number, regions?:Array, locations?:Array, encounters?:Array}} previousDay
 * @returns {string}
 */
export function previousDaySummary(previousDay) {
  const names = (list, fallback) => {
    const joined = (list || []).map((item) => item?.name).filter(Boolean).join(', ');
    return joined || fallback;
  };

  const regions = names(previousDay.regions, 'unknown lands');
  const locations = names(previousDay.locations, 'no major settlements');
  const encounters = names(
    (previousDay.encounters || []).map((e) => e.entity),
    'no major encounters'
  );

  return `In Chapter ${previousDay.day_number} (yesterday), the traveller journeyed through: ${regions}. They passed near: ${locations}. Notable encounters/sights: ${encounters}.`;
}
