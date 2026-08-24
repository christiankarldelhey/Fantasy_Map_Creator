# ============================================================================
# Encounters section
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/prompt/sections/encountersSection.js.
# Renders the already-resolved encounters of one phase. The mechanics are
# decided upstream in Node (interactionResolver): this only dramatises the
# given form, dialogue seeds and outcome, never changes them.
# ============================================================================

# Dialogue fields, in the order they should reach the narrator. Each is optional.
DIALOGUE_LINES = [
    {'key': 'topic', 'label': 'TOPIC', 'hintKey': 'topic_prose_hint'},
    {'key': 'npc_attitude', 'label': 'NPC ATTITUDE'},
    {'key': 'concrete_content', 'label': 'CONTENT SEED'},
    {'key': 'tension', 'label': 'TENSION'},
    {'key': 'traveller_stance', 'label': 'TRAVELLER STANCE'},
]


def _encounter_header(encounter):
    """"Warg (beast, night) in Eregion" — who was met, and where."""
    entity = encounter.get('entity') or {}
    kind = entity.get('type') or 'creature'
    activity = entity.get('active') or 'all-day'
    return f"{entity.get('name')} ({kind}, {activity}) in {encounter.get('region')}"


def _dialogue_lines(dialogue_content):
    """The optional dialogue seeds of an interaction, as indented reference lines."""
    if not dialogue_content:
        return []

    lines = []
    for spec in DIALOGUE_LINES:
        value = dialogue_content.get(spec['key'])
        if not value:
            continue
        hint_key = spec.get('hintKey')
        hint = f" — {dialogue_content[hint_key]}" if hint_key and dialogue_content.get(hint_key) else ''
        lines.append(f"    {spec['label']}: {value}{hint}")
    return lines


def _describe_encounter(encounter):
    """One bullet block for a single encounter."""
    header = f'  * {_encounter_header(encounter)}'
    interaction = encounter.get('interaction')
    if not interaction:
        return f'{header}.'

    entity = encounter.get('entity') or {}
    about = entity.get('description_summary') or entity.get('description') or ''

    lines = [f'{header}.']
    if about:
        lines.append(f'    ABOUT: {about}')
    lines.append(f"    FORM: {interaction.get('form')}. {interaction.get('prose_hint')}")
    lines.extend(_dialogue_lines(interaction.get('dialogue_content')))

    block = '\n'.join(lines)
    if interaction.get('outcome'):
        block += f"\n\n    OUTCOME (narrate this, do not change it): {interaction['outcome']}."
    return block


def encounters_section(encounters):
    """The encounters of one phase, grouped by night timing when present."""
    list_ = encounters or []
    if len(list_) == 0:
        return '  (no encounters)'

    before_sleep = [e for e in list_ if e.get('night_timing') == 'before_sleep']
    mid_night = [e for e in list_ if e.get('night_timing') == 'mid_night']

    # Day phases (and nights without timing) are a flat list.
    if len(before_sleep) == 0 and len(mid_night) == 0:
        return '\n'.join(_describe_encounter(e) for e in list_)

    lines = []
    if before_sleep:
        lines.append('Before settling in:')
        lines.extend(_describe_encounter(e) for e in before_sleep)
    if mid_night:
        lines.append('In the depth of night:')
        lines.extend(_describe_encounter(e) for e in mid_night)
    return '\n'.join(lines)
