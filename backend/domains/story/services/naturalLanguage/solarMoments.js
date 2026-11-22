// ============================================================================
// Solar moments — the phrase bank for the sun's own events
// ----------------------------------------------------------------------------
// Dawn and dusk are moments of the day like any other event; these are the
// fact-lines the narrator renders fresh ("reference only"). Keyed
// (light_kind × season) — the same idea as the climate phrase banks: the
// line carries the fact and the tone, never the digits.
// ============================================================================

const SOLAR_LINES = {
  dawn: {
    winter: [
      'the sun comes up late and low, a grey light arriving hours after the cold',
      'first light drags itself up past eight; the frost has the morning to itself first',
    ],
    spring: [
      'the light comes a little earlier each morning now',
      'a quick dawn; the sun is relearning the road north',
    ],
    summer: [
      'the sun was up long before him; the day is already wide',
      'first light came early and the birds were loud with it',
    ],
    autumn: [
      'the mornings are closing in; the light comes later than it did',
      'a slow dawn, pale behind the thinning leaves',
    ],
  },
  dusk: {
    winter: [
      'the light fails early; the cold sharpens as it goes',
      'the sun gives the day only a few grey hours before quitting',
    ],
    spring: [
      'the light lingers a little longer each evening',
      'the sun is slow to go now; the road keeps its light',
    ],
    summer: [
      'the light holds late; the day does not want to end',
      'dusk comes slow, the sun dragging itself down behind the hills',
    ],
    autumn: [
      'the light goes early now; the evenings are drawing in',
      'the sun quits the plain early, and the dark comes with the wind',
    ],
  },
  polar_night: [
    'the sun does not rise today; the sky only pales for an hour around noon and darkens again',
    'there is no dawn — the day is a long night with one grey hour in it',
  ],
  midnight_sun: [
    'the sun slides along the horizon and climbs again; there is no dark',
    'no night comes; the light wheels low overhead and does not go',
  ],
};

/** One fact-line for the solar moment, or null when none is authored.
 * dawn/dusk banks key by season; the polar kinds are seasonless flat lists. */
export function solarLine(lightKind, season, rng = Math.random) {
  const bank = SOLAR_LINES[lightKind] || {};
  const lines = Array.isArray(bank) ? bank : (bank[season] || []);
  if (!lines.length) return null;
  return lines[Math.floor(rng() * lines.length)];
}
