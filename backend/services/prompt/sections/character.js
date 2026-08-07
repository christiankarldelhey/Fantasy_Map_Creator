// ============================================================================
// Character sections
// ----------------------------------------------------------------------------
// Who is walking, and through whose eyes the chapter is told. The lens is a
// perspective filter, not style rules — the prose style lives in SYSTEM_PROMPT.
// ============================================================================

const DEFAULT_CHARACTER_NAME = 'The Traveller';

/** The character's display name, with a safe fallback. */
export function characterName(character = {}) {
  return character.name || DEFAULT_CHARACTER_NAME;
}

/**
 * Header naming the character, their kind (linked entity) and their bio.
 * @param {{name?:string, entity_name?:string, description?:string}} character
 * @returns {string}
 */
export function characterHeaderSection(character = {}) {
  const name = characterName(character);
  const kind = character.entity_name ? `, ${character.entity_name}` : '';
  const bio = character.description ? `\n${character.description}` : '';
  return `=== ${name.toUpperCase()} ===\n${name}${kind}.${bio}\n\n`;
}

/**
 * The character-specific narrator lens ('' when the character has none).
 * @param {{name?:string, system_prompt?:string}} character
 * @returns {string}
 */
export function narratorLensSection(character = {}) {
  if (!character.system_prompt) return '';
  const name = characterName(character).toUpperCase();
  return `=== NARRATOR'S LENS FOR ${name} ===\n${character.system_prompt}\n\n`;
}
