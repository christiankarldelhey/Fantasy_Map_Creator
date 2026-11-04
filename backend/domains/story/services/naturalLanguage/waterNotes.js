// ============================================================================
// Water crossings: rivers bridged, streams forded
// ----------------------------------------------------------------------------
// Restored to Node as part of the world-voice migration (issue #52): the
// mind-engine Python twin was removed in #54 — this module is the only copy.
// ============================================================================

import { timeOfDayPhrase } from './dayPhases.js';
import { capitalize, descriptionSuffix, pick } from './text.js';

// Generic names carry no colour, so they are treated as unnamed water.
const GENERIC_WATER_NAMES = new Set(['river', 'stream']);

// Odds that a stream is spanned by a rough plank bridge instead of forded.
const PLANK_BRIDGE_CHANCE = 0.3;

function bridgeVariants(named, when) {
  const subject = named || 'A river';
  const river = named || 'a river';
  return [
    `${subject} is crossed by a stone bridge ${when}.`,
    `A bridge carries the road over ${river} ${when}.`,
    `${capitalize(river)} runs swift beneath a wooden bridge, crossed ${when}.`,
  ];
}

function plankVariants(named, when) {
  const stream = named || 'a stream';
  return [
    `A rough plank bridge spans ${stream} ${when}.`,
    `A low timber crossing takes the road over ${stream} ${when}.`,
  ];
}

function fordVariants(named, when) {
  const subject = named || 'A stream';
  const stream = named || 'a stream';
  return [
    `${subject} is forded ${when} — the water cold and quick underfoot.`,
    `A shallow crossing of ${stream} ${when}; the stones slippery beneath.`,
    `${capitalize(stream)} must be waded ${when}, the current pulling at the ankles.`,
  ];
}

/** The crossing's own name, or null when it is generic/absent. */
function distinctiveName(name) {
  if (!name) return null;
  return GENERIC_WATER_NAMES.has(name.toLowerCase()) ? null : name;
}

function describeCrossing(crossing, rng) {
  const when = timeOfDayPhrase(crossing.hour_float);
  const named = distinctiveName(crossing.name);

  const variants = crossing.crossing_type === 'bridge'
    ? bridgeVariants(named, when)
    : rng() < PLANK_BRIDGE_CHANCE
      ? plankVariants(named, when)
      : fordVariants(named, when);

  return `- ${pick(variants, rng)}${descriptionSuffix(crossing.description)}`;
}

/** Describe the rivers and streams crossed during the day. */
export function describeWaterCrossings(crossings, rng = Math.random) {
  if (!Array.isArray(crossings) || crossings.length === 0) return null;
  return crossings.map((c) => describeCrossing(c, rng)).join('\n');
}
