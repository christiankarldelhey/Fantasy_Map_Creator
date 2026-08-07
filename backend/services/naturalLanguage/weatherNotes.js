// ============================================================================
// Weather notes, one short phrase per narrative phase
// ----------------------------------------------------------------------------
// Weather is atmosphere, never a report: no figures and no clock times leave
// this module. The night phrase may carry a moon note when the sky allows it.
// ============================================================================

import { innerClimate, meanOf, sumOf } from '../climateSample.js';
import { NARRATIVE_PHASES, emptyPhaseBuckets, phaseForClimateSample } from './dayPhases.js';
import { formatMoonNightPhrase } from './moonNotes.js';
import { joinList } from './text.js';

const TEMPERATURE_BANDS = [
  { below: 2, phrase: 'bitter cold' },
  { below: 8, phrase: 'cold' },
  { below: 15, phrase: 'cool' },
  { below: 22, phrase: 'mild' },
  { below: 29, phrase: 'warm' },
  { below: Infinity, phrase: 'hot' },
];

const CLOUD_BANDS = [
  { below: 25, phrase: 'clear skies' },
  { below: 60, phrase: 'partly cloudy' },
  { below: 90, phrase: 'mostly overcast' },
  { below: Infinity, phrase: 'heavy cloud cover' },
];

const WINDY_SPEED_MIN = 18;
const WET_PRECIPITATION_MIN = 0.2;

/** First band whose threshold the value falls under, or null for missing data. */
function bandPhrase(bands, value) {
  if (value == null) return null;
  return bands.find((b) => value < b.below)?.phrase ?? null;
}

/**
 * Summarise weather records into a short phrase like "cool, partly cloudy".
 * @param {Array} records - unwrapped weather records
 * @returns {string|null}
 */
export function summariseWeather(records) {
  const meanTemp = meanOf(records.map((w) => w.temperature_2m));
  const meanCloud = meanOf(records.map((w) => w.cloud_cover));
  const meanWind = meanOf(records.map((w) => w.wind_speed_10m));
  const totalPrec = sumOf(records.map((w) => w.precipitation || 0));

  const parts = [
    bandPhrase(TEMPERATURE_BANDS, meanTemp),
    bandPhrase(CLOUD_BANDS, meanCloud),
    meanWind != null && meanWind > WINDY_SPEED_MIN ? 'windy' : null,
  ].filter(Boolean);

  if (totalPrec > WET_PRECIPITATION_MIN) parts.push('wet');
  else if (totalPrec > 0) parts.push('a passing shower');

  return parts.length ? joinList(parts) : null;
}

/**
 * Group weather into the three narrative phases and return one summary phrase
 * per phase (null when there is no data for it).
 * @param {Array} climateArray - hourly samples as stored on trip_days.climate
 * @param {{phase:string, illumination:number}} [moon]
 * @returns {{morning: string|null, afternoon: string|null, night: string|null}}
 */
export function collectClimateNotesByPhase(climateArray, moon = null) {
  const notes = { morning: null, afternoon: null, night: null };
  if (!Array.isArray(climateArray) || climateArray.length === 0) return notes;

  const byPhase = emptyPhaseBuckets();
  for (const sample of climateArray) {
    const weather = innerClimate(sample);
    if (weather) byPhase[phaseForClimateSample(sample)].push(weather);
  }

  for (const phase of NARRATIVE_PHASES) {
    if (!byPhase[phase].length) continue;
    let summary = summariseWeather(byPhase[phase]);
    if (phase === 'night' && summary && moon) {
      const meanCloud = meanOf(byPhase.night.map((w) => w.cloud_cover));
      const moonPhrase = formatMoonNightPhrase(moon, meanCloud);
      if (moonPhrase) summary = `${summary} — ${moonPhrase}`;
    }
    notes[phase] = summary;
  }

  return notes;
}
