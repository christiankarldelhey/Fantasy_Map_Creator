# ============================================================================
# Character sections
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/prompt/sections/characterSection.js.
# ============================================================================

DEFAULT_CHARACTER_NAME = 'The Traveller'


def character_name(character=None):
    """The character's display name, with a safe fallback."""
    character = character or {}
    return character.get('name') or DEFAULT_CHARACTER_NAME


def character_header_section(character=None):
    """Header naming the character, their kind (linked entity) and their bio."""
    character = character or {}
    name = character_name(character)
    kind = f", {character['entity_name']}" if character.get('entity_name') else ''
    bio = f"\n{character['description']}" if character.get('description') else ''
    return f'=== {name.upper()} ===\n{name}{kind}.{bio}\n\n'


def narrator_lens_section(character=None, mind_extra=''):
    """The character-specific narrator lens: the authored personality
    (system_prompt) fused with the mind's current state (mood, beliefs,
    what stirs, needs) when a mind is driving — one block, one voice
    ('' when there is neither)."""
    character = character or {}
    system_prompt = (character.get('system_prompt') or '').strip()
    mind_extra = (mind_extra or '').strip()
    if not system_prompt and not mind_extra:
        return ''
    name = character_name(character).upper()
    parts = [f"=== NARRATOR'S LENS FOR {name} ==="]
    if system_prompt:
        parts.append(system_prompt)
    if mind_extra:
        parts.append(mind_extra)
    return '\n\n'.join(parts) + '\n\n'
