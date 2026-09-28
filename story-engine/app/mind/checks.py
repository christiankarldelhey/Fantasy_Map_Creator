# ============================================================================
# Gates & rolls (B1) — checks on perceived events
# ----------------------------------------------------------------------------
# The host declares a check inside the event: data.check = {skill, gate?,
# difficulty?, mods?}. The mind resolves it deterministically — the die is
# seeded from the event's own identity, so the same events[] always produce
# the same perceived_day no matter whose head they pass through.
#
#   gate:   skill >= minimum or the attempt never exists (gate closed).
#           minimum = check.gate, else wiring 'gate_min.<skill>', else
#           'gate_default_min'.
#   roll:   d<check_die_sides> + skill + state_mods + check.mods vs
#           difficulty. State mods mirror the host's bands (worn/spent
#           energy, shadowed/burdened shadow, wounded) with magnitudes and
#           cuts in the mold's wiring.
#   result: success -> noticed (+perception bonus scaled by difficulty)
#           failure -> unnoticed (dampened salience: malestar difuso)
#           failure while altered (shadow or an altered-state condition)
#                  -> misread (a wrong reading from the NL pack)
#
# Invariant: a check only shapes perception — it can narrate "leyó el
# rastro", never produce a material outcome the mechanics didn't produce.
# ============================================================================
import random

from app.mind.nl_resolver import phrases as nl_phrases

ALTERED_STATES_KEY = 'mind.altered_states'
MISREAD_KEY = 'mind.misread'


def _num(v):
    return v if isinstance(v, (int, float)) and not isinstance(v, bool) else None


def _norm01(v):
    """Energy/shadow arrive 0-1 (body events) or 0-100 (state snapshots)."""
    n = _num(v)
    if n is None:
        return None
    return n / 100.0 if n > 1 else max(0.0, n)


def character_state(character, events):
    """The state that bends the die: snapshot fields first, the episode's
    own `body` event as fallback (the host may only send it there)."""
    character = character or {}
    resources = character.get('resources') or {}
    body_data = {}
    for e in events or []:
        if e.get('type') == 'body':
            body_data = e.get('data') or {}
            break

    def _pick(key, normalized=True):
        for src in (character, resources, body_data):
            n = _num(src.get(key))
            if n is not None:
                return _norm01(n) if normalized else n
        return None

    conditions = set()
    for c in character.get('conditions') or []:
        if isinstance(c, str):
            conditions.add(c.lower())
        elif isinstance(c, dict):
            name = c.get('name') or c.get('kind') or c.get('type')
            if name:
                conditions.add(str(name).lower())
    wounded = character.get('wounded') or body_data.get('wounded')
    if isinstance(wounded, str) and wounded not in ('', 'none', 'false'):
        conditions.add('wounded')
    elif wounded is True:
        conditions.add('wounded')
    return {
        'energy': _pick('energy'),
        'shadow': _pick('shadow'),
        'fatigue': _pick('fatigue'),
        # Day counts are raw numbers, not 0-1.
        'days_without_food': _pick('days_without_food', normalized=False),
        'days_without_water': _pick('days_without_water', normalized=False),
        'conditions': conditions,
    }


def _state_mods(state, w):
    mods = 0.0
    energy = state.get('energy')
    if energy is not None:
        if energy < w.get('energy_spent_below', 0.25):
            mods += w.get('mod_energy_spent', -2.0)
        elif energy < w.get('energy_worn_below', 0.5):
            mods += w.get('mod_energy_worn', -1.0)
    shadow = state.get('shadow')
    if shadow is not None:
        if shadow >= w.get('shadow_burdened_min', 0.7):
            mods += w.get('mod_shadow_burdened', -2.0)
        elif shadow >= w.get('shadow_shadowed_min', 0.45):
            mods += w.get('mod_shadow_shadowed', -1.0)
    if 'wounded' in state.get('conditions', ()):
        mods += w.get('mod_wounded', -1.0)
    return mods


def _is_altered(session, game_id, state, w, brain=None):
    """Miedo/sombra: high shadow, or a condition the game declares an
    altered state (editable list 'mind.altered_states')."""
    shadow = state.get('shadow')
    if shadow is not None and shadow >= w.get('misread_shadow_min', 0.45):
        return True
    names = {n.lower() for n in nl_phrases(
        session, game_id, ALTERED_STATES_KEY, brain=brain
    )}
    return bool(state.get('conditions', set()) & names)


def _seed_for(game_id, event, index, skill):
    when = event.get('when') or {}
    return '{}:{}:{}:{}:{}'.format(
        game_id, when.get('episode'), when.get('date'), index, skill
    )


def resolve_check(session, game_id, character, event, index, state, w,
                  brain=None):
    """Resolve one event's check. Returns (check_result, perception).

    check_result lands verbatim in the packet's check_results and inside
    the perceived_day item; perception is one of noticed|unnoticed|misread.
    """
    check = (event.get('data') or {}).get('check')
    if not isinstance(check, dict) or not check.get('skill'):
        return None, 'noticed'

    skill_name = str(check['skill'])
    skills = (character or {}).get('skills') or {}
    skill = _num(skills.get(skill_name))
    if skill is None:
        skill = _num(skills.get(f'skill_{skill_name}')) or 0.0

    minimum = _num(check.get('gate'))
    if minimum is None:
        minimum = w.get(
            f'gate_min.{skill_name}', w.get('gate_default_min', 0.0)
        )

    result = {
        'gate': skill_name, 'skill': skill, 'min': minimum,
        'event_index': index, 'event_type': event.get('type'),
    }
    if skill < minimum:
        # Gate closed: the option never existed — no roll is thrown.
        result.update(attempted=False, success=False)
        return result, 'unnoticed'

    difficulty = _num(check.get('difficulty'))
    if difficulty is None:
        difficulty = w.get('check_default_difficulty', 8.0)
    mods = _state_mods(state, w) + (_num(check.get('mods')) or 0.0)

    rng = random.Random(_seed_for(game_id, event, index, skill_name))
    sides = max(2, int(w.get('check_die_sides', 10)))
    roll = rng.randint(1, sides)
    total = roll + skill + mods
    success = total >= difficulty

    result.update(
        attempted=True, roll=roll, mods=round(mods, 3),
        total=round(total, 3), difficulty=difficulty, success=success,
    )
    if success:
        return result, 'noticed'
    if _is_altered(session, game_id, state, w, brain=brain):
        return result, 'misread'
    return result, 'unnoticed'


def misread_reading(session, game_id, event, true_reading, check_result,
                    brain=None):
    """A wrong reading for a misread event — a phrase from the editable
    'mind.misread' list, deterministic on the same seed as the roll."""
    data = event.get('data') or {}
    subject = (
        data.get('entity') or data.get('entity_id')
        or data.get('name') or data.get('title') or true_reading
    )
    pool = nl_phrases(session, game_id, MISREAD_KEY, brain=brain)
    if subject:
        options = pool
    else:
        options = [p for p in pool if '{subject}' not in p]
        subject = ''
    if not options:
        return 'the mind misread what was there'
    skill = (check_result or {}).get('gate') or ''
    index = (check_result or {}).get('event_index') or 0
    rng = random.Random(_seed_for(game_id, event, index, f'misread:{skill}'))
    return options[int(rng.random() * len(options))].format(subject=subject)
