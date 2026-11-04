# ============================================================================
# Mind Studio — API
# ----------------------------------------------------------------------------
# JSON for the Studio app (ADR 0002). Reads show what the Mind already
# owns — the Character card, memories, Forgotten traces, beliefs, needs,
# mood and every Episode with its Lens and narration; writes edit the
# card, traits, concerns and the running mood. Never reads Host tables.
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
from app.mind.provisioning import DEFAULT_WIRING
from app.mind.tables import (
    Belief, Mind, Character, Episode, ForgottenMemory, Memory, Musing,
    Need,
)
from app.mind.lens import MOOD_CAUSE_MIN_VALENCE
from app.mind.traits import TRAITS, apply_trait, traits_of
from app.mind.voice import mood_phrase

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
        'portrait_url': char.get('portrait_url'),
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
                    if kind in ('belief', 'memory', 'need', 'musing')
                    and ref_id
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
        db.query(Mind, last.c.last_lived_at, last.c.episodes)
        .outerjoin(last, last.c.character_id == Mind.character_id)
        .filter(Mind.game_id == game)
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
    for mind, lived_at, episodes in rows:
        latest = (
            db.query(Episode)
            .filter_by(game_id=game, character_id=mind.character_id)
            .order_by(Episode.created_at.desc())
            .first()
        ) if lived_at else None
        minds.append({
            'character_id': mind.character_id,
            'name': (
                _card(cards.get(mind.character_id), latest)['name']
                or mind.character_id
            ),
            'preset': mind.preset_slug,
            'episodes': episodes or 0,
            'memories': mem_counts.get(mind.character_id, 0),
            'mood': mind.mood or {},
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
    mind = (
        db.query(Mind)
        .filter_by(game_id=game, character_id=character_id)
        .one_or_none()
    )
    if mind is None:
        raise HTTPException(status_code=404, detail='mind not found')
    scope = {'game_id': game, 'character_id': character_id}
    episodes = (
        db.query(Episode).filter_by(**scope)
        .order_by(Episode.episode_idx.asc().nullsfirst(),
                  Episode.created_at.asc())
        .all()
    )
    beliefs = db.query(Belief).filter_by(**scope).all()
    musings = db.query(Musing).filter_by(**scope).all()
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
        'preset': mind.preset_slug,
        'character': card,
        'condition': _condition(latest),
        'mood': mind.mood or {},
        # The six human dials, read back from the effective wiring —
        # a raw knob edit still shows on the slider.
        'traits': traits_of({**DEFAULT_WIRING, **(mind.wiring or {})}),
        # Concerns — "le pesa": what the Mind gives extra weight to.
        'concerns': dict(mind.theme_weights or {}),
        # Advanced view: the effective wiring (defaults + overrides).
        'wiring': {**DEFAULT_WIRING, **(mind.wiring or {})},
        'memories': memories,
        'beliefs': [
            {
                'id': b.id,
                'statement': b.statement,
                'origin': b.origin,
                'status': b.status,
                'kind': b.kind,
                'horizon': b.horizon,
                'strength': b.strength or 0.0,
                'evidence': b.evidence or [],
                'born_episode': b.formed_episode,
                'updated_episode': b.updated_episode,
            }
            for b in beliefs
        ],
        'musings': [
            {
                'id': m.id,
                'statement': m.statement,
                'tags': m.tags or [],
                'origin': m.origin,
                'born_episode': m.formed_episode,
            }
            for m in musings
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


def _mind_or_404(db, game, character_id):
    mind = (
        db.query(Mind)
        .filter_by(game_id=game, character_id=character_id)
        .one_or_none()
    )
    if mind is None:
        raise HTTPException(status_code=404, detail='mind not found')
    return mind


class TraitsPatch(BaseModel):
    """{trait: 0..1} — each dial writes its knobs into mind.wiring."""
    traits: Dict[str, float]


@router.patch('/minds/{character_id}/traits')
def patch_traits(
    character_id: str,
    body: TraitsPatch,
    game: str = DEFAULT_GAME,
    db: Session = Depends(get_session),
):
    mind = _mind_or_404(db, game, character_id)
    unknown = set(body.traits) - set(TRAITS)
    if unknown:
        raise HTTPException(
            status_code=422, detail=f'unknown traits: {sorted(unknown)}'
        )
    wiring = dict(mind.wiring or {})
    for trait, t in body.traits.items():
        apply_trait(wiring, trait, t)
    mind.wiring = wiring
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
    mind = _mind_or_404(db, game, character_id)
    weights = dict(mind.theme_weights or {})
    for key, w in body.weights.items():
        if w is None:
            weights.pop(key, None)
        else:
            weights[key] = max(0.0, min(1.0, float(w)))
    mind.theme_weights = weights
    db.commit()
    return weights


class MoodPatch(BaseModel):
    """The mind's current weather: valence and arousal. `dominant`
    re-resolves from valence and the carried cause follows the same
    rule the episode blend applies — an admin never writes the
    phrase or the cause directly."""
    valence: Optional[float] = None
    arousal: Optional[float] = None


@router.patch('/minds/{character_id}/mood')
def patch_mood(
    character_id: str,
    body: MoodPatch,
    game: str = DEFAULT_GAME,
    db: Session = Depends(get_session),
):
    mind = _mind_or_404(db, game, character_id)
    mood = dict(mind.mood or {})
    if body.valence is not None:
        mood['valence'] = round(max(-1.0, min(1.0, body.valence)), 3)
    if body.arousal is not None:
        mood['arousal'] = round(max(0.0, min(1.0, body.arousal)), 3)
    valence = mood.get('valence') or 0.0
    mood['dominant'] = mood_phrase(valence) or 'neutral'
    carried = mood.get('cause')
    # A cause stays only while it explains the mood it rides with: gone
    # near neutral or after the valence sign flipped past it.
    if abs(valence) < MOOD_CAUSE_MIN_VALENCE or (
        carried and (carried.get('valence') or 0.0) * valence < 0
    ):
        carried = None
    mood['cause'] = carried
    mind.mood = mood
    db.commit()
    return mood



