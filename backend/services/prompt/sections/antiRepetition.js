// ============================================================================
// Anti-repetition sections
// ----------------------------------------------------------------------------
// Two levers against the model settling into a groove: an explicit avoid-list of
// phrases it already over-used in this trip (detected by phraseVices), and a
// closing instruction that rotates per day so even the structural framing
// changes wording. The three-movement rule survives in every variant.
// ============================================================================

const CLOSING_VARIANTS = [
  'Write the chapter as flowing prose in three movements. Let each encounter cause something to happen — a decision, a change of route, a cost.',
  'Three movements: morning, afternoon, night. Each encounter must leave a mark — on the route, on the body, or on what the traveller now knows.',
  'Prose in three movements. No encounter passes without consequence. The day must end differently than it began.',
  'Three prose movements. What happens must cost something. An encounter that resolves without effect is not an encounter — it is scenery.',
];

/** Positive modulo, so day 0 or a negative day still lands inside the list. */
function rotate(list, dayNumber) {
  const n = Number.isInteger(dayNumber) ? dayNumber : 1;
  return list[((n % list.length) + list.length) % list.length];
}

/**
 * The avoid-list of over-used phrases ('' when there is nothing to avoid).
 * @param {string[]} bannedPhrases
 * @returns {string}
 */
export function bannedPhrasesSection(bannedPhrases) {
  if (!Array.isArray(bannedPhrases) || bannedPhrases.length === 0) return '';
  const list = bannedPhrases.map((p) => `"${p}"`).join(', ');
  return `=== AVOID THESE PHRASES ===\nThese phrases (and close variants) were already used in earlier chapters. Do not reuse them; find fresh wording: ${list}.\n\n`;
}

/**
 * The closing instruction for the chapter, rotated per day.
 * @param {number} dayNumber
 * @returns {string}
 */
export function closingInstruction(dayNumber) {
  return rotate(CLOSING_VARIANTS, dayNumber);
}
