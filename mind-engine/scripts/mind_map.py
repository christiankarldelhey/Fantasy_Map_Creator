#!/usr/bin/env python
"""mind_map.py — the living map of the mind (docs/mind-map/, ADR-0021).

  --export-day TRIP_ID DAY   dump a real trip_day + its seed data into
                             docs/mind-map/golden-day.json
  --update                   re-run the golden day through the code in an
                             isolated schema (mind_map), trace every @step,
                             and rewrite graph.json + *.mmd + *.md
  --narrate                  like --update, plus a real LLM narration saved
                             to narrative.md (costs tokens; not diff-gated)
  --check                    lint only, no DB: every @step uses a glossary
                             term and a manifest entry; every public
                             app.mind call from a handler is a step or
                             declared internal; artifacts are fresh.
"""
import argparse
import ast
import hashlib
import json
import os
import re
import sys
from pathlib import Path

ENGINE = Path(__file__).resolve().parent.parent
REPO = ENGINE.parent
DOCS = REPO / 'docs' / 'mind-map'
FIXTURE = DOCS / 'golden-day.json'
MANIFEST = DOCS / 'concepts.yml'
GLOSSARY = REPO / 'CONTEXT.md'
TRACE_INDEX = ENGINE / 'tests' / '.mind-trace.json'

sys.path.insert(0, str(ENGINE))

import yaml  # noqa: E402

HANDLER_FILES = [ENGINE / 'app/mind/routes.py', ENGINE / 'app/studio/api.py']
SCAN_DIRS = [ENGINE / 'app/mind', ENGINE / 'app']  # narrate_day lives at app/

# ---------------------------------------------------------------- glossary


def parse_glossary():
    """CONTEXT.md headings → {term: first-line definition}."""
    text = GLOSSARY.read_text()
    terms = {}
    for m in re.finditer(r'\n\*\*(.+?)\*\*:\n(.*?)(?=\n_Avoid_|$)', text, re.S):
        term, body = m.group(1).strip(), m.group(2).strip()
        first = re.split(r'(?<=\.)\s|\n', body, maxsplit=1)[0].strip()
        terms[term] = first
    return terms


def parse_manifest():
    return yaml.safe_load(MANIFEST.read_text())


# -------------------------------------------------------------------- AST


def _step_decorated(path):
    """{fn_name: term} for every @step('Term') in a file."""
    out = {}
    tree = ast.parse(path.read_text())
    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        for deco in node.decorator_list:
            if (
                isinstance(deco, ast.Call)
                and getattr(deco.func, 'id', '') == 'step'
                and deco.args
                and isinstance(deco.args[0], ast.Constant)
            ):
                out[node.name] = deco.args[0].value
    return out


def scan_steps():
    """All @step annotations: {qualified: {fn, term, file, line}}."""
    found = {}
    for base in SCAN_DIRS:
        for path in sorted(base.glob('**/*.py')):
            if 'tests' in path.parts or '__pycache__' in path.parts:
                continue
            for fn, term in _step_decorated(path).items():
                rel = path.relative_to(ENGINE)
                found[f'{fn}'] = {
                    'fn': fn, 'term': term,
                    'file': str(rel), 'module': str(rel)[:-3].replace('/', '.'),
                }
    return found


def scan_handler_calls():
    """Public app.mind names called anywhere in the route files."""
    required = set()
    for path in HANDLER_FILES:
        tree = ast.parse(path.read_text())
        imported = {}
        for node in tree.body:
            mod = node.module or '' if isinstance(node, ast.ImportFrom) else ''
            if not isinstance(node, ast.ImportFrom) or not mod.startswith('app.mind'):
                continue
            if mod in ('app.mind.models', 'app.mind.tables'):
                continue  # data classes are schema, not steps
            for a in node.names:
                imported[a.asname or a.name] = mod
        called = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                f = node.func
                name = f.id if isinstance(f, ast.Name) else getattr(f, 'attr', None)
                if name:
                    called.add(name)
        for name in called:
            if name in imported and not name.startswith('_'):
                required.add(name)
    return required


# -------------------------------------------------------------------- lint


def lint(manifest, glossary, steps, check_freshness=True):
    errors, warns = [], []
    concepts = manifest.get('concepts') or {}
    msteps = manifest.get('steps') or []
    internal = set(manifest.get('internal') or [])
    mstep_fns = {s['fn'] for s in msteps}

    for name, body in concepts.items():
        if name not in glossary:
            errors.append(f'concept "{name}" is not a CONTEXT.md heading')
        for rel in ('is_a',):
            if body.get(rel) and body[rel] not in concepts:
                errors.append(f'concept "{name}".{rel} → unknown "{body[rel]}"')
    for s in msteps:
        if s['fn'] not in steps:
            errors.append(f'manifest step "{s["fn"]}" has no @step in code')
        elif steps[s['fn']]['term'] != s['term']:
            errors.append(
                f'{s["fn"]}: manifest term "{s["term"]}" '
                f'!= decorator "{steps[s["fn"]]["term"]}"'
            )
        if s['term'] not in glossary:
            errors.append(f'step "{s["fn"]}" term "{s["term"]}" not in glossary')
        for c in (s.get('reads') or []) + (s.get('writes') or []):
            if c not in concepts:
                errors.append(f'step "{s["fn"]}" references unknown concept "{c}"')
    for fn, meta in steps.items():
        if fn not in mstep_fns:
            errors.append(f'@step {fn} ({meta["file"]}) missing from manifest')
        if meta['term'] not in glossary:
            errors.append(f'@step {fn}: term "{meta["term"]}" not in glossary')

    for name in sorted(scan_handler_calls() - mstep_fns - internal):
        errors.append(f'{name}() called from a handler: needs @step or internal:')

    if not FIXTURE.exists():
        warns.append('golden-day.json missing — run --export-day')
    if check_freshness:
        graph = DOCS / 'graph.json'
        if not graph.exists():
            errors.append('graph.json missing — run --update')
        else:
            meta = json.loads(graph.read_text()).get('meta', {})
            if meta.get('source_hash') != source_hash():
                errors.append(
                    'graph.json is stale — app/mind changed since last '
                    'generation; run --update')
    return errors, warns


def source_hash():
    """Freshness fingerprint over what the map reads: the mind domain code,
    the day narrator, the manifest, the glossary, the fixture."""
    h = hashlib.sha256()
    files = sorted(
        p for p in (ENGINE / 'app/mind').glob('**/*.py')
        if '__pycache__' not in p.parts
    ) + [ENGINE / 'app/narrate_day.py', MANIFEST, GLOSSARY]
    if FIXTURE.exists():
        files.append(FIXTURE)
    for p in files:
        h.update(str(p.relative_to(REPO)).encode())
        h.update(p.read_bytes())
    return h.hexdigest()[:16]


# ------------------------------------------------------------------ export


SEED_TABLES = [
    'mind_presets', 'preset_wiring', 'preset_starter_beliefs',
    'preset_leans', 'preset_musings', 'preset_memories',
    'pack_versions', 'pack_entries', 'semantics', 'detectors',
    'composite_rules',
]

# The mind's own accumulated state — dumped so a mid-trip day replays with
# its real past, not just the preset seed.
MIND_TABLES = [
    'characters', 'minds', 'episodes', 'memories',
    'needs', 'relations', 'musings',
]


def export_day(trip_id, day):
    from dotenv import load_dotenv
    load_dotenv(ENGINE / '.env')
    from sqlalchemy import text
    from app.db import engine

    with engine.connect() as c:
        row = c.execute(text(
            "SELECT td.mind_open->'request' AS req,"
            " td.mind_close->'request'->'outcome' AS out, t.name AS trip"
            ' FROM trip_days td JOIN trips t ON t.id = td.trip_id'
            ' WHERE td.trip_id=:t AND td.day_number=:d'
        ), {'t': trip_id, 'd': day}).mappings().first()
        if not row or not row['req']:
            raise SystemExit(f'no mind_open.request for {trip_id} day {day}')
        seed = {}
        preset_slug = (row['req'].get('character') or {}).get('preset')
        gid = row['req'].get('game_id', 'middle_earth')
        cid = (row['req'].get('character') or {}).get('id')
        for t in SEED_TABLES:
            q = f'SELECT * FROM mind.{t}'
            params = {}
            if t == 'mind_presets':
                q += ' WHERE slug = :s'
                params['s'] = preset_slug
            elif t.startswith('preset_'):
                q += (' WHERE preset_id IN'
                      ' (SELECT id FROM mind.mind_presets WHERE slug = :s)')
                params['s'] = preset_slug
            elif t in ('pack_versions', 'pack_entries', 'semantics',
                       'detectors', 'composite_rules'):
                q += ' WHERE game_id = :g'
                params['g'] = gid
            try:
                rows = c.execute(text(q), params).mappings().all()
            except Exception:
                rows = []
            seed[t] = [dict(r) for r in rows]

        # The mind as it stood before this day. Episode tables cut at the
        # day's episode_idx; the rest cut on their episode pointer where one
        # exists. In-place mutation (decay, feeds) can't be un-done, so a
        # mid-trip export approximates — a first-ever day is exact.
        idx_row = c.execute(text(
            "SELECT episode_idx FROM mind.episodes"
            " WHERE episode_ref = :ref"
        ), {'ref': f'trip:{trip_id}:day:{day}'}).scalar()
        as_of = idx_row if idx_row is not None else day
        # A first-ever day replays a mind being born: seed nothing of the
        # mind itself — get_or_create_mind/character run for real.
        cuts = {
            'characters': 'character_id = :c',
            'minds': 'character_id = :c',
            'episodes': 'character_id = :c AND episode_idx < :i',
            'memories': 'character_id = :c AND (created_episode IS NULL'
                        ' OR created_episode < :i)',
            'needs': 'character_id = :c AND (opened_episode IS NULL'
                     ' OR opened_episode < :i)',
            'relations': 'character_id = :c AND (last_fed_episode IS NULL'
                         ' OR last_fed_episode < :i)',
            'musings': 'character_id = :c AND (formed_episode IS NULL'
                       ' OR formed_episode < :i)',
        }
        for t in MIND_TABLES:
            if as_of <= 1:
                seed[t] = []
                continue
            q = f'SELECT * FROM mind.{t} WHERE {cuts[t]}'
            try:
                rows = c.execute(text(q), {'c': cid, 'i': as_of}).mappings().all()
            except Exception:
                rows = []
            seed[t] = [dict(r) for r in rows]
        fixture = {
            'label': f"{row['trip']} — day {day}" if row['trip']
                     else f'{trip_id} day {day}',
            'open_request': row['req'],
            'outcome': row['out'] or {},
            'seed': seed,
        }
        FIXTURE.write_text(json.dumps(fixture, indent=1, default=str))
        print(f'wrote {FIXTURE} ({FIXTURE.stat().st_size // 1024} KB)')


# ------------------------------------------------------------- golden run


ORM_SEED = {
    'mind_presets': 'MindPreset', 'preset_wiring': 'PresetWiring',
    'preset_starter_beliefs': 'PresetStarterBelief',
    'preset_leans': 'PresetLean', 'preset_musings': 'PresetMusing',
    'preset_memories': 'PresetMemory', 'pack_versions': 'PackVersion',
    'pack_entries': 'PackEntry', 'semantics': 'Semantic',
    'detectors': 'Detector', 'composite_rules': 'CompositeRule',
    'characters': 'Character', 'minds': 'Mind', 'episodes': 'Episode',
    'memories': 'Memory', 'needs': 'Need', 'relations': 'Relation',
    'musings': 'Musing',
}

_ID_RE = re.compile(
    r'\b(ep|mem|need|rel|chr|mind)[_-][0-9a-z]{8,}\b'
    r'|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b')


def _normalize_ids(payload):
    """Replace per-run minted ids with stable placeholders so artifacts
    diff only when behaviour changes."""
    text = json.dumps(payload, default=str)
    seen = {}

    def repl(m):
        raw = m.group(0)
        if raw not in seen:
            prefix = m.group(1) or 'id'
            seen[raw] = f'{prefix}-{len(seen) + 1:02d}'
        return seen[raw]
    return json.loads(_ID_RE.sub(repl, text))


def golden_run(narrate=False):
    """Replay the fixture through the real pipeline in schema `mind_map`."""
    os.environ['MIND_SCHEMA'] = 'mind_map'
    os.environ['MIND_DIRECTOR'] = 'off'
    from dotenv import load_dotenv
    load_dotenv(ENGINE / '.env')
    from sqlalchemy import text
    from sqlalchemy.exc import ProgrammingError
    import app.mind.tables as T
    from app.db import Base, SessionLocal, engine
    from app.mind.models import (
        CloseEpisodeRequest, NarrateEpisodeRequest, OpenEpisodeRequest,
    )
    from app.mind.routes import close_episode, narrate_episode, open_episode
    from app.mind.steps import trace_recording

    if not narrate:
        # Patch the names where the pipeline imported them — a stubbed
        # generation keeps --update deterministic and offline.
        import app.narrate_day as nd
        import app.mind.reflection as refl
        import app.mind.director as direc
        stub = {
            'text': '<generation stubbed — run --narrate>',
            'ia_provider': None, 'temperature': 0.0,
            'frequency_penalty': 0.0, 'presence_penalty': 0.0, 'top_p': 0.0,
        }
        nd.generate_narrative = lambda *a, **k: dict(stub)
        nd.translate_text = lambda text, lang: text
        refl.generate_narrative = lambda *a, **k: dict(stub)
        direc.complete_json = lambda *a, **k: None

    fixture = json.loads(FIXTURE.read_text())

    with engine.begin() as conn:
        conn.execute(text('DROP SCHEMA IF EXISTS mind_map CASCADE'))
        conn.execute(text('CREATE SCHEMA mind_map'))
    Base.metadata.create_all(engine)

    db = SessionLocal()
    try:
        for table, cls_name in ORM_SEED.items():
            cls = getattr(T, cls_name, None)
            for row in (fixture['seed'].get(table) or []):
                cols = {c.name for c in cls.__table__.columns}
                try:
                    db.add(cls(**{k: v for k, v in row.items() if k in cols}))
                except (ProgrammingError, TypeError) as e:
                    print(f'skip {table} row: {e}')
        db.commit()

        req = OpenEpisodeRequest(**fixture['open_request'])

        trace = []
        with trace_recording(trace):
            opened = open_episode(req, db)
            ep_id = opened.episode_id
            narrated = narrate_episode(ep_id, NarrateEpisodeRequest(
                language=req.language or 'english'), db)
            closed = close_episode(
                ep_id, CloseEpisodeRequest(outcome=fixture.get('outcome')), db)

        # A live row per stored concept — the example the map shows.
        samples = {}
        picks = {
            'episodes': 'id = :e',
            'minds': None, 'characters': None,
            'memories': 'created_episode = (SELECT episode_idx FROM'
                        ' mind_map.episodes WHERE id = :e)',
            'needs': None, 'relations': None, 'musings': None,
            'forgotten_memories': None,
            'mind_presets': 'slug = (SELECT preset_slug FROM'
                            ' mind_map.minds LIMIT 1)',
            'detectors': 'game_id = (SELECT game_id FROM'
                         ' mind_map.minds LIMIT 1)',
        }
        for t, where in picks.items():
            q = f'SELECT * FROM mind_map.{t}'
            if where:
                q += f' WHERE {where}'
            try:
                row = db.execute(text(q), {'e': ep_id}).mappings().first()
            except Exception:
                row = None
            if row:
                samples[t] = dict(row)
    finally:
        db.close()
    return {
        'episode_id': ep_id,
        'trace': trace,
        'samples': samples,
        'open': opened.model_dump(),
        'narrate': narrated.model_dump(),
        'close': closed.model_dump(),
        'request': fixture['open_request'],
        'outcome': fixture.get('outcome'),
    }


# --------------------------------------------------------------- artifacts


def _mmd_flow(title, entries):
    """flowchart LR: one node per step function (first-appearance order),
    edges between consecutive distinct nodes, deduplicated."""
    lines = ['flowchart LR']
    nodes, order, edges, seen_edges, prev = {}, [], [], set(), None
    for e in entries:
        fn = e['fn'].split('.')[-1]
        if fn not in nodes:
            nodes[fn] = e['term']
            order.append(fn)
        if prev is not None and fn != prev and (prev, fn) not in seen_edges:
            seen_edges.add((prev, fn))
            edges.append((prev, fn))
        prev = fn
    nid = {fn: f's{i}' for i, fn in enumerate(order)}
    for fn in order:
        label = nodes[fn].replace('"', "'")
        lines.append(f'    {nid[fn]}["{label}<br/><i>{fn}</i>"]')
    for a, b in edges:
        lines.append(f'    {nid[a]} --> {nid[b]}')
    return f'%% {title}\n' + '\n'.join(lines) + '\n'


def _mmd_concepts(manifest):
    """Concept view: glossary terms grouped by where they live, with is_a
    edges. Step edges live in the flow diagrams — drawing them here made a
    55-node tangle nobody could read."""
    groups = {'Wire': [], 'Stored': [], 'Derived': []}
    for name, body in manifest['concepts'].items():
        lives = body.get('lives_in') or ''
        if 'wire' in lives or lives.startswith('events[]'):
            groups['Wire'].append((name, lives))
        elif lives.startswith('derived'):
            groups['Derived'].append((name, lives))
        else:
            groups['Stored'].append((name, lives))

    def nid(name):
        return re.sub(r'\W', '_', name)

    lines = ['flowchart TD']
    for group, items in groups.items():
        lines.append(f'    subgraph {group.lower()}["{group}"]')
        for name, lives in items:
            label = name.replace('"', "'")
            lives = lives.replace('"', "'")
            lines.append(f'        {nid(name)}["{label}<br/><i>{lives}</i>"]')
        lines.append('    end')
    for name, body in manifest['concepts'].items():
        if body.get('is_a'):
            lines.append(f'    {nid(name)} -.->|is a| {nid(body["is_a"])}')
    return '%% Concepts — the glossary\'s vocabulary, grouped by home\n' \
        + '\n'.join(lines) + '\n'


def _mmd_er():
    """The real storage: mind.* tables and their columns, straight from
    tables.py — the schema half the concept view abstracts away."""
    from app.mind.tables import Base
    lines = ['erDiagram']
    for t in Base.metadata.sorted_tables:
        lines.append(f'    {t.name} {{')
        for c in t.columns:
            typ = re.sub(r'\W+', '_', str(c.type)).lower()[:24]
            lines.append(f'        {typ} {c.name}')
        lines.append('    }')
    for t in Base.metadata.sorted_tables:
        for fk in t.foreign_keys:
            parent = fk.column.table.name
            lines.append(f'    {parent} ||--o{{ {t.name} : ""')
    return '%% mind.* storage schema (from app/mind/tables.py)\n' \
        + '\n'.join(lines) + '\n'


def _mmd_lifecycle():
    return '''%% Episode lifecycle — the wire a Host speaks
sequenceDiagram
    participant H as Host
    participant M as Mind Engine
    participant DB as mind.*
    H->>M: POST /mind/minds/{id}/choose (situations pool)
    M-->>H: interaction_id per situation
    H->>M: POST /mind/minds/{id}/perceive (outcome events, optional)
    H->>M: POST /episodes (OpenEpisodeRequest)
    M->>DB: episode row + perceive + evoke + needs + mood + brief + lens
    M-->>H: {episode_id}
    H->>M: POST /episodes/{id}/narrate
    M-->>H: prompt + generation + perceived_day + mood + lens_block
    H->>M: POST /episodes/{id}/close {outcome}
    M->>DB: encode → patterns → decay → beliefs fade → regress → relations decay → reflect?
    M-->>H: CloseEpisodeResponse (counts + reflection)
'''


def _step_doc(term, meta, glossary, mstep, example, tests):
    fn = meta['fn'] if meta else mstep['fn']
    src = f"`{meta['file']}`" if meta else ''
    out = [
        f"### {mstep['term']} — `{fn}()` {src}", '',
        f"_{glossary.get(mstep['term'], '')}_", '',
        f"- **reads**: {', '.join(mstep.get('reads') or ['—'])}",
        f"- **writes**: {', '.join(mstep.get('writes') or ['—'])}",
    ]
    if tests:
        out += ['- **rules (tests)**:', *[f'  - {t}' for t in tests[:12]]]
        if len(tests) > 12:
            out.append(f'  - _…{len(tests) - 12} more in graph.json_')
    if example:
        ex = json.dumps(example['in'], ensure_ascii=False)
        if len(ex) > 500:
            ex = ex[:500] + '…'
        out += ['- **example in**:', '  ```json', f'  {ex}', '  ```']
        ey = json.dumps(example['out'], ensure_ascii=False)
        if len(ey) > 500:
            ey = ey[:500] + '…'
        out += ['- **example out**:', '  ```json', f'  {ey}', '  ```']
    return '\n'.join(out)


def _concept_example(name, body, samples, request, trace_entries, manifest):
    """A real value for the concept, from the golden run — a stored row, a
    column of one, a piece of the wire, or a traced step's output."""
    lives = body.get('lives_in') or ''
    m = re.search(r'mind\.(\w+)(?:\.(\w+))?(?:\.(\w+))?', lives)
    if m:
        table, col, sub = m.group(1), m.group(2), m.group(3)
        row = samples.get(table)
        if row is None:
            return None
        if col is None:
            return row
        val = row.get(col)
        if sub and isinstance(val, dict):
            val = val.get(sub)
        return val
    if 'wire' in lives or lives.startswith('events[]'):
        if 'events[]' in lives and 'tags' in lives:
            return (request.get('events') or [{}])[0].get('tags')
        if 'events' in lives:
            return (request.get('events') or [None])[0]
        if 'condition' in lives:
            return request.get('condition')
        if 'fate' in lives:
            return request.get('fate')
    if lives.startswith('derived'):
        for s in manifest['steps']:
            if name in (s.get('writes') or []):
                hit = next(
                    (e['out'] for e in trace_entries
                     if e['fn'].split('.')[-1] == s['fn']), None)
                return hit
    return None


def _concepts_md(manifest, glossary, schemas, samples, request, trace_entries):
    from app.mind.steps import _summarize_value
    parts = [
        '# Concepts — the vocabulary of the mind, with live examples', '',
        'Each concept is a `CONTEXT.md` term. Steps read and write them;',
        'stored concepts show a real row from the golden day\'s replay.', '',
    ]
    for name, body in manifest['concepts'].items():
        parts += [
            f'## {name}', '',
            f'_{glossary.get(name, "")}_', '',
            f'- **lives in**: `{body.get("lives_in", "")}`',
        ]
        if body.get('is_a'):
            parts.append(f'- **is a**: {body["is_a"]}')
        touching = [
            ('reads', s) for s in manifest['steps']
            if name in (s.get('reads') or [])
        ] + [
            ('writes', s) for s in manifest['steps']
            if name in (s.get('writes') or [])
        ]
        if touching:
            parts.append('- **steps**: ' + ', '.join(
                f'`{s["fn"]}` ({how})' for how, s in touching))
        schema = schemas.get(name)
        if schema:
            parts += ['- **columns**: ' + ', '.join(
                f'`{c}`' for c in schema['columns'])]
        ex = _concept_example(
            name, body, samples, request, trace_entries, manifest)
        if ex is not None:
            dump = json.dumps(
                _summarize_value(ex), ensure_ascii=False, default=str)
            if len(dump) > 700:
                dump = dump[:700] + '…'
            parts += ['- **example (golden day)**:', '  ```json',
                      f'  {dump}', '  ```']
        else:
            parts.append('- **example**: _(none produced on the golden day)_')
        parts.append('')
    return '\n'.join(parts)


def _load_test_index():
    """step fn → [test names/docstrings], from a MIND_TRACE_TESTS run."""
    if not TRACE_INDEX.exists():
        return {}
    idx, seen = {}, set()
    for e in json.loads(TRACE_INDEX.read_text()):
        key = e['fn'].split('.')[-1]
        doc = ' '.join((e.get('doc') or '').split()) or e.get('test', '')
        doc = doc if len(doc) <= 160 else doc[:160].rsplit(' ', 1)[0] + '…'
        entry = f'`{e["test"]}` — {doc}'
        if entry not in seen:
            seen.add(entry)
            idx.setdefault(key, []).append(entry)
    return idx


def update(narrate):
    glossary = parse_glossary()
    manifest = parse_manifest()
    steps = scan_steps()
    errors, warns = lint(manifest, glossary, steps, check_freshness=False)
    for e in errors:
        print('lint:', e)
    for w in warns:
        print('lint warn:', w)
    if errors:
        sys.exit('lint failed — fix before regenerating')

    run = golden_run(narrate=narrate)
    trace = _normalize_ids(run['trace'])
    fixture_label = json.loads(FIXTURE.read_text()).get('label', '')
    test_idx = _load_test_index()

    all_t = [e for e in trace if e['test'] is None]
    narr_i = next(
        (i for i, e in enumerate(all_t)
         if e['term'] == 'Inner language'), len(all_t))
    # The map's flow = top-level steps + phases nested inside a container
    # step. A phase is recognised by appearing exactly once; a helper
    # called in a loop (derive_feeling et al.) stays in graph.json only.
    from collections import Counter
    fn_count = Counter(e['fn'] for e in all_t)

    def flow(seg):
        return [
            e for e in seg
            if e.get('depth', 0) == 0
            or (e.get('depth', 0) == 1 and fn_count[e['fn']] == 1)
        ]

    open_entries = flow(all_t[:narr_i])
    close_entries = flow(all_t[narr_i + 1:])

    graph = {
        'meta': {
            'generated': 'mind_map.py --update' + (' --narrate' if narrate else ''),
            'source_hash': source_hash(),
            'golden_day': manifest['golden_day'],
        },
        'concepts': manifest['concepts'],
        'glossary': glossary,
        'request': run['request'],
        'steps': manifest['steps'],
        'test_rules': test_idx,
        'trace': {'open': all_t[:narr_i], 'close': all_t[narr_i + 1:],
                  'flow': {'open': open_entries, 'close': close_entries}},
        'schemas': {
            'OpenEpisodeRequest': _model_schema('OpenEpisodeRequest'),
            'EventIn': _model_schema('EventIn'),
        },
        'prompt': (run['narrate'].get('prompt') or {}),
        'tables': _table_schemas(manifest['concepts']),
    }
    (DOCS / 'graph.json').write_text(json.dumps(graph, indent=1, ensure_ascii=False, default=str))

    (DOCS / 'episode-open.mmd').write_text(
        _mmd_flow('Episode open — POST /episodes', open_entries))
    (DOCS / 'episode-close.mmd').write_text(
        _mmd_flow('Episode close — POST /episodes/{id}/close', close_entries))
    (DOCS / 'concepts.mmd').write_text(_mmd_concepts(manifest))
    (DOCS / 'schema-er.mmd').write_text(_mmd_er())
    (DOCS / 'lifecycle.mmd').write_text(_mmd_lifecycle())
    (DOCS / 'concepts.md').write_text(_concepts_md(
        manifest, glossary, graph['tables'],
        _normalize_ids(run['samples']), run['request'], all_t))

    step_meta = {s['fn']: s for s in manifest['steps']}
    for name, entries in (('episode-open', open_entries), ('episode-close', close_entries)):
        parts = [f'# {name} — traced steps', '',
                 f'Golden day: {fixture_label}', '',
                 '```mermaid', (DOCS / f'{name}.mmd').read_text().split('\n', 1)[1], '```', '']
        seen = set()
        for e in entries:
            fn = e['fn'].split('.')[-1]
            if fn in seen:
                continue
            seen.add(fn)
            ms = step_meta.get(fn, {'term': e['term']})
            parts.append(_step_doc(
                e['term'], steps.get(fn), glossary, ms,
                {'in': e['in'], 'out': e['out']}, test_idx.get(fn, [])))
            parts.append('')
        traced_fns = {e['fn'].split('.')[-1] for e in all_t}
        untraced = [s for s in manifest['steps'] if s['fn'] not in traced_fns]
        if untraced:
            parts += ['## Declared steps the golden day did not exercise', '']
            parts += [
                f"- **{s['term']}** `{s['fn']}()` — {s.get('reads', [])} → "
                f"{s.get('writes', [])}"
                for s in untraced
            ]
            parts.append('')
        (DOCS / f'{name}.md').write_text('\n'.join(parts))

    readme = [
        '# Mind Map — the mind-engine drawn from itself', '',
        'Generated by `mind-engine/scripts/mind_map.py --update`.',
        'Every node is a Concept from `CONTEXT.md`; every edge was observed',
        'running the golden day through the real code. Do not hand-edit.', '',
        '- `lifecycle.mmd` — the HTTP wire (open → narrate → close)',
        '- `episode-open.mmd` / `.md` — the open pass, step by step',
        '- `episode-close.mmd` / `.md` — the consolidation pass',
        '- `concepts.mmd` — the glossary vocabulary, grouped by home',
        '- `concepts.md` — every Concept: def, steps, columns, live example',
        '- `schema-er.mmd` — the real mind.* tables and columns (erDiagram)',
        '- `graph.json` — the machine-readable form (+ schemas, prompt, trace)',
        '- `narrative.md` — last real narration (`--narrate` regenerates)',
        '', 'Refresh: `python scripts/mind_map.py --update` (needs local DB).',
        'Verify: `python scripts/mind_map.py --check` (pre-push + Devin Stop).',
    ]
    (DOCS / 'README.md').write_text('\n'.join(readme) + '\n')

    if narrate:
        gen = run['narrate'].get('generation') or {}
        narr = [
            '# Narration — last real generation', '',
            f"Golden day: {manifest['golden_day']['label']}", '',
            '## Prompt (user)', '', '```',
            (run['narrate'].get('prompt') or {}).get('user', ''), '```', '',
            '## Narrative', '', '```',
            gen.get('text') or gen.get('inner_text') or '(no generation)', '```',
        ]
        (DOCS / 'narrative.md').write_text('\n'.join(narr) + '\n')
    print(f'mind-map updated → {DOCS} ({len(open_entries)} open / '
          f'{len(close_entries)} close traced steps)')


def _model_schema(name):
    from app.mind import models
    cls = getattr(models, name, None)
    return cls.model_json_schema() if cls else {}


def _table_schemas(concepts):
    from app.mind.tables import Base
    out = {}
    for name, body in concepts.items():
        m = re.search(r'mind\.(\w+)', body.get('lives_in') or '')
        if not m:
            continue
        for t in Base.metadata.sorted_tables:
            if t.name == m.group(1):
                out[name] = {
                    'table': t.name,
                    'columns': {
                        c.name: str(c.type) for c in t.columns
                    },
                }
                break
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--update', action='store_true')
    ap.add_argument('--narrate', action='store_true')
    ap.add_argument('--export-day', nargs=2, metavar=('TRIP_ID', 'DAY'))
    a = ap.parse_args()

    if a.export_day:
        export_day(a.export_day[0], int(a.export_day[1]))
    elif a.check:
        errors, warns = lint(
            parse_manifest(), parse_glossary(), scan_steps())
        for e in errors:
            print('✗', e)
        for w in warns:
            print('○', w)
        sys.exit(1 if errors else 0)
    elif a.update or a.narrate:
        update(narrate=a.narrate)
    else:
        ap.print_help()


if __name__ == '__main__':
    main()
