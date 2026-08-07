// ============================================================================
// Place notes: lands crossed, settlements passed, and the overnight camp
// ----------------------------------------------------------------------------
// The proximity wording matters narratively: distance_km === 0 means the road
// runs *through* the settlement, which the narrator must treat as a real event
// rather than scenery.
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

/**
 * The lands crossed in order, each with its character (description_summary).
 * @param {Array<string|{name:string, description_summary?:string}>} regions
 * @returns {string}
 */
export function describeRegions(regions) {
  if (!Array.isArray(regions) || regions.length === 0) {
    return 'The day passes through unnamed country.';
  }

  return regions
    .map((region) => {
      const name = typeof region === 'string' ? region : region.name;
      const summary = typeof region === 'string' ? null : region.description_summary;
      return summary && summary.trim() ? `- ${name}: ${summary.trim()}` : `- ${name}`;
    })
    .join('\n');
}

/**
 * Bullet-ready notes on the settlements and landmarks along the day's road.
 * @param {Array<{name:string, type?:string, hour_float?:number, distance_km?:number, description?:string}>} locations
 * @returns {string[]}
 */
export function collectLocationNotes(locations) {
  if (!Array.isArray(locations) || locations.length === 0) {
    return ['- No settlements or landmarks of note.'];
  }

  return locations.map((l) => {
    const kind = l.type ? ` (${readableType(l.type)})` : '';
    const proximity = proximityPhrase(l.distance_km);
    const when = timeOfDayPhrase(l.hour_float);
    return `- ${l.name}${kind}: ${proximity}, ${when}.${descriptionSuffix(l.description)}`;
  });
}

/** The shelter (or lack of it) the location offers for the night. */
function shelterPhrase(location) {
  return location.indoor
    ? `There is likely a tavern, inn or hall where ${location.name} offers shelter and warmth for the night.`
    : 'The character may shelter within its walls or in its shadow for the night.';
}

const NO_SHELTER_NOTE = 'No shelter of note lies near the day\'s end. The night is spent under open sky, with whatever cover the land affords.';

/**
 * Describe where the character spends the night, plus any reference material
 * from the resolved places_interactions row.
 * @param {Object|null} location - { name, type, distance_km, description, indoor }
 * @param {Object|null} [interaction] - resolved places_interactions row
 * @returns {string}
 */
export function describeOvernightLocation(location, interaction = null) {
  let text = NO_SHELTER_NOTE;

  if (location) {
    const kind = location.type ? readableType(location.type) : 'place';
    // Only the first sentence of the description: the rest is for the narrator.
    const firstSentence = location.description && location.description.trim()
      ? ` ${location.description.trim().split('.')[0]}.`
      : '';
    text = `Before nightfall, the road reaches ${location.name} (${kind}), ${location.distance_km} km from the day's end.${firstSentence} ${shelterPhrase(location)}`;
  }

  if (interaction?.description) {
    const title = interaction.title ? `Title: ${interaction.title}\n` : '';
    text += `\n\nOvernight reference material (render fresh — never copy the wording):\n${title}${interaction.description}`;
  }

  return text;
}
