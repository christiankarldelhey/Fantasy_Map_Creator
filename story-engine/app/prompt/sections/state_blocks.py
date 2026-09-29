# ============================================================================
# State blocks — the traveller's condition, equipage and end, rendered HERE
# ----------------------------------------------------------------------------
# Single-owner rule: the host ships raw state (energy, shadow, supplies,
# fate); every translation of that data into language lives in the
# story-engine's NL pack. These are the ports of what used to be
# buildConditionBlock / buildEquipmentBlock / buildEndStateBlock inside the
# Game domain — same thresholds (now nl thresholds), same sentences (now
# nl phrase lists, admin-editable per game/brain).
#
# Numbers NEVER reach the prompt — bands decide which phrase speaks.
# ============================================================================

# Fallback phrases identical to the seeded NL pack — used when nl is None
# (mind-down / DB-less callers render the same text the pack would).
_FALLBACK = {
    'condition.energy.worn':
        '{name} is worn down; let a heavier step, a shorter temper and a '
        'longing for shelter show in how {name} moves.',
    'condition.energy.spent':
        "{name} is at the very limit of {name}'s strength — stumbling, "
        'the body failing, choices driven by exhaustion.',
    'condition.shadow.unease':
        'A faint unease has settled on {name}: grimmer now, more watchful '
        'than before.',
    'condition.shadow.shadowed':
        'A shadow has gathered on {name}, mile by mile: quick to suspect, '
        'seeing threat where once {name} saw beauty, slow to trust the '
        'quiet.',
    'condition.shadow.burdened':
        '{name} is heavily burdened in spirit: the land itself feels '
        'malevolent, bleak, and what trust {name} had is all but gone.',
    'condition.wounded.wounded':
        '{name} nurses a wound that has not yet healed.',
    'condition.wounded.badly_wounded':
        '{name} is badly wounded, moving as one who is not far from '
        'falling.',
    'condition.owes_to': 'This owes to {notes}.',
    'note.combat': 'a fight with {subject}',
    'note.tension': '{subject} shadowing the road',
    'note.company': 'an hour in the company of {subject}',
    'note.rest_good': "a night's rest at {subject}",
    'note.rest': 'a night at {subject}',
    'condition.tail':
        'Let this colour the telling — how {name} moves, what {name} '
        'notices and longs for — but never name it as a fact or a number.',
    'equipage.turned_away':
        'turned away from the door for want of coin, the traveller slept '
        'against the wall of the very town that would not have him',
    'equipage.poorly_clad':
        'poorly clad for this cold; the cloak is thin and the wind finds '
        'every gap',
    'equipage.low_rations': 'the satchel is nearly empty',
    'equipage.flask_frozen':
        'the waterskin is rimed with ice and no stream can refill it today',
    'equipage.empty_waterskin':
        'the waterskin is empty; the tongue is parched and every swallow '
        'is remembered',
    'equipage.low_water':
        'the waterskin is nearly dry; only a mouthful or two remain',
    'equipage.no_food_water_deep':
        'neither food nor water in days; the body is doubly tried and the '
        'step unsteady',
    'equipage.no_food_water':
        'neither food nor water has passed the lips; the body is doubly '
        'tried',
    'equipage.hungry_deep':
        'no decent meal in days; hunger gnaws and weakens the arm',
    'equipage.hungry': 'no decent meal since yesterday; the belly is hollow',
    'equipage.thirsty_deep':
        'no water in far too long; the tongue swells and the mind grows '
        'slow',
    'equipage.thirsty':
        'no water since yesterday; the throat is dust and the lips are '
        'cracked',
    'equipage.low_coins':
        'few coins left in the purse, counted twice before asking for a bed',
    'equipage.no_coins': 'the purse is empty',
    'equipage.tail':
        'Never list objects or quantities; the equipage appears only when '
        'it hinders, is lacking, or brings comfort.',
    'endstate.slain':
        '=== THE END ===\nThis is the FINAL CHAPTER. {name} dies here. '
        'Narrate the moment of death explicitly in the final movement. Do '
        'not end the chapter with {name} still alive. The journey ends '
        'here.\n\n=== MANDATORY ENDING ===\nYou must describe {name}\'s '
        'actual death. Do not transition to a night at camp; the story '
        'stops at the moment {name} falls.',
    'endstate.dead_exhaustion':
        '=== THE END ===\nThis is the FINAL CHAPTER. Exhaustion finally '
        'claims {name}, who dies here. Narrate the collapse and final '
        'moments explicitly in the final movement. Do not end the chapter '
        'with {name} still alive. The journey ends here.\n\n'
        '=== MANDATORY ENDING ===\nYou must describe {name}\'s death from '
        'exhaustion. Do not transition to a night at camp; the story stops '
        'at {name}\'s final collapse.',
    'endstate.dead_shadow':
        '=== THE END ===\nThis is the FINAL CHAPTER. The shadow finally '
        'consumes {name}; {name} dies or is fully corrupted. Narrate the '
        'corruption taking hold and the final end explicitly in the final '
        'movement. Do not end the chapter with {name} merely threatened or '
        'alive. The journey ends in darkness.\n\n=== MANDATORY ENDING ===\n'
        'You must describe the exact moment the shadow consumes {name}. Do '
        'not transition to a night at camp; the story stops at that moment.',
}

_FALLBACK_THRESHOLDS = {
    'condition.energy_worn_max': 50,
    'condition.energy_spent_max': 25,
    'condition.shadow_unease_min': 20,
    'condition.shadow_shadowed_min': 45,
    'condition.shadow_burdened_min': 70,
    'equipage.cold_temp_max': 15,
    'equipage.cold_shift_min': 3,
    'equipage.low_rations_max': 2,
    'equipage.low_water_max': 0.25,
    'equipage.low_coins_max': 5,
}


def _phrase(nl, key, **fmt):
    template = nl.phrase(key, default=None) if nl else None
    if not template:
        template = _FALLBACK.get(key)
    if template is None:
        return ''
    return template.format(**fmt)


def _threshold(nl, key):
    if nl:
        value = nl.threshold(key, _FALLBACK_THRESHOLDS[key])
        if value is not None:
            return value
    return _FALLBACK_THRESHOLDS[key]


def render_note(nl, note):
    """Machine notes ('kind:subject') render through note.<kind> — the
    host records WHAT drove the day, the pack owns how to say it.
    Anything else is a legacy authored note and passes through as-is."""
    kind, sep, subject = (note or '').partition(':')
    if sep and subject:
        rendered = _phrase(nl, f'note.{kind}', subject=subject)
        if rendered:
            return rendered
    return note


def condition_section(state, character_name='The traveller', nl=None):
    """=== TRAVELLER'S CONDITION === — energy/shadow/wounded bands + the
    causal 'owes to' tail from recent log notes. '' when nothing crosses
    a threshold (a fine body is not prose)."""
    state = state or {}
    name = character_name or 'The traveller'
    energy = state.get('energy')
    shadow = state.get('shadow')
    wounded = state.get('wounded')

    lines = []
    if energy is not None and energy < _threshold(nl, 'condition.energy_worn_max'):
        band = 'spent' if energy < _threshold(nl, 'condition.energy_spent_max') else 'worn'
        lines.append(_phrase(nl, f'condition.energy.{band}', name=name))
    if shadow is not None and shadow >= _threshold(nl, 'condition.shadow_unease_min'):
        if shadow >= _threshold(nl, 'condition.shadow_burdened_min'):
            band = 'burdened'
        elif shadow >= _threshold(nl, 'condition.shadow_shadowed_min'):
            band = 'shadowed'
        else:
            band = 'unease'
        lines.append(_phrase(nl, f'condition.shadow.{band}', name=name))
    if wounded in ('wounded', 'badly_wounded'):
        lines.append(_phrase(nl, f'condition.wounded.{wounded}', name=name))

    lines = [l for l in lines if l]
    if not lines:
        return ''

    notes = [
        render_note(nl, n) for n in (state.get('recentNotes') or []) if n
    ][:3]
    notes = [n for n in notes if n]
    if notes:
        lines.append(_phrase(nl, 'condition.owes_to', notes='; and to '.join(notes)))

    tail = _phrase(nl, 'condition.tail', name=name)
    return (
        "=== TRAVELLER'S CONDITION ===\n"
        + ' '.join(lines)
        + (f'\n{tail}' if tail else '')
        + '\n\n'
    )


def equipment_section(state, nl=None):
    """=== EQUIPAGE === — what hinders, lacks or comforts. Facts arrive
    raw (rations, water, coins, cold); phrases come from the pack."""
    state = state or {}
    lines = []

    if state.get('turnedAway'):
        lines.append(_phrase(nl, 'equipage.turned_away'))

    mean_temp = state.get('meanTemperature')
    cold_shift = state.get('coldShift') or 0
    if (
        mean_temp is not None
        and mean_temp < _threshold(nl, 'equipage.cold_temp_max')
        and cold_shift < _threshold(nl, 'equipage.cold_shift_min')
    ):
        lines.append(_phrase(nl, 'equipage.poorly_clad'))

    for item in state.get('notableItems') or []:
        if item:
            lines.append(item)

    rations = state.get('rations') or 0
    if 0 < rations <= _threshold(nl, 'equipage.low_rations_max'):
        lines.append(_phrase(nl, 'equipage.low_rations'))

    water_capacity = state.get('waterCapacity') or 0
    water_held = state.get('waterHeld') or 0
    if water_capacity > 0:
        if state.get('flaskFrozen'):
            lines.append(_phrase(nl, 'equipage.flask_frozen'))
        elif water_held <= 0:
            lines.append(_phrase(nl, 'equipage.empty_waterskin'))
        elif water_held <= _threshold(nl, 'equipage.low_water_max'):
            lines.append(_phrase(nl, 'equipage.low_water'))

    days_food = state.get('daysWithoutFood') or 0
    days_water = state.get('daysWithoutWater') or 0
    if days_food >= 1 and days_water >= 1:
        deep = days_food >= 3 and days_water >= 3
        lines.append(_phrase(nl, 'equipage.no_food_water_deep' if deep else 'equipage.no_food_water'))
    elif days_food >= 3:
        lines.append(_phrase(nl, 'equipage.hungry_deep'))
    elif days_food >= 1:
        lines.append(_phrase(nl, 'equipage.hungry'))
    elif days_water >= 3:
        lines.append(_phrase(nl, 'equipage.thirsty_deep'))
    elif days_water >= 1:
        lines.append(_phrase(nl, 'equipage.thirsty'))

    coins = state.get('coins')
    if coins is not None:
        if coins == 0:
            lines.append(_phrase(nl, 'equipage.no_coins'))
        elif coins <= _threshold(nl, 'equipage.low_coins_max'):
            lines.append(_phrase(nl, 'equipage.low_coins'))

    lines = [l for l in lines if l]
    if not lines:
        return ''

    tail = _phrase(nl, 'equipage.tail')
    return (
        '=== EQUIPAGE ===\n'
        + '. '.join(lines) + '.'
        + (f'\n{tail}' if tail else '')
        + '\n\n'
    )


def end_state_section(fate, character_name='The traveller', nl=None):
    """=== THE END === — terminal chapters only. `fate` arrives raw; the
    wording (and which fates exist) lives in the pack."""
    if not fate or fate == 'living':
        return ''
    name = character_name or 'The traveller'
    text = _phrase(nl, f'endstate.{fate}', name=name)
    return f'{text}\n\n' if text else ''
