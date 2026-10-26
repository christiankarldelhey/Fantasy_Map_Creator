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

from app.mind.detectors import altered_by_state, state_mods
from app.mind.nl_resolver import phrases as nl_phrases

ALTERED_STATES_KEY = 'mind.altered_states'
MISREAD_KEY = 'mind.misread'

# Fields of the character snapshot that describe WHO the person is, not
# how their body is — they never land in the Condition map.
_IDENTITY_KEYS = {
    'id', 'name', 'description', 'entity_name', 'portrait_url',
    'system_prompt', 'introduction_instructions', 'brain_profile',
    'skills', 'traits', 'conditions', 'state', 'resources',
}


def _num(v):
    return v if isinstance(v, (int, float)) and not isinstance(v, bool) else None


def character_state(character, events):
    """The Condition the host reports, flattened for detectors (ADR 0005):
    every scalar of the snapshot, the free-form 'state'/'resources' dicts
    and the episode's own `body` event — first non-null per field, in that
    order of precedence. Nothing here knows a field's meaning; the
    declared detectors do."""
    character = character or {}
    body_data = {}
    for e in events or []:
        if e.get('type') == 'body':
            body_data = e.get('data') or {}
            break

    state = {}
    sources = (
        {
            k: v for k, v in character.items()
            if k not in _IDENTITY_KEYS
            and isinstance(v, (int, float, str, bool))
        },
        character.get('state'),
        character.get('resources'),
        body_data,
    )
    for src in sources:
        for k, v in (src or {}).items():
            if v is not None and k not in state and k != 'conditions':
                state[k] = v

    conditions = set()
    for c in character.get('conditions') or []:
        if isinstance(c, str):
            conditions.add(c.lower())
        elif isinstance(c, dict):
            name = c.get('name') or c.get('kind') or c.get('type')
            if name:
                conditions.add(str(name).lower())
    wounded = state.get('wounded')
    if (
        isinstance(wounded, str)
        and wounded.lower() not in ('', 'none', 'false')
    ) or wounded is True:
        conditions.add('wounded')
    # 'wounded' may arrive only inside the conditions list — the severity
    # field is synthesized so a declared detector can still weigh it.
    if 'wounded' in conditions and state.get('wounded') not in (
        'wounded', 'badly_wounded'
    ):
        state['wounded'] = 'wounded'
    state['conditions'] = conditions
    return state


def _is_altered(session, game_id, state, w, brain=None):
    """A declared 'altered' detector firing, or a condition the game
    declares an altered state (editable list 'mind.altered_states')."""
    if altered_by_state(session, game_id, state, w):
        return True
    names = {n.lower() for n in nl_phrases(
        session, game_id, ALTERED_STATES_KEY, brain=brain
    )}
    return bool(state.get('conditions', set()) & names)


def is_asleep(event, w):
    """Night is a state of the mind, not just a timestamp: during a sleep
    phase an event that would take a check to perceive passes unheard —
    unless contact is intrusive (a form that physically wakes the sleeper:
    attacks, confronts, sudden peril) or harm already landed (a wounded
    outcome). A distant howl at 02:30 stays a distant howl."""
    phase = (event.get('when') or {}).get('phase')
    # [] is a deliberate "never sleeps" — distinct from an unset knob.
    phases = w.get('sleep_phases')
    if phases is None:
        phases = ('night',)
    if phase not in phases:
        return False
    data = event.get('data') or {}
    if not isinstance(data.get('check'), dict) or not data['check'].get('skill'):
        return False
    if data.get('form') in (w.get('sleep_wake_forms') or ()):
        return False
    if data.get('outcome') in (w.get('sleep_wake_outcomes') or ()):
        return False
    return True


def asleep_check_result(event, index):
    """The auditable trace of a check that never ran: no gate, no roll —
    the mind was unconscious. Distinct from a failed roll on purpose."""
    check = (event.get('data') or {}).get('check') or {}
    return {
        'gate': check.get('skill'), 'asleep': True,
        'attempted': False, 'success': False,
        'event_index': index, 'event_type': event.get('type'),
    }


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
    mods = state_mods(session, game_id, state, w) \
        + (_num(check.get('mods')) or 0.0)

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
