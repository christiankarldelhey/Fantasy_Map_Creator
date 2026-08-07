// ============================================================================
// Encounters section
// ----------------------------------------------------------------------------
// Renders the already-resolved encounters of one phase. The mechanics are
// decided upstream (interactionResolver): the narrator's job is to dramatise the
// given form, dialogue seeds and outcome, never to change them.
// ============================================================================

// Dialogue fields, in the order they should reach the narrator. Each is optional.
const DIALOGUE_LINES = [
  { key: 'topic', label: 'TOPIC', hintKey: 'topic_prose_hint' },
  { key: 'npc_attitude', label: 'NPC ATTITUDE' },
  { key: 'concrete_content', label: 'CONTENT SEED' },
  { key: 'tension', label: 'TENSION' },
  { key: 'traveller_stance', label: 'TRAVELLER STANCE' },
];

/** "Warg (beast, night) in Eregion" — who was met, and where. */
function encounterHeader(encounter) {
  const entity = encounter.entity || {};
  const kind = entity.type || 'creature';
  const activity = entity.active || 'all-day';
  return `${entity.name} (${kind}, ${activity}) in ${encounter.region}`;
}

/** The optional dialogue seeds of an interaction, as indented reference lines. */
function dialogueLines(dialogueContent) {
  if (!dialogueContent) return [];

  return DIALOGUE_LINES.flatMap(({ key, label, hintKey }) => {
    const value = dialogueContent[key];
    if (!value) return [];
    const hint = hintKey && dialogueContent[hintKey] ? ` — ${dialogueContent[hintKey]}` : '';
    return [`    ${label}: ${value}${hint}`];
  });
}

/** One bullet block for a single encounter. */
function describeEncounter(encounter) {
  const header = `  * ${encounterHeader(encounter)}`;
  const interaction = encounter.interaction;
  if (!interaction) return `${header}.`;

  const entity = encounter.entity || {};
  const about = entity.description_summary || entity.description || '';

  const lines = [`${header}.`];
  if (about) lines.push(`    ABOUT: ${about}`);
  lines.push(`    FORM: ${interaction.form}. ${interaction.prose_hint}`);
  lines.push(...dialogueLines(interaction.dialogue_content));

  let block = lines.join('\n');
  if (interaction.outcome) {
    block += `\n\n    OUTCOME (narrate this, do not change it): ${interaction.outcome}.`;
  }
  return block;
}

/**
 * The encounters of one phase, grouped by night timing when present.
 * @param {Array} encounters - encounters belonging to a single phase
 * @returns {string}
 */
export function encountersSection(encounters) {
  const list = encounters || [];
  if (list.length === 0) return '  (no encounters)';

  const beforeSleep = list.filter((e) => e.night_timing === 'before_sleep');
  const midNight = list.filter((e) => e.night_timing === 'mid_night');

  // Day phases (and nights without timing) are a flat list.
  if (beforeSleep.length === 0 && midNight.length === 0) {
    return list.map(describeEncounter).join('\n');
  }

  const lines = [];
  if (beforeSleep.length) {
    lines.push('Before settling in:', ...beforeSleep.map(describeEncounter));
  }
  if (midNight.length) {
    lines.push('In the depth of night:', ...midNight.map(describeEncounter));
  }
  return lines.join('\n');
}
