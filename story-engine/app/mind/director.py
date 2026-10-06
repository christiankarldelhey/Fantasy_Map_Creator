# ============================================================================
# The Lens director — an LLM picks the Focus and the lines that connect
# ----------------------------------------------------------------------------
# The rules in focus.py narrow the Mind to candidates that touch the
# Episode and make a mechanical pick. The director sees those candidates
# and chooses what the Episode turns on for this Character, and why — the
# narrative connection tags alone cannot see ('the orc tracks of yesterday
# ARE today's unease'). Its choice is validated against the same rules:
#   - the Focus is a day event, an urgent Need, or a Memory
#   - lines come only from the candidates, never events, at most LINE_CAP
#   - urgent needs and a strong mood speak whatever it picks
#   - parts and phases are fixed by the candidates — the director cannot
#     move a line earlier than the moment it happens
# Any failure (no key, timeout, bad JSON, invalid ids) returns None and
# the rules' brief stands, marked chosen_by='rules'. Degraded minds (NPCs)
# never call it: the LLM is a protagonist cost.
# ============================================================================
import json
import logging
import os

from app.ai import complete_json
from app.mind.focus import LINE_CAP

log = logging.getLogger(__name__)

DIRECTOR_TIMEOUT_S = 6.0

SYSTEM = """You are the inner director of a fictional character's mind.
Before an Episode of their story is narrated, you decide what it turns on FOR THEM.

From the candidates you are given, choose:
- focus: the ONE id this Episode turns on for this character. Normally a day event.
  A need may be the focus only if it is marked URGENT; a memory only if it truly
  dominates the day. Choose null if nothing weighs enough: a quiet Episode is honest.
- lines: up to 3 inner ids (beliefs, memories, needs, mood) that CONNECT to the focus
  for this particular character. Never pick a line because it sounds good; pick it
  because it changes how this character lives the focus. Fewer is better than loose.
Lines marked ALWAYS will be included anyway; do not spend lines on them.

Answer with JSON only:
{"focus": "<id or null>", "focus_why": "<one short sentence>",
 "lines": [{"id": "<id>", "why": "<one short sentence: how it connects>"}]}"""


def director_enabled(wiring):
    if (wiring or {}).get('degraded'):
        return False
    return os.environ.get('MIND_DIRECTOR', 'on').lower() in ('on', 'true', '1')


def _candidate_line(c):
    when = c.get('phase') or ('carried in' if c.get('part') == 'carried' else 'all day')
    flags = []
    if c.get('urgent') and c['kind'] == 'need':
        flags.append('URGENT')
    if c.get('urgent'):
        flags.append('ALWAYS')
    flag = f" [{', '.join(flags)}]" if flags else ''
    return f"[{c['id']}] ({c['kind']}, {when}, weight {c.get('score', 0):.2f}){flag} {c['text']}"


def build_prompt(character_name, foundational_phrase, candidates, rules_focus):
    events = [c for c in candidates if c['kind'] == 'event']
    inner = [c for c in candidates if c['kind'] != 'event']
    parts = [f'Character: {character_name}']
    if foundational_phrase:
        parts.append(f'Who they are: {foundational_phrase[:600]}')
    parts.append('DAY EVENTS:\n' + ('\n'.join(map(_candidate_line, events)) or '(none of note)'))
    parts.append('INNER CANDIDATES:\n' + ('\n'.join(map(_candidate_line, inner)) or '(none)'))
    parts.append(f"The rules would pick focus = {rules_focus['id'] if rules_focus else 'null'}.")
    return {'system': SYSTEM, 'user': '\n\n'.join(parts)}


def apply_decision(brief, candidates, decision):
    """Rebuild the brief from the director's pick; None if invalid."""
    if not isinstance(decision, dict):
        return None
    by_id = {c['id']: c for c in candidates}
    focus_id = decision.get('focus')
    focus = None
    if focus_id not in (None, '', 'null'):
        focus = by_id.get(focus_id)
        if focus is None:
            return None
        if focus['kind'] == 'need' and not focus.get('urgent'):
            return None
        if focus['kind'] not in ('event', 'need', 'memory'):
            return None
        focus = {**focus, 'why': decision.get('focus_why') or focus.get('why')}

    always = [c for c in candidates if c.get('urgent') and c['kind'] != 'event']
    picked = []
    for entry in decision.get('lines') or []:
        c = by_id.get((entry or {}).get('id'))
        if c is None or c['kind'] == 'event' or (focus and c['id'] == focus['id']):
            continue
        if c.get('urgent') or any(p['id'] == c['id'] for p in picked):
            continue
        picked.append({**c, 'why': entry.get('why') or c.get('why')})
        if len(picked) >= LINE_CAP:
            break
    chosen = [
        c for c in always if not (focus and c['id'] == focus['id'])
    ] + picked
    chosen_ids = {c['id'] for c in chosen} | ({focus['id']} if focus else set())

    def strip(c):
        return {k: v for k, v in c.items() if k != 'urgent'}

    silenced = [s for s in brief.get('silenced') or [] if s.get('stage') == 'filter']
    silenced += [
        {'kind': c['kind'], 'text': c['text'], 'stage': 'pick',
         'reason': 'the director left it out'}
        for c in candidates
        if c['kind'] != 'event' and c['id'] not in chosen_ids
    ]
    lines = [strip(c) for c in chosen]
    return {
        'focus': strip(focus) if focus else None,
        'carried': [c for c in lines if c['part'] == 'carried'],
        'day': [c for c in lines if c['part'] == 'day'],
        'silenced': silenced,
        'chosen_by': 'director',
    }


def direct(brief, candidates, character_name, foundational_phrase=None):
    """The director's brief, or None to keep the rules' (logged reason)."""
    prompt = build_prompt(
        character_name, foundational_phrase, candidates, brief.get('focus')
    )
    try:
        decision = json.loads(complete_json(prompt, timeout=DIRECTOR_TIMEOUT_S))
    except Exception as exc:  # noqa: BLE001 — any failure keeps the rules
        log.warning('lens director failed, keeping rules brief: %s', exc)
        return None
    directed = apply_decision(brief, candidates, decision)
    if directed is None:
        log.warning('lens director returned an invalid pick: %s', decision)
    return directed
