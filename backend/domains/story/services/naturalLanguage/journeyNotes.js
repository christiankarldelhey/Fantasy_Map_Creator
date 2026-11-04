// ============================================================================
// Journey continuity notes — the "In Chapter N…" line
// ----------------------------------------------------------------------------
// Restored to Node as part of the world-voice migration (issue #52): the
// story-engine Python copy lives in app/prompt/sections/journey.py. Stateless
// fallback only — mind-driven prompts recap yesterday inside the lens (C22).
// ============================================================================

const PHRASES = {
  'journey.previous_day':
    'In Chapter {chapter} (yesterday), the traveller journeyed through: '
    + '{regions}. They passed near: {locations}. Notable encounters/sights: '
    + '{encounters}.',
  'journey.continuity_note':
    "Please use this context to maintain narrative continuity from "
    + "yesterday's events.",
  'journey.none_regions': 'unknown lands',
  'journey.none_locations': 'no major settlements',
  'journey.none_encounters': 'no major encounters',
};

function phrase(key, fmt = {}) {
  const template = PHRASES[key];
  if (template == null) return '';
  return template.replace(/\{(\w+)\}/g, (m, k) => (fmt[k] != null ? fmt[k] : m));
}

/**
 * Plain, non-AI summary of the previous day, used for narrative
 * continuity. Names arrive as strings or {name} objects; encounters as
 * entity names or {entity:{name}}.
 */
export function previousDaySummary(previousDay) {
  const names = (list, fallbackKey) => {
    const flat = (list || [])
      .map((item) => (typeof item === 'string'
        ? item
        : (item && (item.name || (item.entity && item.entity.name)))))
      .filter(Boolean);
    return flat.join(', ') || PHRASES[fallbackKey];
  };

  return phrase('journey.previous_day', {
    chapter: previousDay.day_number,
    regions: names(previousDay.regions, 'journey.none_regions'),
    locations: names(previousDay.locations, 'journey.none_locations'),
    encounters: names(previousDay.encounters, 'journey.none_encounters'),
  });
}

/** === JOURNEY CONTEXT === — destination plus yesterday's summary. */
export function journeyContextSection(destination, previousDay = null) {
  const lines = [`Ultimate Destination: ${destination}`];
  if (previousDay) {
    lines.push(previousDaySummary(previousDay));
    lines.push(PHRASES['journey.continuity_note']);
  }
  return `=== JOURNEY CONTEXT ===\n${lines.join('\n')}\n\n`;
}
