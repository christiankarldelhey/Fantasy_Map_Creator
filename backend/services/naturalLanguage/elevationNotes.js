// ============================================================================
// Elevation notes: the physical cost of the day's climbing
// ----------------------------------------------------------------------------
// Two independent readings are combined: the *effort* (how much the road rose
// and fell) and the *absolute height* reached (thin air, permanent cold).
// Returns null when the ground was flat enough not to be worth a word.
// ============================================================================

import { pick } from './text.js';

// Above this much gain/loss in a day the climb is "hard" rather than "steady".
const HEAVY_CHANGE_M = 300;

const ROLLING_PHRASES = [
  'The road rises and falls hard through the day — a gruelling march of ascent and descent that leaves the legs heavy by evening.',
  'Climb follows descent follows climb; the legs are never given peace.',
  'The way offers no level ground. Every hour is either up or down, and the body pays for it.',
];

const HARD_ASCENT_PHRASES = [
  'The way climbs hard for much of the day — a long, taxing ascent that tests the lungs and legs.',
  'A relentless uphill march; the ground rises and does not level.',
  'The ascent is long and unforgiving — lungs labouring, pace reduced to a grind.',
];

const HARD_DESCENT_PHRASES = [
  'The road descends steeply and at length — knees and balance are tested on rough, falling ground.',
  'A long downhill that punishes the joints as surely as any climb.',
  'The descent is steep and relentless; loose stone and the angle of the slope demand constant care.',
];

const STEADY_ASCENT_PHRASES = [
  'The way rises through the day, a steady climb that makes the miles feel longer than they are.',
  'A gradual but persistent ascent runs through most of the day.',
  'The road trends upward all morning; by afternoon the altitude is felt in the step.',
];

const STEADY_DESCENT_PHRASES = [
  'The road loses height through the day, a long descent that eases the pace but tires the joints.',
  'A steady descent through most of the march — easier on the lungs, harder on the knees.',
  'The way falls away gradually; the valley below grows closer with every hour.',
];

// Highest band first: the first threshold reached wins.
const ALTITUDE_BANDS = [
  {
    aboveM: 2000,
    phrases: [
      'Two thousand metres above the lowlands — a height where few roads run and fewer travellers pass. The cold is punishing and the air thin enough to slow thought as well as foot.',
      'At this altitude the world below is lost in haze; the cold here is not weather but a permanent condition of the stone.',
      'Above two thousand metres: the peaks are no longer above but around. Survival demands attention to every step.',
    ],
  },
  {
    aboveM: 1500,
    phrases: [
      'Fifteen hundred metres and more: the lungs work harder, the cold bites deeper, and the sky feels closer than the earth.',
      'At this height clouds pass at eye level; the body labours for air it cannot quite find.',
      'The road climbs into the realm of snow and bare rock, where breath comes short and the cold is constant.',
    ],
  },
  {
    aboveM: 1000,
    phrases: [
      'The road at its highest runs above a thousand metres of open sky — the air noticeably thinner and the cold sharper.',
      'Above a thousand metres, the world opens wide below; the wind carries no warmth up here.',
      'The highest point of the day sits well above the tree-line; the air is clear and thin.',
    ],
  },
];

/** Pick the phrase set matching the day's gain/loss shape. */
function effortPhrases(gain, loss) {
  const hardGain = gain > HEAVY_CHANGE_M;
  const hardLoss = loss > HEAVY_CHANGE_M;
  if (hardGain && hardLoss) return ROLLING_PHRASES;
  if (hardGain) return HARD_ASCENT_PHRASES;
  if (hardLoss) return HARD_DESCENT_PHRASES;
  return gain > loss ? STEADY_ASCENT_PHRASES : STEADY_DESCENT_PHRASES;
}

/** Highest elevation sampled across the day, in metres. */
function peakElevation(profile) {
  return Math.max(profile.dawn_m || 0, profile.midday_m || 0, profile.dusk_m || 0);
}

/**
 * Describe the effort and altitude of the day's road, or null when flat.
 * @param {{ total_gain_m:number, total_loss_m:number, significant:boolean,
 *   dawn_m?:number, midday_m?:number, dusk_m?:number }|null} profile
 * @param {() => number} [rng]
 * @returns {string|null}
 */
export function describeElevation(profile, rng = Math.random) {
  if (!profile) return null;

  const parts = [];

  if (profile.significant) {
    parts.push(pick(effortPhrases(profile.total_gain_m, profile.total_loss_m), rng));
  }

  const peak = peakElevation(profile);
  const band = ALTITUDE_BANDS.find((b) => peak >= b.aboveM);
  if (band) parts.push(pick(band.phrases, rng));

  return parts.length ? parts.join(' ') : null;
}
