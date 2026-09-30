// ============================================================================
// The character as the narrator needs them (owner: game)
// ----------------------------------------------------------------------------
// One query, one shape. character_state and entities are game tables —
// the story domain reaches this row only through story/adapters/
// gameClient.js, so no SQL on game data lives outside this domain.
// ============================================================================

import pool from '../../../../db.js';

const NARRATOR_CHARACTER_QUERY = `
  SELECT c.id, c.name, c.slug, c.description, c.gender,
         c.system_prompt, c.introduction_instructions,
         c.resistance, c.permadeath, c.energy, c.shadow,
         c.skill_tracking, c.skill_persuasion, c.skill_ranged, c.skill_melee, c.skill_lore,
         c.fatigue, c.wounded,
         e.name AS entity_name,
         -- A clone inherits its template's mind archetype: 'celebrian-user-7'
         -- still thinks through the 'celebrian' mold (C18).
         COALESCE(t.slug, c.slug) AS brain_profile
  FROM character_state c
  LEFT JOIN entities e ON e.id = c.entity_id
  LEFT JOIN character_state t ON t.id = c.template_id
  WHERE c.id = $1
`;

/**
 * Load the character fields the prompt needs (bio, lens, linked entity name).
 * @param {number|null} characterId
 * @returns {Promise<Object>} the character row, or {} when there is none
 */
export async function loadNarratorCharacter(characterId) {
  if (!characterId) return {};
  const { rows } = await pool.query(NARRATOR_CHARACTER_QUERY, [characterId]);
  return rows[0] || {};
}
