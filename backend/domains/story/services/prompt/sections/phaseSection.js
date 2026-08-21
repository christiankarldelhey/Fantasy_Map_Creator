// ============================================================================
// Phase blocks (MORNING / AFTERNOON / NIGHT AT CAMP)
// ----------------------------------------------------------------------------
// The day reaches the narrator in chronological order: each block gathers the
// weather, terrain, places, water and encounters that belong to that third of
// the day. Empty subsections are omitted so the model is never handed filler.
// ============================================================================

import {
  collectLocationNotes,
  collectTerrainNotes,
  describeWaterCrossings,
} from '../../naturalLanguage/index.js';
import { encountersSection } from './encountersSection.js';

/**
 * Build one chronological block for a phase of the day.
 * @param {Object} params
 * @param {string} params.title - block heading, e.g. 'MORNING'
 * @param {string|null} params.weather - one-phrase weather summary for the phase
 * @param {Array} params.biomes - biomes crossed during the phase
 * @param {Array} params.locations - locations passed during the phase
 * @param {Array} params.waterCrossings - crossings made during the phase
 * @param {Array} params.encounters - encounters resolved during the phase
 * @param {Array} params.regions - the day's regions (for regional phrasing)
 * @param {Object} params.terrainPhrases - regional phrase table
 * @param {() => number} params.rng
 * @param {string} [params.extraLead] - block-specific text (e.g. the camp)
 * @param {string} [params.meal] - what was eaten and drunk in this phase
 * @returns {string}
 */
export function phaseBlock({
  title,
  weather,
  biomes = [],
  locations = [],
  waterCrossings = [],
  encounters = [],
  regions = [],
  terrainPhrases = {},
  rng = Math.random,
  extraLead = '',
  meal = '',
}) {
  const subsections = [];

  if (weather) {
    subsections.push(`Weather: ${weather}`);
  }

  if (biomes.length) {
    const terrainNotes = collectTerrainNotes(biomes, [], regions, terrainPhrases, rng);
    if (terrainNotes.length) subsections.push(`Terrain:\n${terrainNotes.join('\n')}`);
  }

  if (locations.length) {
    subsections.push(`Locations:\n${collectLocationNotes(locations).join('\n')}`);
  }

  if (waterCrossings.length) {
    const water = describeWaterCrossings(waterCrossings, rng);
    if (water) subsections.push(`Water crossings:\n${water}`);
  }

  if (meal) subsections.push(`Food and drink:\n${meal}`);

  if (extraLead) subsections.push(extraLead);

  subsections.push(`Encounters:\n${encountersSection(encounters)}`);

  return `=== ${title} ===\n${subsections.join('\n\n')}`;
}
