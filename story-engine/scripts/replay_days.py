#!/usr/bin/env python
"""Replay recorded trip days through the Mind pipeline — no UI.

Reads `trip_days.mind_open.request` / `mind_close.request.outcome` (the real
events[] + outcome the host sent) and re-runs them against a *sim brain*:
a character id of the form `sim-<mold>-<trip8>` whose brain is wiped first
(POST /mind/brains/{id}/reset), so every run starts deterministic.

Per day it reports:
  - what was perceived / unnoticed
  - the lens block verbatim (what actually entered the prompt)
  - mood, needs, evoked impressions with their age marks
  - close() consolidation summary
  - with --narrate: the generated narrative + which lens lines left
    fingerprints in it (token-presence heuristic — entity names and
    distinctive nouns; English lines vs Spanish prose, so treat as a
    smoke signal, not a metric)

Usage:
  .venv/bin/python scripts/replay_days.py --trip <trip_id> [options]

Options:
  --days 1-5        day_number slice (default: all recorded)
  --brains a,b      replay the same days through several molds
                    (default: the recorded character's own brain_profile,
                    i.e. their slug's mold)
  --narrate         call the real LLM narrate per day (costs tokens)
  --lang es|en      narration language (default: es)
  --out FILE        full markdown report path
  --keep            do not wipe the sim brain at start (resume/accumulate)

Requires the story-engine server running (STORY_ENGINE_URL or
http://localhost:8001) and the dev DB reachable (same as the app).

Examples:
  # Celebrian's 16-day trip through her own brain, state only:
  replay_days.py --trip 77300636-...

  # Same trip through both molds, with narration on days 3-5:
  replay_days.py --trip 77300636-... --brains celebrian,aranath \
      --days 3-5 --narrate --out /tmp/replay.md
"""
import argparse
import copy
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

load_dotenv()

import httpx  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.db import SessionLocal  # noqa: E402

import os  # noqa: E402

SE = os.environ.get('STORY_ENGINE_URL', 'http://localhost:8001').rstrip('/')
GAME_ID = os.environ.get('GAME_ID', 'middle_earth')

STOPWORDS = {
    'the', 'and', 'with', 'that', 'this', 'from', 'into', 'their', 'they',
    'them', 'then', 'than', 'have', 'been', 'were', 'was', 'are', 'not',
    'but', 'for', 'his', 'her', 'she', 'him', 'its', 'over', 'under',
    'before', 'after', 'again', 'still', 'when', 'what', 'where', 'which',
    'while', 'about', 'every', 'never', 'always', 'some', 'something',
    'days', 'yesterday', 'long', 'while', 'there', 'here', 'those',
    'these', 'through', 'would', 'could', 'should', 'does', 'made',
}


def load_template(slug):
    """The authored character card for a mold slug — replaying days through
    another brain must also swap voice (system_prompt, name, description),
    not just the wiring."""
    session = SessionLocal()
    try:
        row = session.execute(
            text(
                'SELECT c.name, c.system_prompt, c.introduction_instructions,'
                '       c.description, e.name AS entity_name '
                'FROM character_state c '
                'LEFT JOIN entities e ON e.id = c.entity_id '
                "WHERE c.slug = :s AND c.owner_user_id IS NULL"
            ),
            {'s': slug},
        ).mappings().first()
    finally:
        session.close()
    return dict(row) if row else None


def _slug_of_recorded(character):
    """Requests recorded before C18 carry no brain_profile — resolve the
    clone's template slug (clone 143 → 'celebrian')."""
    cid = ((character or {}).get('id') or '')
    if not str(cid).isdigit():
        return None
    session = SessionLocal()
    try:
        row = session.execute(
            text(
                "SELECT COALESCE(t.slug,"
                " regexp_replace(c.slug, '-user-.*$', '')) AS slug "
                'FROM character_state c '
                'LEFT JOIN character_state t ON t.id = c.template_id '
                'WHERE c.id = :i'
            ),
            {'i': int(cid)},
        ).mappings().first()
    finally:
        session.close()
    return row['slug'] if row else None


def load_days(trip_id):
    session = SessionLocal()
    try:
        rows = session.execute(
            text(
                'SELECT day_number, mind_open, mind_close, narrative, id '
                'FROM trip_days WHERE trip_id = :t ORDER BY day_number'
            ),
            {'t': trip_id},
        ).mappings().all()
    finally:
        session.close()
    days = []
    for r in rows:
        req = ((r['mind_open'] or {}).get('request') or {})
        outcome = (
            ((r['mind_close'] or {}).get('request') or {}).get('outcome')
        )
        if not req.get('events'):
            continue
        days.append({
            'day_number': r['day_number'],
            'request': req,
            'outcome': outcome,
            'reference_narrative': r['narrative'],
        })
    return days


# The wire contract is extra=forbid — recorded bodies carry fields since
# removed (banned_phrases, previous_openings…). Replay keeps only what the
# current schema accepts; the recorded day stays the ground truth.
_OPEN_KEYS = {
    'game_id', 'episode_ref', 'language', 'character', 'events', 'day',
    'trip_name', 'character_state', 'equipment_state', 'fate',
    'previous_day', 'recent_day_climates',
}
_CHARACTER_KEYS = {
    'id', 'name', 'brain_profile', 'skills', 'conditions', 'energy',
    'shadow', 'description', 'entity_name', 'system_prompt',
    'introduction_instructions', 'wounded',
}


def sanitize_request(request):
    body = {
        k: copy.deepcopy(v) for k, v in (request or {}).items()
        if k in _OPEN_KEYS
    }
    if isinstance(body.get('character'), dict):
        body['character'] = {
            k: v for k, v in body['character'].items()
            if k in _CHARACTER_KEYS
        }
    return body


def post(path, body, timeout=120):
    r = httpx.post(f'{SE}{path}', json=body, timeout=timeout)
    r.raise_for_status()
    return r.json()


def get(path):
    r = httpx.get(f'{SE}{path}', timeout=30)
    r.raise_for_status()
    return r.json()


def reset_brain(sim_id):
    try:
        post(f'/mind/brains/{sim_id}/reset', {'game_id': GAME_ID})
    except Exception as exc:  # noqa: BLE001 — never block the sim
        print(f'  [warn] reset failed for {sim_id}: {exc}')


def distinctive_tokens(line):
    words = re.findall(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ']+", line or '')
    return sorted({
        w.lower() for w in words
        if len(w) >= 5 and w.lower() not in STOPWORDS
    })


AGE_PREFIX = re.compile(
    r'^(Yesterday|\d+ days ago|A long while ago)\s+—\s*', re.I)
ANCHOR_NOTE = re.compile(r'\s*—\s*the .+ calls it back\s*$')


def echo_lines(prompt_user):
    """Memory beats inside the narrated prompt (C21): 'RECALLS' lines
    riding inside an encounter block + 'Echoes of the mind' phase-level
    leftovers."""
    lines, in_echo = [], False
    for ln in (prompt_user or '').splitlines():
        stripped = ln.strip()
        if stripped.startswith('RECALLS'):
            lines.append(stripped.split('):', 1)[-1].strip())
            continue
        if stripped.startswith('Echoes of the mind'):
            in_echo = True
            continue
        if in_echo:
            if stripped.startswith('- '):
                lines.append(stripped[2:])
            elif stripped:
                in_echo = False
    return lines


def echo_desc(line):
    """'3 days ago — <desc>' or 'Dúnedain: 3 days ago — <desc>' →
    '<desc>' (content to match)."""
    text = re.sub(r'^[^:]+:\s*(?=Yesterday|\d+ days ago|A long while ago)',
                  '', line or '')
    return AGE_PREFIX.sub('', ANCHOR_NOTE.sub('', text))


def lens_lines(lens_block):
    """(section, text) for every lens bullet — 'evoked' = age-marked
    memory lines, 'today' = same-day readings, 'beliefs', 'needs'.
    The age prefix is stripped so matching compares content, not 'ago'."""
    out, section = [], None
    for ln in (lens_block or '').splitlines():
        head = ln.strip().lower()
        if head.startswith('what they hold true'):
            section = 'beliefs'
            continue
        if head.startswith('stirring today'):
            section = 'stir'
            continue
        if head.startswith('the body asks'):
            section = 'needs'
            continue
        if not section or not ln.startswith('- '):
            continue
        text = ln[2:]
        if section == 'stir':
            kind = 'evoked' if AGE_PREFIX.match(text) else 'today'
            text = ANCHOR_NOTE.sub('', AGE_PREFIX.sub('', text))
            out.append((kind, text))
        else:
            out.append((section, text))
    return out


def stir_lines(lens_block):
    """Pull the 'Stirring today' bullet lines out of the lens."""
    lines, in_stir = [], False
    for ln in (lens_block or '').splitlines():
        if ln.startswith('Stirring today:'):
            in_stir = True
            continue
        if in_stir:
            if ln.startswith('- '):
                lines.append(ln[2:])
            elif ln.strip():
                in_stir = False
    return lines


def fingerprint(lines, narrative):
    """A line 'bled' if >=60% of its distinctive tokens appear in prose
    (or all of them when it has few)."""
    text = (narrative or '').lower()
    out = []
    for line in lines:
        toks = distinctive_tokens(line)
        if not toks:
            continue
        hits = sum(1 for t in toks if t in text)
        out.append((line, hits, len(toks), hits >= max(1, round(len(toks) * 0.6))))
    return out


SECTION_ORDER = ('evoked', 'today', 'beliefs', 'needs')
SECTION_LABEL = {
    'evoked': 'evoked memories',
    'today': 'day readings',
    'beliefs': 'beliefs',
    'needs': 'needs',
}


def fingerprint_block(lens_block, narrative, echoes=None):
    """Per-section bleed rows for the day report. Inline echoes count as
    evoked — same memory, delivered at its anchor instead of the list."""
    groups = {}
    for section, text in lens_lines(lens_block):
        groups.setdefault(section, []).append(text)
    for e in (echoes or []):
        groups.setdefault('evoked', []).append(echo_desc(e))
    rows, totals = [], {}
    for section in SECTION_ORDER:
        took = fingerprint(groups.get(section) or [], narrative)
        if not took:
            continue
        bled = sum(1 for *_, t in took if t)
        totals[section] = (bled, len(took))
        rows.append(f'  {SECTION_LABEL[section]}: {bled}/{len(took)} bled')
        if section == 'evoked':
            rows.extend(
                f'      {"✓" if t else "✗"} {hits}/{total} — {line[:70]}'
                for line, hits, total, t in took
            )
    return rows, totals


def perceive_digest(perceived_day):
    parts = []
    for item in perceived_day or []:
        data = item.get('data') or {}
        subject = (
            data.get('entity_name') or data.get('name')
            or data.get('entity') or item.get('type')
        )
        mark = {
            'noticed': '✓',
            'unnoticed': '·',
            'misread': '?',
        }.get(item.get('perception') or 'noticed', '✓')
        parts.append(f"{mark}{subject}")
    return '  '.join(parts)


def run_replay(days, mold_slug, narrate, lang, run_tag='', template=None):
    """Play the recorded days through a fresh `mold_slug` brain."""
    sim_id = f'sim-{mold_slug}-{run_tag}' if run_tag else f'sim-{mold_slug}'
    if not KEEP_BRAIN:
        reset_brain(sim_id)
    report = []
    bleed_totals = {}
    print(f'\n=== brain: {mold_slug}  (sim id: {sim_id}) ===')
    for day in days:
        n = day['day_number']
        body = sanitize_request(day['request'])
        body['game_id'] = GAME_ID
        body['episode_ref'] = f'sim-{n}-{run_tag or mold_slug}'
        char = dict(body.get('character') or {})
        char['id'] = sim_id
        char['brain_profile'] = mold_slug
        if template:
            # Another brain's day: its authored voice goes with it —
            # the same events narrated through a different person.
            for k in ('name', 'entity_name', 'system_prompt',
                      'introduction_instructions', 'description'):
                if template.get(k):
                    char[k] = template[k]
        char.setdefault('name', mold_slug)
        body['character'] = char

        opened = post('/episodes', body)
        ep = opened['episode_id']
        pkt = opened['psyche_packet']

        narrative = None
        echoes = []
        if narrate:
            try:
                narrated = post(
                    f'/episodes/{ep}/narrate', {'language': lang}
                )
                narrative = (narrated.get('generation') or {}).get('text')
                echoes = echo_lines(
                    (narrated.get('prompt') or {}).get('user')
                )
            except Exception as exc:  # noqa: BLE001
                narrative = f'[narrate failed: {exc}]'

        closed = post(f'/episodes/{ep}/close',
                      {'outcome': day['outcome'] or {}})

        stir = stir_lines(pkt.get('lens_block'))
        mood = pkt.get('mood') or {}
        needs = pkt.get('needs_active') or []

        print(
            f'  day {n:>2} | mood {mood.get("dominant", "?")} '
            f'v{mood.get("valence", 0)} | stir {len(stir)} | '
            f'needs {[n_.get("key") for n_ in needs]}'
        )

        block = [
            f'## Day {n} — {mold_slug}',
            '',
            f"**perceived:** {perceive_digest(pkt.get('perceived_day'))}",
            '',
            f"**mood:** {mood.get('dominant')} "
            f"(valence {mood.get('valence')}, arousal {mood.get('arousal')})",
        ]
        if needs:
            block.append(
                '**needs:** ' + ', '.join(
                    f"{n_.get('key')}({n_.get('urgency')})" for n_ in needs))
        if stir:
            block.append('**stirring:**')
            block.extend(f'  - {s}' for s in stir)
        block += ['', '```', (pkt.get('lens_block') or '').strip(), '```']
        if echoes:
            block.append('**echoes (inline at their phase):**')
            block.extend(f'  - {e}' for e in echoes)
        if narrative is not None:
            block += ['', '**narrative:**', '', narrative]
            rows, totals = fingerprint_block(
                pkt.get('lens_block'), narrative, echoes=echoes)
            for section, (b, t) in totals.items():
                old = bleed_totals.get(section, (0, 0))
                bleed_totals[section] = (old[0] + b, old[1] + t)
            if rows:
                block += ['',
                          '**lens → prose** '
                          '(bled = ≥60% distinctive tokens in the text):']
                block.extend(rows)
        cons = (closed.get('consolidation') or closed) if closed else {}
        block += ['', f'**close:** `{json.dumps(cons, default=str)[:400]}`', '']
        report.append('\n'.join(block))

    if bleed_totals:
        lines = [f'### Bleed totals — {mold_slug}']
        for section in SECTION_ORDER:
            b, t = bleed_totals.get(section, (0, 0))
            if t:
                lines.append(
                    f'- {SECTION_LABEL[section]}: {b}/{t} '
                    f'({round(100 * b / t)}%)')
        report.append('\n'.join(lines))

    state = get(f'/mind/state/{sim_id}')
    brain = state.get('brain') or {}
    mems = state.get('memories') or []
    beliefs = state.get('beliefs') or []
    snapshot = [
        f'## Brain after — {mold_slug}',
        '',
        f'- mood: `{json.dumps(brain.get("mood"))}`',
        f'- counters: `{json.dumps(brain.get("counters"))}`',
        f'- memories: {len(mems)} '
        f'({sum(1 for m in mems if m["kind"] == "pattern")} patterns, '
        f'{sum(1 for m in mems if m["consolidated"])} consolidated)',
        f'- beliefs: {len(beliefs)} active '
        f'({sum(1 for b in beliefs if b["origin"] == "seed")} seeds)',
        '',
        '### Memories (by importance)',
    ]
    for m in mems[:40]:
        snapshot.append(
            f'- [{m["kind"]}] imp={m["importance"]} str={m["strength"]} '
            f'ev={m["evocations"]}{" cons" if m["consolidated"] else ""} '
            f'— {m["desc"][:90]}'
        )
    report.append('\n'.join(snapshot))
    print(
        f'  → memories {len(mems)} | beliefs {len(beliefs)} '
        f'| mood {brain.get("mood")}'
    )
    return '\n\n'.join(report)


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--trip', required=True, help='trip_id to replay')
    ap.add_argument('--days', default=None, help='e.g. 3-5 or 4')
    ap.add_argument('--brains', default=None,
                    help='comma-separated mold slugs (default: recorded)')
    ap.add_argument('--narrate', action='store_true')
    ap.add_argument('--lang', default='es')
    ap.add_argument('--out', default=None)
    ap.add_argument('--keep', action='store_true',
                    help='do not wipe the sim brain first')
    args = ap.parse_args()

    global KEEP_BRAIN
    KEEP_BRAIN = args.keep

    days = load_days(args.trip)
    if not days:
        sys.exit(f'no recorded mind_open days for trip {args.trip}')
    if args.days:
        if '-' in args.days:
            lo, hi = (int(x) for x in args.days.split('-', 1))
            days = [d for d in days if lo <= d['day_number'] <= hi]
        else:
            days = [d for d in days if d['day_number'] == int(args.days)]

    recorded_slug = (
        ((days[0]['request'].get('character') or {}).get('brain_profile'))
        or _slug_of_recorded(days[0]['request'].get('character'))
        or 'default'
    )
    # Recorded profiles carry the clone's own slug ('celebrian-user-2');
    # molds live at the base slug.
    recorded_slug = re.sub(r'-user-.*$', '', recorded_slug)
    brains = (
        [re.sub(r'-user-.*$', '', b.strip())
         for b in args.brains.split(',')]
        if args.brains else [recorded_slug]
    )
    print(f'trip {args.trip}: {len(days)} day(s) → brains {brains}'
          f'{" (narrating)" if args.narrate else ""}')

    sections = [
        f'# Replay — trip {args.trip}',
        f'brains: {", ".join(brains)} | days: '
        f'{days[0]["day_number"]}–{days[-1]["day_number"]} | '
        f'narrated: {args.narrate}',
    ]
    multi = len(brains) > 1
    for slug in brains:
        tag = f'{args.trip[:8]}' if multi else ''
        template = (
            load_template(slug) if slug != recorded_slug else None
        )
        if slug != recorded_slug and not template:
            print(f'  [warn] no character template for slug {slug!r} '
                  f'— swapping brain only')
        sections.append(
            run_replay(days, slug, args.narrate, args.lang,
                       run_tag=tag, template=template)
        )

    out = '\n\n---\n\n'.join(sections)
    if args.out:
        Path(args.out).write_text(out)
        print(f'\nfull report → {args.out}')
    else:
        print('\n--- full report ---\n')
        print(out)


if __name__ == '__main__':
    KEEP_BRAIN = False
    main()
