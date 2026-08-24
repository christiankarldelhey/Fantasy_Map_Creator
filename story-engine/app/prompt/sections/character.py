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


def narrator_lens_section(character=None):
    """The character-specific narrator lens ('' when the character has none)."""
    character = character or {}
    if not character.get('system_prompt'):
        return ''
    name = character_name(character).upper()
    return f"=== NARRATOR'S LENS FOR {name} ===\n{character['system_prompt']}\n\n"
