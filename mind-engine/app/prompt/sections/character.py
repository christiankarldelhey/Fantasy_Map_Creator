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
    """The character-specific narrator lens: the authored personality
    (system_prompt) alone — stable across days, so it rides the system
    prompt. The mind's volatile state (mood, needs, what it carries)
    gets its own block: mind_today_section ('' when there is no lens)."""
    character = character or {}
    system_prompt = (character.get('system_prompt') or '').strip()
    if not system_prompt:
        return ''
    name = character_name(character).upper()
    return f"=== NARRATOR'S LENS FOR {name} ===\n{system_prompt}\n\n"


def mind_today_section(mind_block, character=None):
    """The mind's own section — === {NAME} TODAY === — the volatile
    carried state (mood, needs, open threads) laid on the user prompt,
    where the day's facts live. The block's leading 'X today.' line is
    the title restated; the title replaces it."""
    mind_block = (mind_block or '').strip()
    if not mind_block:
        return ''
    name = character_name(character).upper()
    first, _, rest = mind_block.partition('\n')
    body = (
        rest.strip()
        if first.strip().rstrip('.') == f'{character_name(character)} today'
        else mind_block
    ) or mind_block
    return f'=== {name} TODAY ===\n{body}\n\n'
