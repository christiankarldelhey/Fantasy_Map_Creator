# ============================================================================
# Mind Studio — API
# ----------------------------------------------------------------------------
# JSON for the Studio app (ADR 0002). Reads show what the Mind already
# owns — the Character card, memories, Forgotten traces, beliefs, needs,
# mood and every Episode with its Lens and narration; writes edit the
# card and the running mood. Never reads Host tables.
#
# Auth: HTTP Basic against ADMIN_USER / ADMIN_PASSWORD — unset = closed.
# ============================================================================
import os
import secrets

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel
from sqlalchemy import func, text
from sqlalchemy.orm import Session
from typing import Dict, List, Optional

from app.db import get_session
from app.evals.narrative_checks import memory_echoes_in_text
from app.mind.provisioning import DEFAULT_WIRING, _find_preset
from app.mind.tables import (
    Mind, MindPreset, Character, Episode, ForgottenMemory, Memory, Musing,
    Need,
)
from app.mind.lens import MOOD_CAUSE_MIN_VALENCE
from app.mind.voice import mood_name

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
    beliefs = (
        db.query(Memory).filter_by(kind='conviction', **scope).all()
    )
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
                    # The day chart reads the rest: when it happened,
                    # what it felt like (valence/severity/imprint dims),
                    # and any body deltas the Host reported.
                    'when': p.get('when') or {},
                    'subject': p.get('subject'),
                    'valence': p.get('valence'),
                    'severity': p.get('severity'),
                    'world_valence': p.get('world_valence'),
                    'imprint': p.get('imprint') or {},
                    'mood_pull': p.get('mood_pull'),
                    'data': {
                        k: (p.get('data') or {}).get(k)
                        for k in (
                            'description', 'act', 'outcome', 'name',
                            'record', 'situation', 'npc_name',
                            'shadow_effect', 'after', 'reading',
                        )
                        if (p.get('data') or {}).get(k) is not None
                    },
                }
                for p in (ep.perceived_day or [])
            ],
            'lens': _brief_lens_lines(ep.brief, ep.narrative),
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
        # ADR 0017: temperament is the resting point the mood regresses
        # to (the nature's fixed mood); personality the couplings —
        # moodiness, resistance, sensitivities, choice variability.
        'temperament': dict(mind.temperament or {}),
        'personality': dict(mind.personality or {}),
        # Advanced view: the effective wiring (defaults + overrides).
        'wiring': {**DEFAULT_WIRING, **(mind.wiring or {})},
        'memories': memories,
        'beliefs': [
            {
                'id': b.id,
                'statement': b.desc,
                'origin': b.origin,
                'status': (b.conviction or {}).get('status'),
                'kind': (b.conviction or {}).get('kind'),
                'horizon': (b.conviction or {}).get('horizon'),
                'strength': (b.conviction or {}).get('strength') or 0.0,
                'evidence': (b.conviction or {}).get('evidence') or [],
                'born_episode': b.created_episode,
                'updated_episode': (b.conviction or {}).get('updated'),
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
        mood['arousal'] = round(max(-1.0, min(1.0, body.arousal)), 3)
    valence = mood.get('valence') or 0.0
    mood['dominant'] = mood_name(mood, db, game) or 'neutral'
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


class TemperamentPatch(BaseModel):
    """The resting point the Mood regresses to (ADR 0017) — the same
    space as mood (valence, arousal), but fixed: the character's
    nature, not its weather."""
    valence: Optional[float] = None
    arousal: Optional[float] = None


@router.patch('/minds/{character_id}/temperament')
def patch_temperament(
    character_id: str,
    body: TemperamentPatch,
    game: str = DEFAULT_GAME,
    db: Session = Depends(get_session),
):
    mind = _mind_or_404(db, game, character_id)
    temperament = dict(mind.temperament or {})
    if body.valence is not None:
        temperament['valence'] = round(max(-1.0, min(1.0, body.valence)), 3)
    if body.arousal is not None:
        temperament['arousal'] = round(max(-1.0, min(1.0, body.arousal)), 3)
    mind.temperament = temperament
    db.commit()
    return temperament


# Scalar couplings an admin may dial.
PERSONALITY_SCALARS = ('moodiness', 'resistance', 'choice_variability')


class PersonalityPatch(BaseModel):
    """{key: value} merged into mind.personality — null removes the key."""
    values: Dict[str, object]


@router.patch('/minds/{character_id}/personality')
def patch_personality(
    character_id: str,
    body: PersonalityPatch,
    game: str = DEFAULT_GAME,
    db: Session = Depends(get_session),
):
    mind = _mind_or_404(db, game, character_id)
    personality = dict(mind.personality or {})
    for key, value in body.values.items():
        if value is None:
            personality.pop(key, None)
            continue
        if key in PERSONALITY_SCALARS:
            personality[key] = round(max(0.0, min(1.0, float(value))), 3)
        else:
            # Unknown keys pass through — personality is a named-key
            # dict meant to grow as the engine learns new couplings.
            personality[key] = value
    mind.personality = personality
    db.commit()
    return personality


@router.get('/presets')
def list_presets(
    game: str = DEFAULT_GAME,
    db: Session = Depends(get_session),
):
    """The authored archetypes — for the Studio's personality select.
    Lists the nature each preset would imprint (temperament +
    personality); theme_weights/wiring/beliefs stay out of the picker."""
    rows = (
        db.query(MindPreset)
        .filter_by(game_id=game)
        .order_by(MindPreset.slug)
        .all()
    )
    return [
        {
            'slug': r.slug,
            'name': r.name,
            'description': r.description,
            'temperament': r.temperament or {},
            'personality': r.personality or {},
        }
        for r in rows
    ]


class ApplyPersonality(BaseModel):
    slug: str


@router.post('/minds/{character_id}/personality-preset')
def apply_personality_preset(
    character_id: str,
    body: ApplyPersonality,
    game: str = DEFAULT_GAME,
    db: Session = Depends(get_session),
):
    """Imprint a preset's nature onto a living mind — temperament and
    personality ONLY (the fixed mood point and the couplings). Identity
    (preset_slug), wiring, theme_weights and everything lived — beliefs,
    memories, needs — stay untouched."""
    mind = _mind_or_404(db, game, character_id)
    preset = _find_preset(db, game, body.slug)
    if preset is None:
        raise HTTPException(status_code=404, detail=f"preset '{body.slug}' not found")
    mind.temperament = dict(preset.temperament or {})
    mind.personality = dict(preset.personality or {})
    db.commit()
    return {
        'temperament': mind.temperament,
        'personality': mind.personality,
    }



@router.get('/tags')
def tag_registry(db: Session = Depends(get_session)):
    """The shared Tag registry (ADR-0016): the one flat vocabulary that
    gating, memory, retrieval, needs and attitudes all consult. Read-only
    for now — the seed file is the source of truth.

    Exception to 'never reads Host tables': `public.narration_tags` is
    the shared registry by design — the Mind consults the same table
    the Host validates against, so both speak one vocabulary."""
    try:
        rows = db.execute(
            text(
                'SELECT family, value, description '
                'FROM public.narration_tags ORDER BY family, value'
            )
        ).all()
    except Exception:  # noqa: BLE001 — host DB may not share our engine
        raise HTTPException(
            status_code=503,
            detail='tag registry unavailable (public.narration_tags)',
        )
    families: Dict[str, Dict] = {}
    for fam, value, desc in rows:
        desc = desc or {}
        entry = families.setdefault(
            fam,
            {
                'family': fam,
                'consumers': desc.get('consumers') or [],
                'description': {
                    k: v for k, v in desc.items() if k != 'consumers'
                },
                'open': False,
                'values': [],
            },
        )
        if value == '*':
            entry['open'] = True
        else:
            entry['values'].append(value)
    return {'families': list(families.values())}
