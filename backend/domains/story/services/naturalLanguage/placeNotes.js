// ============================================================================
// Place notes: lands crossed, settlements passed, and the overnight camp
// ----------------------------------------------------------------------------
// Restored to Node as part of the world-voice migration (issue #52): the
// mind-engine Python twin was removed in #54 — this module is the only copy.
// ============================================================================

import { timeOfDayPhrase } from './dayPhases.js';
import { descriptionSuffix, readableType } from './text.js';

// Beyond this distance the traveller only sees the place on the horizon.
const DISTANT_SIGHTING_KM = 1;

const PROXIMITY_THROUGH = 'passes through';
const PROXIMITY_CLOSE = 'passed close by';
const PROXIMITY_DISTANT = 'passed at some distance';

/** How the traveller met this place, from its distance to the road. */
function proximityPhrase(distanceKm) {
  if (distanceKm === 0) return PROXIMITY_THROUGH;
  if (distanceKm != null && distanceKm > DISTANT_SIGHTING_KM) return PROXIMITY_DISTANT;
  return PROXIMITY_CLOSE;
}

/** The lands crossed in order, each with its character (description_summary). */
export function describeRegions(regions) {
  if (!Array.isArray(regions) || regions.length === 0) {
    return 'The day passes through unnamed country.';
  }

  const lines = [];
  for (const region of regions) {
    const name = typeof region === 'string' ? region : region.name;
    const summary = typeof region === 'string' ? null : region.description_summary;
    if (summary && summary.trim()) {
      lines.push(`- ${name}: ${summary.trim()}`);
    } else {
      lines.push(`- ${name}`);
    }
  }
  return lines.join('\n');
}

/** Bullet-ready notes on the settlements and landmarks along the day's road. */
export function collectLocationNotes(locations) {
  if (!Array.isArray(locations) || locations.length === 0) {
    return ['- No settlements or landmarks of note.'];
  }

  const notes = [];
  for (const l of locations) {
    const kind = l.type ? ` (${readableType(l.type)})` : '';
    // 'entered' beats distance math: the traveller walked IN, whatever
    // the off-route metres say. 'hostile' is the opposite — an enemy
    // place skirted from outside, never entered.
    const when = timeOfDayPhrase(l.hour_float);
    let proximity;
    if (l.entered) {
      proximity = `reaches it ${when} and stays — the day ends here`;
    } else if (l.hostile) {
      proximity = `passed outside, ${when} — enemy country, no welcome there`;
    } else {
      proximity = `${proximityPhrase(l.distance_km)}, ${when}`;
    }
    notes.push(`- ${l.name}${kind}: ${proximity}.${descriptionSuffix(l.description)}`);
  }
  return notes;
}

/** The shelter (or lack of it) the location offers for the night. */
function shelterPhrase(location) {
  if (location.indoor) {
    return `There is likely a tavern, inn or hall where ${location.name} offers shelter and warmth for the night.`;
  }
  return 'The character may shelter within its walls or in its shadow for the night.';
}

const NO_SHELTER_NOTE = "No shelter of note lies near the day's end. The night is spent under open sky, with whatever cover the land affords.";

/**
 * Describe where the character spends the night, plus any reference
 * material from the resolved places_interactions row.
 */
export function describeOvernightLocation(location, interaction = null) {
  let text = NO_SHELTER_NOTE;

  if (location) {
    const kind = location.type ? readableType(location.type) : 'place';
    const description = location.description;
    const firstSentence = description && description.trim()
      ? ` ${description.trim().split('.')[0]}.`
      : '';
    text = `Before nightfall, the road reaches ${location.name} (${kind}), ${location.distance_km} km from the day's end.${firstSentence} ${shelterPhrase(location)}`;
  }

  if (interaction && interaction.description) {
    const title = interaction.title ? `Title: ${interaction.title}\n` : '';
    text += `\n\nOvernight reference material (render fresh — never copy the wording):\n${title}${interaction.description}`;
  }

  return text;
}
