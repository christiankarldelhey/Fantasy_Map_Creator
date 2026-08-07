// ============================================================================
// Today's way in
// ----------------------------------------------------------------------------
// One sensory anchor for the chapter's opening, rotated per day so the narrator
// does not always enter the morning through the same door (usually the weather).
// ============================================================================

import { pick } from './text.js';

const OPENING_FOCI = [
  'the sound of the place — what the traveller hears, not what he sees',
  'the light — how the day opens, turns, and closes',
  'the body of the traveller — weariness, breath, the weight of the pack',
  'a small object or detail on the road',
  'the silence or absence — what is not there, what the land withholds',
  'how the traveller wakes up, or what it takes for breakfast',
];

/**
 * Pick the narrative focus for the day's opening.
 * @param {() => number} [rng]
 * @returns {string}
 */
export function pickTodaysWayIn(rng = Math.random) {
  return pick(OPENING_FOCI, rng);
}
