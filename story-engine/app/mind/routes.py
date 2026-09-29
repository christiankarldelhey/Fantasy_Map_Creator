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
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from datetime import datetime, timezone

from app.db import get_session
from app.mind.lens import episode_mood, render_lens, update_brain_mood
from app.mind.memory import (
    close_episode_memory,
    decay_pass,
    detect_patterns,
    episode_index,
)
from app.mind.needs import (
    need_items,
    need_snapshot,
    needs_pass,
    resolve_from_outcome,
    update_streak_counters,
)
from app.mind.models import (
    ClonePackRequest,
    CloseEpisodeRequest,
    CloseEpisodeResponse,
    ConsolidateRequest,
    ConsolidateResponse,
    DecideEpisodeRequest,
    DecideEpisodeResponse,
    EpisodeStateResponse,
    MindStateResponse,
    Mood,
    NarrateEpisodeRequest,
    NarrateEpisodeResponse,
    OpenEpisodeRequest,
    OpenEpisodeResponse,
    PackVersionOut,
    PackVersionsResponse,
    PerceivedEvent,
    PromotePackRequest,
    PromotePackResponse,
    PsychePacket,
    ReassignMoldRequest,
)
from app.models import NarrateDayRequest
from app.narrate_day import narrate_day
from app.prompt.sections.mind import mind_section
from app.mind.decisions import (
    pending_decision_point, proposed_commands, resolution_text,
    resolve_decision,
)
from app.mind.nl_resolver import NlPack, invalidate
from app.mind.packs import (
    active_version,
    clone_pack,
    list_versions,
    promote_pack,
)
from app.mind.perceive import perceive_events, resolve_break_items
from app.mind.provisioning import (
    DEFAULT_WIRING,
    get_or_create_brain,
    reassign_mold,
)
from app.mind.reflection import maybe_reflect
from app.mind.retrieval import link_evoked, retrieve
from app.mind.tables import Belief, Brain, Episode, Memory, Need, PackVersion

log = logging.getLogger(__name__)

router = APIRouter(tags=['mind'])


def _check_results(episode: Episode) -> list:
    """The checks the mind threw at open, lifted out of perceived_day —
    they live on the items so no separate column is needed."""
    return [
        item['check']
        for item in (episode.perceived_day or [])
        if item.get('check')
    ]


def _build_packet(db, episode: Episode, brain: Brain = None) -> PsychePacket:
    """Packet from persisted state — perception, lens and mood are written
    once at open; re-open replays the same snapshot (idempotent)."""
    perceived = [PerceivedEvent(**e) for e in (episode.perceived_day or [])]
    mood = Mood(**(brain.mood or {})) if brain else Mood()
    return PsychePacket(
        episode_id=episode.id,
        perceived_day=perceived,
        lens_block=episode.lens_block or '',
        mood=mood,
        check_results=_check_results(episode),
        needs_active=episode.needs_active or [],
        decision_point=pending_decision_point(db, brain, episode),
    )


def _episode_state(db, episode: Episode) -> EpisodeStateResponse:
    brain = (
        db.query(Brain)
        .filter_by(
            game_id=episode.game_id, character_id=episode.character_id
        )
        .one_or_none()
    )
    return EpisodeStateResponse(
        episode_id=episode.id,
        game_id=episode.game_id,
        character_id=episode.character_id,
        episode_ref=episode.episode_ref,
        status=episode.status,
        events=episode.events or [],
        perceived_day=episode.perceived_day or [],
        check_results=_check_results(episode),
        needs_active=episode.needs_active or [],
        lens_block=episode.lens_block,
        mood=episode.mood,
        outcome=episode.outcome,
        decision_point=pending_decision_point(db, brain, episode),
        decisions=episode.decisions or {},
        proposed_commands=proposed_commands(episode),
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
                # The flat open body IS the narrator input — store it in
                # NarrateDayRequest shape so narrate stays untouched.
                narrator_payload={
                    'day': payload.day.model_dump(exclude_none=True),
                    'trip': {'name': payload.trip_name},
                    'character': payload.character.model_dump(exclude_none=True),
                    'language': payload.language,
                    'characterState': payload.character_state,
                    'equipmentState': payload.equipment_state,
                    'fate': payload.fate,
                    'previousDaySummary': payload.previous_day_summary,
                    'bannedPhrases': payload.banned_phrases,
                    'recentDayClimates': payload.recent_day_climates,
                    'previousOpenings': payload.previous_openings,
                },
                # Audit snapshot: the exact knobs this episode runs under.
                # Admin edits apply to future episodes, not in-flight ones.
                config_snapshot={
                    'nl_pack': payload.game_id,
                    'pack_version': active_version(db, payload.game_id),
                    'brain_mold': brain.mold_slug,
                    'theme_weights': brain.theme_weights,
                    'wiring': brain.wiring,
                },
            )
            db.add(episode)
            db.flush()  # fires the id default before we build the packet
            perceived = perceive_events(
                db, payload.game_id, brain,
                [e.model_dump() for e in payload.events],
                character=payload.character.model_dump(),
            )
            # The episode stirs memory: top-K evoked, strengthened, linked.
            evoked = retrieve(db, brain, episode, perceived)
            episode.perceived_day = link_evoked(perceived, evoked)
            # Needs: detectors fire from the snapshot/body state, threads
            # from what was just perceived. Snapshot lands on the episode.
            needs = needs_pass(
                db, payload.game_id, brain, episode, perceived,
                character=payload.character.model_dump(),
            )
            episode.needs_active = need_snapshot(needs)
            # A streak that died while a watched need is open ended the
            # wrong way (C12) — 'no bread' while hungry is no relief.
            resolve_break_items(
                db, payload.game_id, brain, perceived, needs,
                {**DEFAULT_WIRING, **(brain.wiring or {})},
            )
            # The felt body joins the perceived day (C11): 'need' items
            # encode as memory — the ache of these days, not just a fact.
            episode.perceived_day = (
                episode.perceived_day or []
            ) + need_items(needs)
            # Mood: this episode's feel, weighed by open needs, blended
            # into the running mood.
            episode.mood = episode_mood(
                db, payload.game_id, perceived, brain=brain, needs=needs
            )
            update_brain_mood(db, payload.game_id, brain, episode.mood)
            beliefs = (
                db.query(Belief)
                .filter_by(
                    character_id=brain.character_id, status='active'
                )
                .all()
            )
            episode.lens_block = render_lens(
                payload.character.name or payload.character.id,
                brain.mood, beliefs, evoked,
                needs=episode.needs_active,
            )
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
        packet = _build_packet(db, episode, brain)
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
    return _episode_state(db, episode)


@router.post('/episodes/{episode_id}/close', response_model=CloseEpisodeResponse)
def close_episode(
    episode_id: str,
    payload: CloseEpisodeRequest,
    db: Session = Depends(get_session),
):
    """The host reports what it persisted; Mind consolidates: encode the
    perceived day into memories, decay the volatiles, forget the faded.
    Idempotent — re-close updates the outcome but never re-encodes or
    re-decays."""
    try:
        episode = db.get(Episode, episode_id)
        if episode is None:
            raise HTTPException(status_code=404, detail='episode not found')
        if payload.outcome is not None:
            episode.outcome = payload.outcome
        if episode.status == 'closed':
            db.commit()
            return CloseEpisodeResponse(
                episode_id=episode.id, status='closed', already_closed=True
            )
        brain = (
            db.query(Brain)
            .filter_by(
                game_id=episode.game_id, character_id=episode.character_id
            )
            .one_or_none()
        )
        summary = close_episode_memory(db, brain, episode) if brain else {}
        if brain:
            # The host's outcome may settle open needs; streak counters
            # only count episodes the host actually persisted.
            summary['needs_resolved'] = resolve_from_outcome(
                db, brain, episode, payload.outcome,
            )
            update_streak_counters(db, brain, episode)
            # B4: the mind's only LLM call. Trigger-gated; a skipped or
            # failed reflection never breaks the close.
            summary['reflection'] = maybe_reflect(
                db, brain, episode,
                character_name=(
                    (episode.narrator_payload or {}).get('character') or {}
                ).get('name'),
            )
        episode.status = 'closed'
        episode.closed_at = datetime.now(timezone.utc)
        db.commit()
        return CloseEpisodeResponse(episode_id=episode.id, status='closed', **summary)
    except SQLAlchemyError as exc:
        db.rollback()
        log.warning('close_episode failed: %s', exc)
        raise HTTPException(status_code=503, detail='mind persistence unavailable')


def _evoked_impressions(db, episode):
    """Descs of the memories this episode stirred — feeds the lens-reference
    narrative eval (did the prose echo what the mind brought up?)."""
    ids = {
        mem_id
        for item in (episode.perceived_day or [])
        for mem_id in (item.get('evoked') or [])
    }
    if not ids:
        return []
    rows = db.query(Memory.desc).filter(Memory.id.in_(ids)).all()
    return [r[0] for r in rows]


@router.post('/episodes/{episode_id}/narrate', response_model=NarrateEpisodeResponse)
def narrate_episode(
    episode_id: str,
    payload: NarrateEpisodeRequest,
    db: Session = Depends(get_session),
):
    """Narrate through the mind: wraps the existing narrate_day pipeline
    (NOT a rewrite) with the episode's narrator_payload, injecting the
    rendered lens + salient readings as a new prompt section. Regenerates
    on each call — narrative is not persisted mind state."""
    try:
        episode = db.get(Episode, episode_id)
        if episode is None:
            raise HTTPException(status_code=404, detail='episode not found')
        if not ((episode.narrator_payload or {}).get('day') or {}).get('date'):
            raise HTTPException(
                status_code=422,
                detail='episode has no narratable day',
            )
        try:
            req = NarrateDayRequest.model_validate(episode.narrator_payload)
        except ValidationError as exc:
            raise HTTPException(
                status_code=422,
                detail=f'invalid narrator_payload: {exc.errors()[:3]}',
            )
        brain = (
            db.query(Brain)
            .filter_by(
                game_id=episode.game_id, character_id=episode.character_id
            )
            .one_or_none()
        )
        result = narrate_day(
            day=req.day,
            trip=req.trip,
            character=req.character,
            language=payload.language or req.language,
            character_state=req.characterState,
            equipment_state=req.equipmentState,
            fate=req.fate,
            previous_day_summary=req.previousDaySummary,
            banned_phrases=req.bannedPhrases,
            recent_day_climates=req.recentDayClimates,
            previous_openings=req.previousOpenings,
            mind_block=mind_section(episode.lens_block, episode.perceived_day),
            impressions=_evoked_impressions(db, episode),
            nl=NlPack(db, episode.game_id, brain=brain),
        )
        episode.narrated_at = datetime.now(timezone.utc)
        if episode.status == 'open':
            episode.status = 'narrated'
        db.commit()
        generation = result['generation'] or {}
        return NarrateEpisodeResponse(
            episode_id=episode.id,
            prompt=result['prompt'],
            generation=generation,
            perceived_day=[
                PerceivedEvent(**e) for e in (episode.perceived_day or [])
            ],
            mood=Mood(**(brain.mood or {})) if brain else Mood(),
            lens_block=episode.lens_block or '',
            check_results=_check_results(episode),
            needs_active=episode.needs_active or [],
            proposed_commands=proposed_commands(episode),
            decision_point=pending_decision_point(db, brain, episode),
            generation_meta={
                k: v for k, v in generation.items() if k != 'text'
            },
        )
    except SQLAlchemyError as exc:
        db.rollback()
        log.warning('narrate_episode failed: %s', exc)
        raise HTTPException(status_code=503, detail='mind persistence unavailable')


@router.post('/episodes/{episode_id}/decide', response_model=DecideEpisodeResponse)
def decide_episode(
    episode_id: str,
    payload: DecideEpisodeRequest,
    db: Session = Depends(get_session),
):
    """Record which option the host picked for an open decision point.
    Returns a resolution line + the option's `proposed_commands` — Mind
    proposes, the host validates and applies. Re-deciding the same option
    replays idempotently; a different option is a 409."""
    try:
        episode = db.get(Episode, episode_id)
        if episode is None:
            raise HTTPException(status_code=404, detail='episode not found')
        brain = (
            db.query(Brain)
            .filter_by(
                game_id=episode.game_id, character_id=episode.character_id
            )
            .one_or_none()
        )
        try:
            dec, option, already = resolve_decision(
                db, brain, episode, payload.option_id, payload.decision_id
            )
        except KeyError as exc:  # KeyError ⊂ LookupError — order matters
            raise HTTPException(status_code=422, detail=str(exc))
        except LookupError as exc:
            raise HTTPException(status_code=404, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc))
        db.commit()
        character_name = (
            (episode.narrator_payload or {}).get('character') or {}
        ).get('name')
        return DecideEpisodeResponse(
            episode_id=episode.id,
            decision_id=dec['decision_id'],
            option_id=option['id'],
            resolution=resolution_text(
                db, episode.game_id, option, character_name, brain=brain
            ),
            proposed_commands=option.get('commands') or [],
            already_decided=already,
        )
    except SQLAlchemyError as exc:
        db.rollback()
        log.warning('decide_episode failed: %s', exc)
        raise HTTPException(status_code=503, detail='mind persistence unavailable')


@router.get('/mind/state/{character_id}', response_model=MindStateResponse)
def mind_state(character_id: str, db: Session = Depends(get_session)):
    try:
        brain = db.query(Brain).filter_by(character_id=character_id).one_or_none()
        beliefs = (
            db.query(Belief).filter_by(character_id=character_id).all()
            if brain else []
        )
        memories = (
            db.query(Memory)
            .filter_by(character_id=character_id)
            .order_by(Memory.importance.desc())
            .all()
            if brain else []
        )
        needs = (
            db.query(Need)
            .filter_by(character_id=character_id)
            .order_by(Need.urgency.desc())
            .all()
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
        memories=[
            {
                'id': m.id, 'kind': m.kind, 'desc': m.desc, 'tags': m.tags,
                'importance': m.importance, 'strength': m.strength,
                'evocations': m.evocations, 'consolidated': m.consolidated,
            }
            for m in memories
        ],
        needs=[
            {
                'id': n.id, 'key': n.key, 'type': n.type,
                'description': n.description, 'urgency': n.urgency,
                'status': n.status, 'entity': n.linked_entity,
            }
            for n in needs
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


@router.post('/maintenance/consolidate', response_model=ConsolidateResponse)
def consolidate_degraded(
    payload: ConsolidateRequest,
    db: Session = Depends(get_session),
):
    """B10: batch consolidation for degraded brains (NPCs). Their closes
    only encode — this pass runs the deferred decay + pattern detection.
    `brain_ids` pins specific brains (degraded or not — an explicit pin is
    operator intent); otherwise every brain wired 'degraded', scoped by
    `game_id` when given."""
    try:
        query = db.query(Brain)
        if payload.brain_ids:
            query = query.filter(Brain.id.in_(payload.brain_ids))
        else:
            if payload.game_id:
                query = query.filter_by(game_id=payload.game_id)
        brains = query.all()
        results = []
        for brain in brains:
            w = {**DEFAULT_WIRING, **(brain.wiring or {})}
            if not payload.brain_ids and not w.get('degraded'):
                continue
            latest = (
                db.query(Episode)
                .filter_by(character_id=brain.character_id)
                .order_by(Episode.created_at.desc())
                .first()
            )
            idx = episode_index(latest) if latest else None
            if idx is None:
                continue
            patterns = detect_patterns(db, brain, latest, idx, w)
            results.append({
                'brain_id': brain.id,
                'character_id': brain.character_id,
                'patterns': patterns['formed'],
                'patterns_faded': patterns['faded'],
                **decay_pass(db, brain, idx),
            })
        db.commit()
        return ConsolidateResponse(brains=len(results), results=results)
    except SQLAlchemyError as exc:
        db.rollback()
        log.warning('consolidate failed: %s', exc)
        raise HTTPException(status_code=503, detail='mind persistence unavailable')


@router.get('/packs/{game_id}/versions', response_model=PackVersionsResponse)
def pack_versions(game_id: str, db: Session = Depends(get_session)):
    """B10 (PRD §9.2): the version ledger of a game's world pack."""
    try:
        versions = [
            PackVersionOut(
                game_id=v.game_id, version=v.version, status=v.status,
                namespace=v.namespace, note=v.note,
                created_at=(
                    v.created_at.isoformat() if v.created_at else None
                ),
            )
            for v in list_versions(db, game_id)
        ]
        return PackVersionsResponse(
            game_id=game_id,
            active_version=active_version(db, game_id),
            versions=versions,
        )
    except SQLAlchemyError as exc:
        log.warning('pack_versions failed: %s', exc)
        raise HTTPException(status_code=503, detail='mind persistence unavailable')


@router.post('/packs/{game_id}/clone', response_model=PackVersionOut)
def pack_clone(
    game_id: str,
    payload: ClonePackRequest,
    db: Session = Depends(get_session),
):
    """Copy the live pack into a draft namespace — edit it in the admin or
    test it via game_id '<game>@draft-N' without touching production."""
    try:
        row = clone_pack(db, game_id, note=payload.note)
        db.commit()
        return PackVersionOut(
            game_id=row.game_id, version=row.version, status=row.status,
            namespace=row.namespace, note=row.note,
            created_at=row.created_at.isoformat() if row.created_at else None,
        )
    except SQLAlchemyError as exc:
        db.rollback()
        log.warning('pack_clone failed: %s', exc)
        raise HTTPException(status_code=503, detail='mind persistence unavailable')


@router.post('/packs/{game_id}/promote', response_model=PromotePackResponse)
def pack_promote(
    game_id: str,
    payload: PromotePackRequest,
    db: Session = Depends(get_session),
):
    """Publish a draft: the live pack is archived as a frozen snapshot and
    the draft's rows replace it in one transaction. Readers keep using
    `game_id`; the resolver cache is dropped so the new pack is live."""
    try:
        prev_active = active_version(db, game_id)
        row = promote_pack(db, game_id, payload.version)
        if row is None:
            raise HTTPException(status_code=404, detail='draft not found')
        db.commit()
        invalidate(game_id)
        return PromotePackResponse(
            game_id=game_id, version=row.version, status=row.status,
            archived_version=prev_active or 1,
        )
    except SQLAlchemyError as exc:
        db.rollback()
        log.warning('pack_promote failed: %s', exc)
        raise HTTPException(status_code=503, detail='mind persistence unavailable')
