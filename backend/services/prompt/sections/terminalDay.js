// ============================================================================
// Terminal day sections (the character dies in this chapter)
// ----------------------------------------------------------------------------
// A terminal chapter has no night at camp: the story must stop at the death.
// The instruction is repeated at the top, in the road intro and in the closing
// line, because a single mention is not reliably obeyed.
// ============================================================================

/**
 * Warning that the NIGHT AT CAMP block must be ignored.
 * @param {string} characterName
 * @returns {string}
 */
export function terminalNoticeSection(characterName) {
  return `=== FINAL DAY STRUCTURE ===\nBecause this is the final day, this chapter ends with ${characterName}'s death. Ignore the NIGHT AT CAMP block below. The narrative must stop at the moment of death; do not continue to overnight camp.\n\n`;
}

/**
 * Opening line of TODAY'S ROAD for a terminal day.
 * @param {number} dayNumber
 * @param {string} characterName
 * @returns {string}
 */
export function terminalRoadIntro(dayNumber, characterName) {
  return `Day ${dayNumber}. This is the final day. ${characterName} dies in this chapter. Narrate the morning and afternoon, then describe the death explicitly. Do not narrate a night at camp.`;
}

/**
 * Closing instruction for a terminal day, replacing the rotating variant.
 * @param {string} characterName
 * @returns {string}
 */
export function terminalClosingInstruction(characterName) {
  return `This is the final chapter. ${characterName} dies in this chapter. Narrate the death explicitly and end the story there. Do not describe a night at camp.`;
}
