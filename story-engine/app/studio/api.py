# ============================================================================
# Mind Studio — read API (block 1: see a Mind)
# ----------------------------------------------------------------------------
# JSON for the Studio app (ADR 0002). Read-only: everything it shows the
# Mind already owns — memories, Forgotten traces, beliefs, needs, mood and
# every Episode with its Lens and narration. The Character card comes from
# the last snapshot the Host sent on open until the Mind owns Characters
# (ADR 0001, block 2). Never reads Host tables.
#
# Auth: HTTP Basic against ADMIN_USER / ADMIN_PASSWORD — unset = closed.
# ============================================================================
import os
import re
import secrets

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import get_session
from app.evals.narrative_checks import memory_echoes_in_text
from app.mind.tables import (
    Belief, Brain, Episode, ForgottenMemory, Memory, Need,
)

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


def _card(episode):
    """The Character as the Host last described it (pre block 2)."""
    payload = (episode.narrator_payload or {}) if episode else {}
    char = payload.get('character') or {}
    return {
        'name': char.get('name'),
        'description': char.get('description'),
        'foundational_phrase': char.get('system_prompt'),
        'voice_instructions': char.get('introduction_instructions'),
        'skills': char.get('skills') or {},
    }


def _condition(episode):
    payload = (episode.narrator_payload or {}) if episode else {}
    return payload.get('characterState') or {}


def _episode_date(ep):
    if ep.episode_date:
        return ep.episode_date.isoformat()
    return ((ep.narrator_payload or {}).get('day') or {}).get('date')


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
            'name': _card(latest)['name'] or brain.character_id,
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
            'lens': _lens_lines(
                ep.lens_block, beliefs, memories, needs, evoked,
                ep.narrative,
            ),
            'narrative': ep.narrative,
            'narrative_language': ep.narrative_language,
        })

    return {
        'character_id': character_id,
        'game': game,
        'preset': brain.mold_slug,
        'character': _card(latest),
        'condition': _condition(latest),
        'mood': brain.mood or {},
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
