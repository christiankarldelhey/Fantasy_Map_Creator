# ============================================================================
# Mind Engine HTTP routes
# ----------------------------------------------------------------------------
# POST /episodes          — open: validate events[], persist episode + config
#                           snapshot, return the psyche_packet stub.
# GET  /episodes/{id}     — episode state (debug).
# GET  /mind/state/{cid}  — character mind profile (shell until A5).
#
# DB failures degrade to 503 — the stateless /narrate-day path keeps working
# and the host can always fall back to it.
# ============================================================================
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db import get_session
from app.mind.models import (
    EpisodeStateResponse,
    MindStateResponse,
    Mood,
    OpenEpisodeRequest,
    OpenEpisodeResponse,
    PerceivedEvent,
    PsychePacket,
    ReassignMoldRequest,
)
from app.mind.provisioning import get_or_create_brain, reassign_mold
from app.mind.tables import Belief, Brain, Episode

log = logging.getLogger(__name__)

router = APIRouter(tags=['mind'])


def _build_packet_stub(episode: Episode, brain: Brain = None) -> PsychePacket:
    """A2 stub perception: every event is plainly noticed (readings/salience
    land in A6, lens in A8). The mood already comes from the living brain."""
    perceived = [
        PerceivedEvent(**e) for e in (episode.events or [])
    ]
    mood = Mood(**(brain.mood or {})) if brain else Mood()
    return PsychePacket(
        episode_id=episode.id, perceived_day=perceived, mood=mood
    )


def _episode_state(episode: Episode) -> EpisodeStateResponse:
    return EpisodeStateResponse(
        episode_id=episode.id,
        game_id=episode.game_id,
        character_id=episode.character_id,
        episode_ref=episode.episode_ref,
        status=episode.status,
        events=episode.events or [],
        perceived_day=episode.perceived_day or [],
        outcome=episode.outcome,
        created_at=episode.created_at.isoformat(),
        narrated_at=episode.narrated_at.isoformat() if episode.narrated_at else None,
        closed_at=episode.closed_at.isoformat() if episode.closed_at else None,
    )


@router.post('/episodes', response_model=OpenEpisodeResponse)
def open_episode(payload: OpenEpisodeRequest, db: Session = Depends(get_session)):
    try:
        episode = None
        if payload.episode_ref is not None:
            episode = (
                db.query(Episode)
                .filter_by(
                    game_id=payload.game_id,
                    character_id=payload.character.id,
                    episode_ref=payload.episode_ref,
                )
                .one_or_none()
            )
        if episode is None:
            # Lazy brain provisioning: first open clones the mold (the
            # character's brain_profile hint applies only here).
            brain = get_or_create_brain(
                db, payload.game_id, payload.character.id,
                hint_slug=getattr(payload.character, 'brain_profile', None),
            )
            episode = Episode(
                game_id=payload.game_id,
                character_id=payload.character.id,
                episode_ref=payload.episode_ref,
                status='open',
                events=[e.model_dump() for e in payload.events],
                narrator_payload=payload.narrator_payload,
                # Audit snapshot: the exact knobs this episode runs under.
                # Admin edits apply to future episodes, not in-flight ones.
                config_snapshot={
                    'nl_pack': payload.game_id,
                    'brain_mold': brain.mold_slug,
                    'theme_weights': brain.theme_weights,
                    'wiring': brain.wiring,
                },
            )
            db.add(episode)
            db.flush()  # fires the id default before we build the packet
            packet = _build_packet_stub(episode, brain)
            episode.perceived_day = [p.model_dump() for p in packet.perceived_day]
            db.commit()
            db.refresh(episode)
        else:
            brain = (
                db.query(Brain)
                .filter_by(
                    game_id=payload.game_id,
                    character_id=payload.character.id,
                )
                .one_or_none()
            )
        packet = _build_packet_stub(episode, brain)
        return OpenEpisodeResponse(episode_id=episode.id, psyche_packet=packet)
    except SQLAlchemyError as exc:
        db.rollback()
        log.warning('open_episode failed: %s', exc)
        raise HTTPException(status_code=503, detail='mind persistence unavailable')


@router.get('/episodes/{episode_id}', response_model=EpisodeStateResponse)
def get_episode(episode_id: str, db: Session = Depends(get_session)):
    try:
        episode = db.get(Episode, episode_id)
    except SQLAlchemyError as exc:
        log.warning('get_episode failed: %s', exc)
        raise HTTPException(status_code=503, detail='mind persistence unavailable')
    if episode is None:
        raise HTTPException(status_code=404, detail='episode not found')
    return _episode_state(episode)


@router.get('/mind/state/{character_id}', response_model=MindStateResponse)
def mind_state(character_id: str, db: Session = Depends(get_session)):
    try:
        brain = db.query(Brain).filter_by(character_id=character_id).one_or_none()
        beliefs = (
            db.query(Belief).filter_by(character_id=character_id).all()
            if brain else []
        )
        count = db.query(Episode).filter_by(character_id=character_id).count()
    except SQLAlchemyError as exc:
        log.warning('mind_state failed: %s', exc)
        raise HTTPException(status_code=503, detail='mind persistence unavailable')
    return MindStateResponse(
        character_id=character_id,
        brain=(
            {
                'id': brain.id,
                'mold_slug': brain.mold_slug,
                'theme_weights': brain.theme_weights,
                'wiring': brain.wiring,
                'mood': brain.mood,
                'counters': brain.counters,
            }
            if brain else None
        ),
        beliefs=[
            {
                'id': b.id, 'kind': b.kind, 'statement': b.statement,
                'confidence': b.confidence, 'origin': b.origin,
                'status': b.status,
            }
            for b in beliefs
        ],
        episodes=count,
    )


@router.post('/mind/brains/{character_id}/mold')
def reassign_brain_mold(
    character_id: str,
    payload: ReassignMoldRequest,
    db: Session = Depends(get_session),
):
    """Admin reassignment: point the brain at another mold. reclone=True also
    resets config (theme_weights + wiring) to the mold's — memories and
    beliefs are content and are never touched."""
    try:
        brain = reassign_mold(
            db, payload.game_id or 'middle_earth', character_id,
            payload.slug, reclone=payload.reclone,
        )
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        log.warning('reassign_mold failed: %s', exc)
        raise HTTPException(status_code=503, detail='mind persistence unavailable')
    if brain is None:
        raise HTTPException(status_code=404, detail='brain not found')
    return {
        'character_id': character_id,
        'mold_slug': brain.mold_slug,
        'recloned': payload.reclone,
    }
