# ============================================================================
# Decisions (B5) — the mind prefers; the host applies
# ----------------------------------------------------------------------------
# An event may carry `data.decision`:
#
#   {"id": "bridge_or_wood", "prompt": "The bridge is watched; the wood
#     is dark.",
#    "options": [{"id": "wood", "label": "Slip through the dark wood",
#                 "tags": ["risk:cautious"],
#                 "commands": [{"type": "state_change", ...}]}]}
#
# The decision point surfaces in open/narrate responses while unresolved,
# with the mind's `recommended` option scored deterministically from
# theme_weights, belief tag overlap and active needs. `POST /decide`
# records the host's choice and returns the option's commands as
# `proposed_commands` — Mind NEVER executes them; validation and
# application belong to the host.
# ============================================================================
from app.mind.boosts import effective_theme_weights
from app.mind.nl_resolver import phrases, resolve_event_reading
from app.mind.tables import Belief, Need


def decisions_of(episode):
    """Decision points declared by the episode's events, in order."""
    found = []
    for i, event in enumerate(episode.events or []):
        dec = (event.get('data') or {}).get('decision')
        if not isinstance(dec, dict) or not dec.get('options'):
            continue
        found.append({
            'decision_id': dec.get('id') or f'decision_{i}',
            'prompt': dec.get('prompt'),
            'options': dec['options'],
            'event_index': i,
        })
    return found


def pending_decision_point(session, brain, episode):
    """The first unresolved decision, annotated with the mind's pick.
    None when nothing is pending."""
    recorded = episode.decisions or {}
    for dec in decisions_of(episode):
        if dec['decision_id'] in recorded:
            continue
        options = [
            {'id': o.get('id'), 'label': o.get('label')}
            for o in dec['options']
        ]
        point = {
            'decision_id': dec['decision_id'],
            'prompt': dec.get('prompt'),
            'options': options,
        }
        recommended = _recommend(
            session, brain, episode.character_id, dec['options']
        )
        if recommended is not None:
            point['recommended'] = recommended
        return point
    return None


def _recommend(session, brain, character_id, options):
    """Deterministic preference: theme affinity of option tags + the
    confidence of active beliefs whose tags intersect + urgency of needs
    an option claims to serve (`need:<key>` tag). No positive signal →
    no opinion."""
    weights = (
        effective_theme_weights(session, brain) if brain else {}
    )
    beliefs = (
        session.query(Belief)
        .filter_by(character_id=character_id, status='active')
        .all()
    )
    needs = (
        session.query(Need)
        .filter_by(character_id=character_id, status='open')
        .all()
    )
    best, best_score = None, 0.0
    for option in options:
        tags = set(option.get('tags') or [])
        score = sum(float(weights.get(t) or 0) for t in tags)
        score += sum(
            float(b.confidence or 0)
            for b in beliefs if tags & set(b.tags or [])
        )
        score += sum(
            float(n.urgency or 0)
            for n in needs if f'need:{n.key}' in tags
        )
        if score > best_score:
            best, best_score = option.get('id'), score
    return best


def resolve_decision(session, brain, episode, option_id, decision_id=None):
    """Validate and record the host's pick. Returns
    (decision, option, already_decided) or raises ValueError/KeyError —
    the route maps those to 404/409/422."""
    decisions = decisions_of(episode)
    if not decisions:
        raise LookupError('this episode declares no decision point')
    if decision_id is not None:
        dec = next(
            (d for d in decisions if d['decision_id'] == decision_id), None
        )
        if dec is None:
            raise LookupError(f'unknown decision_id {decision_id}')
    else:
        dec = decisions[0]

    recorded = dict(episode.decisions or {})
    if dec['decision_id'] in recorded:
        if recorded[dec['decision_id']] != option_id:
            raise ValueError(
                f"decision already made: {recorded[dec['decision_id']]}"
            )
        already = True
    else:
        already = False

    option = next(
        (o for o in dec['options'] if o.get('id') == option_id), None
    )
    if option is None:
        raise KeyError(f'unknown option_id {option_id}')

    if not already:
        recorded[dec['decision_id']] = option_id
        episode.decisions = recorded
        _apply_choice_to_perceived(session, episode, dec, option, brain)
    return dec, option, already


def _apply_choice_to_perceived(session, episode, dec, option, brain):
    """The chosen option rewrites what the day claimed: an authored
    `stance` becomes what the traveller actually did, and an
    `overnight_shelter` command rewrites the rest item — so close encodes
    the memory of the night that happened, not the one that was planned.
    The narrator payload is patched the same way: the prose must not
    describe a wild camp while the mechanics say wayhouse."""
    perceived = [dict(item) for item in (episode.perceived_day or [])]
    changed = False

    idx = dec.get('event_index')
    if option.get('stance') and isinstance(idx, int) and 0 <= idx < len(perceived):
        data = dict(perceived[idx].get('data') or {})
        substance = dict(data.get('substance') or {})
        substance['stance'] = option['stance']
        data['substance'] = substance
        perceived[idx] = {**perceived[idx], 'data': data}
        perceived[idx]['reading'] = resolve_event_reading(
            session, episode.game_id, perceived[idx], brain=brain
        )
        changed = True

    shelter = next(
        (
            c for c in (option.get('commands') or [])
            if isinstance(c, dict) and c.get('type') == 'overnight_shelter'
        ),
        None,
    )
    if shelter:
        for item in perceived:
            if item.get('type') != 'rest':
                continue
            data = dict(item.get('data') or {})
            data.update({
                'place': shelter.get('name') or data.get('place'),
                'description': shelter.get('description') or data.get('description'),
                'rest_quality': shelter.get('rest_quality', data.get('rest_quality')),
                'shadow_effect': shelter.get('shadow_effect', data.get('shadow_effect')),
                'scope': 'encounter_shelter',
            })
            item['data'] = data
            item['reading'] = resolve_event_reading(
                session, episode.game_id, item, brain=brain
            )
            changed = True
        payload = dict(episode.narrator_payload or {})
        day = dict(payload.get('day') or {})
        day['overnight_location'] = {
            'name': shelter.get('name'),
            'type': 'shelter',
            'indoor': bool(shelter.get('indoor')),
        }
        day['overnight_interaction'] = {
            'title': shelter.get('name'),
            'description': shelter.get('description'),
            'rest_quality': shelter.get('rest_quality'),
            'shadow_effect': shelter.get('shadow_effect'),
            'scope': 'encounter_shelter',
        }
        episode.narrator_payload = {**payload, 'day': day}
        changed = True

    if changed:
        episode.perceived_day = perceived


def resolution_text(session, game_id, option, character_name=None,
                    brain=None):
    options = phrases(session, game_id, 'mind.decision', brain=brain)
    label = option.get('label') or option.get('id') or ''
    for template in options:
        if '{choice}' in template:
            return template.format(
                choice=label, name=character_name or 'They'
            )
    return (options[0] if options else '{name} chooses {choice}.').format(
        choice=label, name=character_name or 'They'
    )


def proposed_commands(episode):
    """Flattened commands of every recorded decision on the episode."""
    recorded = episode.decisions or {}
    commands = []
    for dec in decisions_of(episode):
        chosen = recorded.get(dec['decision_id'])
        if chosen is None:
            continue
        option = next(
            (o for o in dec['options'] if o.get('id') == chosen), None
        )
        commands.extend((option or {}).get('commands') or [])
    return commands
