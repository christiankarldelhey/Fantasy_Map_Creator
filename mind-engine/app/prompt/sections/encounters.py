# ============================================================================
# Encounters section
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/prompt/sections/encountersSection.js.
# Renders the already-resolved encounters of one phase. The mechanics are
# decided upstream in Node (interactionResolver): this only dramatises the
# given form, dialogue seeds and outcome, never changes them.
# ============================================================================

# The dialogue seeds in the order they reach the narrator — authored
# prose, printed verbatim. 'topic' is resolver taxonomy and stays out;
# its prose_hint, when authored, leads the seeds instead.
_SEED_KEYS = (
    'npc_attitude', 'concrete_content', 'tension', 'traveller_stance')

# Forms with an actual interlocutor: only there can a recall inform what
# the traveller answers. A sign on a waypost carries seeds too, but no
# one stands behind it to hear a reply.
SPOKEN_FORMS = {
    'talks', 'brief_exchange', 'aid_or_trade', 'confronts',
}


def _seed_lines(dialogue_content):
    """The optional dialogue seeds of an interaction, verbatim — the
    values are already world prose; field labels were machine noise."""
    if not dialogue_content:
        return []
    lines = []
    hint = dialogue_content.get('topic_prose_hint')
    if hint:
        lines.append(f'    {hint}')
    lines.extend(
        f'    {dialogue_content[k]}'
        for k in _SEED_KEYS if dialogue_content.get(k)
    )
    return lines


def _describe_encounter(encounter):
    """One bullet block: name and given form on the first line, then the
    authored seeds verbatim. Form and outcome stay binding — narrate
    them, never change them."""
    entity = encounter.get('entity') or {}
    interaction = encounter.get('interaction') or {}
    form = interaction.get('form')
    header = f"  * {entity.get('name')}"
    header += f' — {form}.' if form else '.'
    hint = interaction.get('prose_hint')
    if hint:
        header += f' {hint}'

    lines = [header]
    about = entity.get('description_summary') or entity.get('description')
    if about:
        lines.append(f'    {about}')
    lines.extend(_seed_lines(interaction.get('dialogue_content')))
    # C21/C23: a memory this encounter called back lands INSIDE the beat
    # — in a spoken exchange it may inform the reply; otherwise it is a
    # beat of recollection. Either way it may stay silent.
    if encounter.get('echo'):
        lead = (
            'May inform what the traveller answers'
            if form in SPOKEN_FORMS and interaction.get('dialogue_content')
            else 'May call to mind'
        )
        lines.append(f'    {lead} (or stay silent): {encounter["echo"]}')
    if interaction.get('outcome'):
        lines.append(
            f"    OUTCOME (narrate this, do not change it): "
            f"{interaction['outcome']}."
        )
    return '\n'.join(lines)


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
