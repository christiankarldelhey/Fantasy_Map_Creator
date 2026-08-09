// ============================================================================
// Water crossings: rivers bridged, streams forded
// ----------------------------------------------------------------------------
// Rivers always get a bridge; streams are forded, with an occasional plank
// crossing so the same stream does not always read the same way.
// ============================================================================

import { timeOfDayPhrase } from './dayPhases.js';
import { capitalize, descriptionSuffix, pick } from './text.js';

// Generic names carry no colour, so they are treated as unnamed water.
const GENERIC_WATER_NAMES = new Set(['river', 'stream']);

// Odds that a stream is spanned by a rough plank bridge instead of forded.
const PLANK_BRIDGE_CHANCE = 0.3;

const bridgeVariants = (named, when) => {
  const subject = named || 'A river';
  const river = named || 'a river';
  return [
    `${subject} is crossed by a stone bridge ${when}.`,
    `A bridge carries the road over ${river} ${when}.`,
    `${capitalize(river)} runs swift beneath a wooden bridge, crossed ${when}.`,
  ];
};

const plankVariants = (named, when) => {
  const stream = named || 'a stream';
  return [
    `A rough plank bridge spans ${stream} ${when}.`,
    `A low timber crossing takes the road over ${stream} ${when}.`,
  ];
};

const fordVariants = (named, when) => {
  const subject = named || 'A stream';
  const stream = named || 'a stream';
  return [
    `${subject} is forded ${when} — the water cold and quick underfoot.`,
    `A shallow crossing of ${stream} ${when}; the stones slippery beneath.`,
    `${capitalize(stream)} must be waded ${when}, the current pulling at the ankles.`,
  ];
};

/** The crossing's own name, or null when it is generic/absent. */
function distinctiveName(name) {
  if (!name) return null;
  return GENERIC_WATER_NAMES.has(name.toLowerCase()) ? null : name;
}

/** One bullet line for a single crossing. */
function describeCrossing(crossing, rng) {
  const when = timeOfDayPhrase(crossing.hour_float);
  const named = distinctiveName(crossing.name);

  let variants;
  if (crossing.crossing_type === 'bridge') {
    variants = bridgeVariants(named, when);
  } else {
    variants = rng() < PLANK_BRIDGE_CHANCE
      ? plankVariants(named, when)
      : fordVariants(named, when);
  }

  return `- ${pick(variants, rng)}${descriptionSuffix(crossing.description)}`;
}

/**
 * Describe the rivers and streams crossed during the day.
 * @param {Array<{name:string|null, crossing_type:string, hour_float:number, description?:string}>} crossings
 * @param {() => number} [rng]
 * @returns {string|null}
 */
export function describeWaterCrossings(crossings, rng = Math.random) {
  if (!Array.isArray(crossings) || crossings.length === 0) return null;
  return crossings.map((c) => describeCrossing(c, rng)).join('\n');
}

const lakeVariants = (named, when) => {
  const water = named || 'a lake';
  const subject = named || 'A lake';
  return [
    `${subject} is sighted off the road ${when}, still and grey as slate.`,
    `The road passes near ${water} ${when}, its shore quiet and reedy.`,
    `A glint of water through the trees: ${water} lies close by ${when}.`,
  ];
};

const shoreRefillVariants = (named, when) => {
  const water = named || 'the lake';
  return [
    `At ${water} the waterskin is refilled ${when}.`,
    `${capitalize(water)} provides clear water and the flask is topped up ${when}.`,
  ];
};

function describeSource(source, rng, refilled = false) {
  const when = timeOfDayPhrase(source.hour_float);
  const named = distinctiveName(source.name);
  const variants = refilled ? shoreRefillVariants(named, when) : lakeVariants(named, when);
  return `- ${pick(variants, rng)}${descriptionSuffix(source.description)}`;
}

/**
 * Describe lakes or shores that are close enough to matter.
 * @param {Array<{name:string|null, type:string, hour_float:number, description?:string}>} sources
 * @param {() => number} [rng]
 * @param {boolean} [refilled] - whether any of them actually refilled the flask
 * @returns {string|null}
 */
export function describeWaterSources(sources, rng = Math.random, refilled = false) {
  if (!Array.isArray(sources) || sources.length === 0) return null;
  return sources.map((s) => describeSource(s, rng, refilled)).join('\n');
}
