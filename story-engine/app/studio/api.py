# ============================================================================
# Mind Studio — read API (block 1: see a Mind)
# ----------------------------------------------------------------------------
# JSON for the Studio app (ADR 0002). Read-only: everything it shows the
# Mind already owns — the Character card, memories, Forgotten traces,
# beliefs, needs, mood and every Episode with its Lens and narration.
# Never reads Host tables.
#
# Auth: HTTP Basic against ADMIN_USER / ADMIN_PASSWORD — unset = closed.
# ============================================================================
import os
import re
import secrets

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import Dict, List, Optional

from app.db import get_session
from app.evals.narrative_checks import memory_echoes_in_text
from app.mind import nl_resolver
from app.mind.provisioning import DEFAULT_WIRING
from app.mind.tables import (
    Belief, Brain, BrainNlOverride, Character, Episode, Facet,
    ForgottenMemory, Memory, Need, NlBand, NlPhraseList, NlThreshold,
)
from app.mind.traits import TRAITS, apply_trait, traits_of

_basic = HTTPBasic()


def require_studio_user(creds: HTTPBasicCredentials = Depends(_basic)):
    user = os.environ.get('ADMIN_USER') or ''
    password = os.environ.get('ADMIN_PASSWORD') or ''
    ok = (
        user and password
        and secrets.compare_digest(creds.username, user)
        and secrets.compare_digest(creds.password, password)
    )
    if not ok:
        raise HTTPException(
            status_code=401, detail='unauthorized',
            headers={'WWW-Authenticate': 'Basic realm="Mind Studio"'},
        )


router = APIRouter(
    prefix='/studio/api',
    tags=['studio'],
    dependencies=[Depends(require_studio_user)],
)

DEFAULT_GAME = 'middle_earth'

# Lens headers as render_lens writes them → the section they open.
_LENS_SECTIONS = {
    'what they hold true': 'beliefs',
    'yesterday, as they remember it': 'yesterday',
    'stirring today': 'stirring',
    'the body asks for': 'needs',
}
_AGE = re.compile(r'^(Yesterday|\d+ days ago|A long while ago)\s+—\s*', re.I)
_ANCHOR = re.compile(r'\s*—\s*the .+ calls it back\s*$')


def _card(row, episode=None):
    """The Character card, Mind-owned (ADR 0001). Minds never adopted at
    open (a sim that predates C34, say) fall back to the last snapshot
    the Host sent."""
    if row is not None:
        return {
            'name': row.name,
            'kind': row.kind,
            'adopted': True,
            'slug': row.slug,
            'type': row.type,
            'gender': row.gender,
            'entity_name': row.entity_name,
            'portrait_url': row.portrait_url,
            'description': row.description,
            'description_es': row.description_es,
            'foundational_phrase': row.foundational_phrase,
            'voice_instructions': row.voice_instructions,
            'skills': row.skills or {},
            'original': None,
        }
    payload = (episode.narrator_payload or {}) if episode else {}
    char = payload.get('character') or {}
    return {
        'name': char.get('name'),
        'kind': 'copy',
        'adopted': False,
        'slug': None,
        'type': None,
        'gender': None,
        'entity_name': char.get('entity_name'),
        'portrait_url': None,
        'description': char.get('description'),
        'description_es': None,
        'foundational_phrase': char.get('system_prompt'),
        'voice_instructions': char.get('introduction_instructions'),
        'skills': char.get('skills') or {},
        'original': None,
    }


def _with_lineage(db, row, card):
    """Resolve the copy's Original slug onto the card payload."""
    if row is not None and row.original_id:
        original = db.get(Character, row.original_id)
        card['original'] = original.slug if original else None
    return card


def _condition(episode):
    payload = (episode.narrator_payload or {}) if episode else {}
    return payload.get('characterState') or {}


def _episode_date(ep):
    if ep.episode_date:
        return ep.episode_date.isoformat()
    return ((ep.narrator_payload or {}).get('day') or {}).get('date')


def _brief_lens_lines(brief, narrative):
    """C35: the Lens straight from the Episode brief — each line keeps its
    part (focus / carried / day), phase, why and the node it came from."""
    out = []
    for part in ('focus', 'carried', 'day'):
        lines = brief.get(part) or []
        if part == 'focus':
            lines = [lines] if lines else []
        for line in lines:
            kind, _, ref_id = (line.get('id') or '').partition(':')
            text = line.get('render') or line.get('text') or ''
            out.append({
                'section': part,
                'kind': line.get('kind'),
                'text': text,
                'phase': line.get('phase'),
                'why': line.get('why'),
                'ref': (
                    {'kind': kind, 'id': ref_id}
                    if kind in ('belief', 'memory', 'need') and ref_id
                    else None
                ),
                'resonated': bool(narrative) and memory_echoes_in_text(
                    (line.get('text') or '').strip().lower(), narrative
                ),
            })
    return out


def _lens_lines(lens_block, beliefs, memories, needs, evoked, narrative):
    """Each Lens bullet → {section, text, ref, resonated}. `ref` points at
    the node it came from (belief / memory / need) so the Studio can draw
    the thread; `resonated` is the C32 echo rule applied per line."""
    out, section = [], None
    by_statement = {b.statement.strip().lower(): b.id for b in beliefs}
    by_desc = {
        (m['desc'] or '').strip().lower(): m['id'] for m in memories
        if m['id'] in evoked
    }
    by_need = {(n.description or '').strip().lower(): n.id for n in needs}
    for raw in (lens_block or '').splitlines():
        line = raw.strip()
        if not line:
            continue
        if not line.startswith('- '):
            section = _LENS_SECTIONS.get(line.rstrip(':').strip().lower())
            continue
        if section is None:
            continue
        text = line[2:]
        core = _ANCHOR.sub('', _AGE.sub('', text)).strip().lower()
        ref = None
        if section == 'beliefs':
            ref = {'kind': 'belief', 'id': by_statement.get(core)}
        elif section == 'needs':
            ref = {'kind': 'need', 'id': by_need.get(core)}
        elif core in by_desc:
            ref = {'kind': 'memory', 'id': by_desc[core]}
        out.append({
            'section': (
                'evoked' if section == 'stirring' and _AGE.match(text)
                else 'today' if section == 'stirring' else section
            ),
            'text': text,
            'ref': ref if ref and ref['id'] else None,
            'resonated': (
                bool(narrative) and memory_echoes_in_text(core, narrative)
            ),
        })
    return out


def _memory_out(m, forgotten=False):
    return {
        'id': m.id,
        'kind': m.kind,
        'desc': m.desc,
        'tags': m.tags or [],
        'valence': m.valence or 0.0,
        'importance': m.importance or 0.0,
        'strength': (m.last_strength if forgotten else m.strength) or 0.0,
        'evocations': m.evocations or 0,
        'voiced': m.voiced or 0,
        'consolidated': bool(m.consolidated),
        'born_episode': m.created_episode,
        'last_evoked_episode': (
            None if forgotten else m.last_evoked_episode
        ),
        'forgotten_episode': m.forgotten_episode if forgotten else None,
        'state': 'forgotten' if forgotten else 'alive',
    }


@router.get('/minds')
def list_minds(game: str = DEFAULT_GAME, db: Session = Depends(get_session)):
    """Every Mind in this Host, most recently lived first — the first one
    is the Studio's default (the Mind you are playing right now)."""
    last = (
        db.query(
            Episode.character_id,
            func.max(Episode.created_at).label('last_lived_at'),
            func.count(Episode.id).label('episodes'),
        )
        .filter(Episode.game_id == game)
        .group_by(Episode.character_id)
        .subquery()
    )
    rows = (
        db.query(Brain, last.c.last_lived_at, last.c.episodes)
        .outerjoin(last, last.c.character_id == Brain.character_id)
        .filter(Brain.game_id == game)
        .all()
    )
    mem_counts = dict(
        db.query(Memory.character_id, func.count(Memory.id))
        .filter(Memory.game_id == game)
        .group_by(Memory.character_id)
        .all()
    )
    cards = {
        c.character_id: c
        for c in db.query(Character).filter_by(game_id=game)
    }
    minds = []
    for brain, lived_at, episodes in rows:
        latest = (
            db.query(Episode)
            .filter_by(game_id=game, character_id=brain.character_id)
            .order_by(Episode.created_at.desc())
            .first()
        ) if lived_at else None
        minds.append({
            'character_id': brain.character_id,
            'name': (
                _card(cards.get(brain.character_id), latest)['name']
                or brain.character_id
            ),
            'preset': brain.mold_slug,
            'episodes': episodes or 0,
            'memories': mem_counts.get(brain.character_id, 0),
            'mood': brain.mood or {},
            'last_lived_at': lived_at.isoformat() if lived_at else None,
        })
    minds.sort(key=lambda m: m['last_lived_at'] or '', reverse=True)
    return {
        'game': game,
        'default': minds[0]['character_id'] if minds else None,
        'minds': minds,
    }


@router.get('/minds/{character_id}')
def get_mind(
    character_id: str,
    game: str = DEFAULT_GAME,
    db: Session = Depends(get_session),
):
    """One Mind, whole: its card, what it holds now, what it lost, and
    every Episode it lived — enough for the timeline to rebuild the Mind
    as it stood on any of them."""
    brain = (
        db.query(Brain)
        .filter_by(game_id=game, character_id=character_id)
        .one_or_none()
    )
    if brain is None:
        raise HTTPException(status_code=404, detail='mind not found')
    scope = {'game_id': game, 'character_id': character_id}
    episodes = (
        db.query(Episode).filter_by(**scope)
        .order_by(Episode.episode_idx.asc().nullsfirst(),
                  Episode.created_at.asc())
        .all()
    )
    beliefs = db.query(Belief).filter_by(**scope).all()
    needs = db.query(Need).filter_by(**scope).all()
    memories = (
        [_memory_out(m) for m in db.query(Memory).filter_by(**scope)]
        + [_memory_out(m, forgotten=True)
           for m in db.query(ForgottenMemory).filter_by(**scope)]
    )
    latest = episodes[-1] if episodes else None

    card_row = (
        db.query(Character)
        .filter_by(game_id=game, character_id=character_id)
        .one_or_none()
    )
    card = _with_lineage(db, card_row, _card(card_row, latest))

    episodes_out = []
    for ep in episodes:
        evoked = set((ep.lens_eval or {}).get('evoked') or {
            mem_id
            for item in (ep.perceived_day or [])
            for mem_id in (item.get('evoked') or [])
        })
        episodes_out.append({
            'id': ep.id,
            'idx': ep.episode_idx,
            'ref': ep.episode_ref,
            'date': _episode_date(ep),
            'status': ep.status,
            'mood': ep.mood or {},
            'needs_active': ep.needs_active or [],
            'perceived': [
                {
                    'type': p.get('type'),
                    'perception': p.get('perception') or 'noticed',
                    'reading': p.get('reading'),
                    'salience': p.get('salience') or 0.0,
                    'evoked': p.get('evoked') or [],
                }
                for p in (ep.perceived_day or [])
            ],
            'evoked': sorted(evoked),
            'voiced': (ep.lens_eval or {}).get('voiced') or [],
            'lens': (
                _brief_lens_lines(ep.brief, ep.narrative) if ep.brief
                else _lens_lines(
                    ep.lens_block, beliefs, memories, needs, evoked,
                    ep.narrative,
                )
            ),
            'brief': ep.brief,
            'narrative': ep.narrative,
            'narrative_language': ep.narrative_language,
            'narrative_translation': ep.narrative_translation,
        })

    return {
        'character_id': character_id,
        'game': game,
        'preset': brain.mold_slug,
        'character': card,
        'condition': _condition(latest),
        'mood': brain.mood or {},
        # The six human dials, read back from the effective wiring —
        # a raw knob edit still shows on the slider.
        'traits': traits_of({**DEFAULT_WIRING, **(brain.wiring or {})}),
        # Concerns — "le pesa": what the Mind gives extra weight to.
        'concerns': dict(brain.theme_weights or {}),
        # Advanced view: the effective wiring (defaults + overrides).
        'wiring': {**DEFAULT_WIRING, **(brain.wiring or {})},
        'memories': memories,
        'beliefs': [
            {
                'id': b.id,
                'statement': b.statement,
                'origin': b.origin,
                'status': b.status,
                'kind': b.kind,
                'horizon': b.horizon,
                'confidence': b.confidence or 0.0,
                'evidence': b.evidence or [],
                'born_episode': b.formed_episode,
                'updated_episode': b.updated_episode,
            }
            for b in beliefs
        ],
        'needs': [
            {
                'id': n.id,
                'key': n.key,
                'type': n.type,
                'description': n.description,
                'urgency': n.urgency or 0.0,
                'status': n.status,
                'opened_episode': n.opened_episode,
                'updated_episode': n.updated_episode,
            }
            for n in needs
        ],
        'episodes': episodes_out,
    }


class CardPatch(BaseModel):
    """Editable identity fields. Only unset-absent keys apply — a null
    value clears the field."""
    name: Optional[str] = None
    type: Optional[str] = None
    gender: Optional[str] = None
    entity_name: Optional[str] = None
    description: Optional[str] = None
    description_es: Optional[str] = None
    portrait_url: Optional[str] = None
    foundational_phrase: Optional[str] = None
    voice_instructions: Optional[str] = None
    skills: Optional[Dict[str, float]] = None


@router.patch('/minds/{character_id}/card')
def patch_card(
    character_id: str,
    body: CardPatch,
    game: str = DEFAULT_GAME,
    db: Session = Depends(get_session),
):
    """Edit a copy's card (ADR 0001). Originals stay read-only for now —
    they are the authored source every future copy descends from."""
    row = (
        db.query(Character)
        .filter_by(game_id=game, character_id=character_id)
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=404, detail='character card not found')
    if row.kind == 'original':
        raise HTTPException(
            status_code=409,
            detail='originals are not editable yet',
        )
    for field, value in body.model_dump(exclude_unset=True).items():
        if field == 'skills':
            row.skills = {
                k: max(0, min(10, int(v))) for k, v in (value or {}).items()
            }
        else:
            setattr(row, field, value)
    db.commit()
    return _with_lineage(db, row, _card(row))


def _brain_or_404(db, game, character_id):
    brain = (
        db.query(Brain)
        .filter_by(game_id=game, character_id=character_id)
        .one_or_none()
    )
    if brain is None:
        raise HTTPException(status_code=404, detail='mind not found')
    return brain


class TraitsPatch(BaseModel):
    """{trait: 0..1} — each dial writes its knobs into brain.wiring."""
    traits: Dict[str, float]


@router.patch('/minds/{character_id}/traits')
def patch_traits(
    character_id: str,
    body: TraitsPatch,
    game: str = DEFAULT_GAME,
    db: Session = Depends(get_session),
):
    brain = _brain_or_404(db, game, character_id)
    unknown = set(body.traits) - set(TRAITS)
    if unknown:
        raise HTTPException(
            status_code=422, detail=f'unknown traits: {sorted(unknown)}'
        )
    wiring = dict(brain.wiring or {})
    for trait, t in body.traits.items():
        apply_trait(wiring, trait, t)
    brain.wiring = wiring
    db.commit()
    return traits_of({**DEFAULT_WIRING, **wiring})


class ConcernsPatch(BaseModel):
    """{key: weight} to set, {key: null} to remove — 'le pesa'."""
    weights: Dict[str, Optional[float]]


@router.patch('/minds/{character_id}/concerns')
def patch_concerns(
    character_id: str,
    body: ConcernsPatch,
    game: str = DEFAULT_GAME,
    db: Session = Depends(get_session),
):
    brain = _brain_or_404(db, game, character_id)
    weights = dict(brain.theme_weights or {})
    for key, w in body.weights.items():
        if w is None:
            weights.pop(key, None)
        else:
            weights[key] = max(0.0, min(1.0, float(w)))
    brain.theme_weights = weights
    db.commit()
    return weights


# ============================================================================
# The World voice (block 4) — how the Host's numbers become words
# ----------------------------------------------------------------------------
# The effective NL pack merges stored rows over built-in defaults key by
# key: a table/key with ANY stored rows replaces its default content
# entirely. Editing therefore rewrites a whole band table or phrase list;
# deleting the stored rows reverts that key to the default.
# ============================================================================


def _voice(db, game):
    pack = nl_resolver._pack(db, game)
    stored = nl_resolver._load_pack(db, game)
    custom_facets = {
        (f['event_type'], f['field_path']) for f in stored['facets']
    }
    return {
        'game': game,
        'bands': {
            table: {'rows': rows, 'custom': table in stored['bands']}
            for table, rows in sorted(pack['bands'].items())
        },
        'thresholds': {
            key: {'value': value, 'custom': key in stored['thresholds']}
            for key, value in sorted(pack['thresholds'].items())
        },
        'phrases': {
            key: {'items': items, 'custom': key in stored['phrases']}
            for key, items in sorted(pack['phrases'].items())
        },
        'facets': [
            {
                **f,
                'custom': (f['event_type'], f['field_path']) in custom_facets,
            }
            for f in pack['facets']
        ],
    }


@router.get('/voice')
def get_voice(game: str = DEFAULT_GAME, db: Session = Depends(get_session)):
    """La voz del mundo — the pack the narrator resolves through."""
    return _voice(db, game)


class BandRow(BaseModel):
    below: Optional[float] = None
    above_m: Optional[float] = None
    phrase: Optional[str] = None
    phrases: Optional[List[str]] = None


@router.put('/voice/bands/{table}')
def put_band_table(
    table: str,
    rows: List[BandRow],
    game: str = DEFAULT_GAME,
    db: Session = Depends(get_session),
):
    """Rewrite one band table: ordered rows, first match wins."""
    db.query(NlBand).filter_by(game_id=game, table_name=table).delete()
    for i, r in enumerate(rows):
        meta = {}
        if r.above_m is not None:
            meta['above_m'] = r.above_m
        if r.phrases:
            meta['phrases'] = r.phrases
        db.add(NlBand(
            game_id=game, table_name=table, ordinal=i, below=r.below,
            phrase=r.phrase, meta=meta or None,
        ))
    db.commit()
    nl_resolver.invalidate(game)
    return _voice(db, game)['bands']


@router.delete('/voice/bands/{table}')
def delete_band_table(
    table: str, game: str = DEFAULT_GAME,
    db: Session = Depends(get_session),
):
    db.query(NlBand).filter_by(game_id=game, table_name=table).delete()
    db.commit()
    nl_resolver.invalidate(game)
    return _voice(db, game)['bands']


class ThresholdValue(BaseModel):
    value: float


@router.put('/voice/thresholds/{key}')
def put_threshold(
    key: str,
    body: ThresholdValue,
    game: str = DEFAULT_GAME,
    db: Session = Depends(get_session),
):
    row = (
        db.query(NlThreshold).filter_by(game_id=game, key=key).one_or_none()
    )
    if row is None:
        db.add(NlThreshold(game_id=game, key=key, value=body.value))
    else:
        row.value = body.value
    db.commit()
    nl_resolver.invalidate(game)
    return _voice(db, game)['thresholds']


@router.delete('/voice/thresholds/{key}')
def delete_threshold(
    key: str, game: str = DEFAULT_GAME,
    db: Session = Depends(get_session),
):
    db.query(NlThreshold).filter_by(game_id=game, key=key).delete()
    db.commit()
    nl_resolver.invalidate(game)
    return _voice(db, game)['thresholds']


class PhraseListBody(BaseModel):
    phrases: List[str]


@router.put('/voice/phrases/{key}')
def put_phrase_list(
    key: str,
    body: PhraseListBody,
    game: str = DEFAULT_GAME,
    db: Session = Depends(get_session),
):
    """Replace a phrase bank wholesale — order is kept, pick is random."""
    db.query(NlPhraseList).filter_by(game_id=game, key=key).delete()
    for i, phrase in enumerate(p for p in body.phrases if p.strip()):
        db.add(NlPhraseList(
            game_id=game, key=key, ordinal=i, phrase=phrase,
        ))
    db.commit()
    nl_resolver.invalidate(game)
    return _voice(db, game)['phrases']


@router.delete('/voice/phrases/{key}')
def delete_phrase_list(
    key: str, game: str = DEFAULT_GAME,
    db: Session = Depends(get_session),
):
    db.query(NlPhraseList).filter_by(game_id=game, key=key).delete()
    db.commit()
    nl_resolver.invalidate(game)
    return _voice(db, game)['phrases']


class FacetBody(BaseModel):
    unit: Optional[str] = None
    description: Optional[str] = None


@router.put('/voice/facets/{event_type}/{field_path}')
def put_facet(
    event_type: str,
    field_path: str,
    body: FacetBody,
    game: str = DEFAULT_GAME,
    db: Session = Depends(get_session),
):
    row = (
        db.query(Facet)
        .filter_by(game_id=game, event_type=event_type, field_path=field_path)
        .one_or_none()
    )
    if row is None:
        db.add(Facet(
            game_id=game, event_type=event_type, field_path=field_path,
            unit=body.unit, description=body.description,
        ))
    else:
        row.unit = body.unit
        row.description = body.description
    db.commit()
    nl_resolver.invalidate(game)
    return _voice(db, game)['facets']


@router.delete('/voice/facets/{event_type}/{field_path}')
def delete_facet(
    event_type: str,
    field_path: str,
    game: str = DEFAULT_GAME,
    db: Session = Depends(get_session),
):
    db.query(Facet).filter_by(
        game_id=game, event_type=event_type, field_path=field_path,
    ).delete()
    db.commit()
    nl_resolver.invalidate(game)
    return _voice(db, game)['facets']


# ============================================================================
# Accents — one Mind's exceptions to the World voice (B7)
# ----------------------------------------------------------------------------
# brain_nl_overrides replaces a key's global content for that brain only:
# phrase_list overrides give the Mind its own way of saying things,
# threshold/band overrides retune what its senses call out.
# ============================================================================


def _accent(db, brain):
    return {
        'thresholds': {
            k: rows[0].value
            for k, rows in
            nl_resolver._overrides(db, brain, 'threshold').items()
        },
        'phrases': {
            k: [r.phrase for r in rows]
            for k, rows in
            nl_resolver._overrides(db, brain, 'phrase_list').items()
        },
        'bands': {
            k: [
                {'ordinal': r.ordinal, 'below': r.below, 'phrase': r.phrase}
                for r in rows
            ]
            for k, rows in
            nl_resolver._overrides(db, brain, 'band').items()
        },
    }


@router.get('/minds/{character_id}/accent')
def get_accent(
    character_id: str,
    game: str = DEFAULT_GAME,
    db: Session = Depends(get_session),
):
    brain = _brain_or_404(db, game, character_id)
    return _accent(db, brain)


@router.put('/minds/{character_id}/accent/phrases/{key}')
def put_accent_phrases(
    character_id: str,
    key: str,
    body: PhraseListBody,
    game: str = DEFAULT_GAME,
    db: Session = Depends(get_session),
):
    """The Mind's own way of saying something — replaces the world's
    phrases for that key in its ears only."""
    brain = _brain_or_404(db, game, character_id)
    db.query(BrainNlOverride).filter_by(
        brain_id=brain.id, kind='phrase_list', key=key,
    ).delete()
    for i, phrase in enumerate(p for p in body.phrases if p.strip()):
        db.add(BrainNlOverride(
            brain_id=brain.id, kind='phrase_list', key=key,
            ordinal=i, phrase=phrase,
        ))
    db.commit()
    return _accent(db, brain)


@router.delete('/minds/{character_id}/accent/phrases/{key}')
def delete_accent_phrases(
    character_id: str,
    key: str,
    game: str = DEFAULT_GAME,
    db: Session = Depends(get_session),
):
    brain = _brain_or_404(db, game, character_id)
    db.query(BrainNlOverride).filter_by(
        brain_id=brain.id, kind='phrase_list', key=key,
    ).delete()
    db.commit()
    return _accent(db, brain)


@router.put('/minds/{character_id}/accent/thresholds/{key}')
def put_accent_threshold(
    character_id: str,
    key: str,
    body: ThresholdValue,
    game: str = DEFAULT_GAME,
    db: Session = Depends(get_session),
):
    brain = _brain_or_404(db, game, character_id)
    db.query(BrainNlOverride).filter_by(
        brain_id=brain.id, kind='threshold', key=key,
    ).delete()
    db.add(BrainNlOverride(
        brain_id=brain.id, kind='threshold', key=key,
        ordinal=0, value=body.value,
    ))
    db.commit()
    return _accent(db, brain)


@router.delete('/minds/{character_id}/accent/thresholds/{key}')
def delete_accent_threshold(
    character_id: str,
    key: str,
    game: str = DEFAULT_GAME,
    db: Session = Depends(get_session),
):
    brain = _brain_or_404(db, game, character_id)
    db.query(BrainNlOverride).filter_by(
        brain_id=brain.id, kind='threshold', key=key,
    ).delete()
    db.commit()
    return _accent(db, brain)
