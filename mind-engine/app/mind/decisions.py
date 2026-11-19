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
# relation attention, belief tag overlap and active needs. `POST /decide`
# records the host's choice and returns the option's commands as
# `proposed_commands` — Mind NEVER executes them; validation and
# application belong to the host.
# ============================================================================
from app.mind.relations import attention_weights
from app.mind.perceive import derive_tags
from app.mind.semantics import load_semantics, tag_floors
from app.mind.voice import phrases, resolve_event_reading
from app.mind.attitudes import active_convictions
from app.mind.tables import Need


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


def pending_decision_point(session, mind, episode):
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
            session, mind, episode.character_id, dec['options']
        )
        if recommended is not None:
            point['recommended'] = recommended
        return point
    return None


def _recommend(session, mind, character_id, options):
    """Deterministic preference: relation attention over option tags + the
    strength of active beliefs whose tags intersect + urgency of needs
    an option claims to serve (`need:<key>` tag). No positive signal →
    no opinion."""
    weights = (
        attention_weights(session, mind) if mind else {}
    )
    beliefs = active_convictions(session, character_id)
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
            float((b.conviction or {}).get('strength') or 0) / 5
            for b in beliefs if tags & set(b.tags or [])
        )
        score += sum(
            float(n.urgency or 0)
            for n in needs if f'need:{n.key}' in tags
        )
        if score > best_score:
            best, best_score = option.get('id'), score
    return best


def resolve_decision(session, mind, episode, option_id, decision_id=None):
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
        _apply_choice_to_perceived(session, episode, dec, option, mind)
    return dec, option, already


def _mark_changed(item, floor):
    """An applied command raised the stakes of what was perceived (C28):
    the contact is no longer an offer, it is a thing that happened to
    the body. Tags it 'tag:changed' and lifts salience to that kind's
    declared floor, so close() encodes the night that occurred — never
    the one that was merely proposed."""
    tags = list(item.get('tags') or [])
    if 'tag:changed' not in tags:
        item['tags'] = tags + ['tag:changed']
    if floor and floor > (item.get('salience') or 0):
        item['salience'] = round(float(floor), 3)


def _apply_choice_to_perceived(session, episode, dec, option, mind):
    """The chosen option rewrites what the day claimed: an authored
    `stance` becomes what the traveller actually did, and an
    `overnight_shelter` command rewrites the rest item — so close encodes
    the memory of the night that happened, not the one that was planned.
    The narrator payload is patched the same way: the prose must not
    describe a wild camp while the mechanics say wayhouse."""
    perceived = [dict(item) for item in (episode.perceived_day or [])]
    changed = False
    changed_floor = tag_floors(
        ['tag:changed'], load_semantics(session, episode.game_id)
    )[0]
    landed = bool(option.get('commands'))

    idx = dec.get('event_index')
    if option.get('stance') and isinstance(idx, int) and 0 <= idx < len(perceived):
        data = dict(perceived[idx].get('data') or {})
        substance = dict(data.get('substance') or {})
        substance['stance'] = option['stance']
        data['substance'] = substance
        perceived[idx] = {**perceived[idx], 'data': data}
        perceived[idx]['reading'] = resolve_event_reading(
            perceived[idx], session, episode.game_id)
        if landed:
            _mark_changed(perceived[idx], changed_floor)
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
            for dead in ('place', 'rest_quality', 'scope', 'description'):
                data.pop(dead, None)
            data.update({
                'entity_name': shelter.get('name') or data.get('entity_name'),
                'reading': shelter.get('description') or data.get('reading'),
                'shadow_effect': shelter.get(
                    'shadow_effect', data.get('shadow_effect')),
            })
            # The night's kind changes with the choice: the wild tags fall
            # and the shelter declares itself — 'lodging:shelter' says the
            # bed was granted, not bought nor begged.
            rough = {'rest:open_sky', 'rest:poor'}
            tags = [
                t for t in (data.get('tags') or [])
                if t not in rough
            ]
            tags.append('lodging:shelter')
            if shelter.get('indoor'):
                tags.append('rest:indoor')
            q = shelter.get('rest_quality')
            if isinstance(q, (int, float)) and q >= 3:
                tags.append('rest:good')
            elif isinstance(q, (int, float)) and q <= 1:
                tags.append('rest:poor')
            data['tags'] = tags
            item['data'] = data
            # Re-derive the weight-space tags too — 'tag:rest:poor' of the
            # wild night must not stain the sheltered one.
            item['tags'] = derive_tags(item)
            item['reading'] = resolve_event_reading(
                item, session, episode.game_id)
            _mark_changed(item, changed_floor)
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
                    mind=None):
    options = phrases('mind.decision', session, game_id)
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
