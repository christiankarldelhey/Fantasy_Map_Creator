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
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from datetime import datetime, timedelta, timezone

from app.db import get_session
from app.evals.narrative_checks import memory_echoes_in_text
from app.mind.director import direct, director_enabled
from app.mind.engine import (
    acute_hit, derive_feeling, feeling_lexicon, project_body, regress,
)
from app.mind.focus import brief_lines, build_brief, need_origins
from app.mind.lens import (
    PROMPT_PHASES, _age_phrase, brief_beats, disposition_beats,
    episode_mood, inner_lines, line_text, mood_cause, render_lens,
    update_mind_mood,
)
from app.mind.memory import (
    _compact_duplicates,
    _release_resolved_needs,
    close_episode_memory,
    decay_pass,
    detect_patterns,
    episode_index,
)
from app.mind.choosing import choose
from app.mind.needs import (
    need_items,
    need_snapshot,
    needs_pass,
    refresh_state_needs,
    resolve_from_outcome,
    update_streak_counters,
)
from app.mind.models import (
    ChooseRequest,
    ChooseResponse,
    ClonePackRequest,
    CloseEpisodeRequest,
    CloseEpisodeResponse,
    ConsolidateRequest,
    ConsolidateResponse,
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
    PerceiveRequest,
    PerceiveResponse,
    PromotePackRequest,
    PromotePackResponse,
    PsychePacket,
    ReassignPresetRequest,
    ResetMindRequest,
)
from app.models import NarrateDayRequest
from app.narrate_day import INNER_LANGUAGE, narrate_day
from app.mind.packs import (
    active_version,
    clone_pack,
    list_versions,
    promote_pack,
)
from app.mind.perceive import (
    derive_tags, perceive_events, resolve_break_items,
)
from app.mind.relations import decay_all, feed_event
from app.mind.detectors import body_projection
from app.mind.semantics import (
    load_semantics, semantic_delta,
)
from app.mind.tags import subject_tags
from app.mind.checks import character_state
from app.mind.voice import mood_phrase
from app.mind.provisioning import (
    DEFAULT_WIRING,
    NEUTRAL_MOOD,
    effective_character,
    get_or_create_mind,
    get_or_create_character,
    reassign_preset,
    seed_musings,
    seed_starter_beliefs,
)
from app.mind.reflection import maybe_reflect
from app.mind.memory import episode_date, episode_index
from app.mind.retrieval import (
    dialogue_recall, link_evoked, memory_age_days, retrieve,
)
from app.mind.attitudes import active_convictions
from app.mind.tables import (
    Mind, MindPreset, Episode, ForgottenMemory, Memory, Musing,
    Relation,
    Need, PackVersion,
)

log = logging.getLogger(__name__)

router = APIRouter(tags=['mind'])


def _encounter_prompt_shape(event):
    """A narrator-payload encounter rebuilt from its event (ADR-0016):
    the section needs the legacy entity/interaction shape; the event
    carries the same facts flat in data."""
    data = event.get('data') or {}
    substance = data.get('substance') or {}
    dialogue = {
        k: v for k, v in {
            'topic': data.get('topic'),
            'npc_attitude': substance.get('attitude'),
            'concrete_content': substance.get('content'),
            'tension': substance.get('tension'),
            'traveller_stance': substance.get('stance'),
        }.items() if v is not None
    }
    return {
        'phase': (event.get('when') or {}).get('phase'),
        # ADR-0019: the clock position survives to the timeline — the
        # narrator reads 'late in the afternoon', not '16:00'.
        'hour': (event.get('when') or {}).get('hour'),
        'region': (event.get('where') or {}).get('region'),
        'entity': {
            # A resolved person names herself — 'Bungo', 'Pearl'; passive
            # encounters (signs, sightings) have no one to name.
            'name': (data.get('npc_name') or data.get('entity_name')
                     or data.get('entity')),
            'type': data.get('entity_type'),
        },
        'interaction': {
            'form': data.get('form'),
            'prose_hint': data.get('prose_hint'),
            'outcome': data.get('outcome'),
            'dialogue_content': dialogue or None,
        },
    }


def _previous_rest(db, episode):
    """Where last night was spent (ADR-0019): the previous episode's rest
    event becomes the dawn anchor of today's timeline — the place named
    so the traveller wakes THERE, and the rest tags so a remarkable
    night (rest:poor/rest:good mark the extremes only) can colour the
    waking. Only a literally consecutive night counts — a gap between
    journeys is not 'yesterday'."""
    today = episode_date(episode)
    idx = episode_index(episode)
    if today is None or idx is None:
        return None
    prev = (
        db.query(Episode)
        .filter(
            Episode.game_id == episode.game_id,
            Episode.character_id == episode.character_id,
            Episode.episode_idx == idx - 1,
        )
        .one_or_none()
    )
    if prev is None or episode_date(prev) != today - timedelta(days=1):
        return None
    rest = next(
        (
            (e.get('data') or {})
            for e in (prev.events or [])
            if e.get('type') == 'rest'
        ),
        None,
    )
    if not rest:
        return None
    return {
        'place': rest.get('entity_name'),
        'reading': rest.get('reading'),
        'tags': rest.get('tags') or [],
    }


def _check_results(episode: Episode) -> list:
    """The checks the mind threw at open, lifted out of perceived_day —
    they live on the items so no separate column is needed."""
    return [
        item['check']
        for item in (episode.perceived_day or [])
        if item.get('check')
    ]


def _build_packet(db, episode: Episode, mind: Mind = None) -> PsychePacket:
    """Packet from persisted state — perception, lens and mood are written
    once at open; re-open replays the same snapshot (idempotent)."""
    perceived = [PerceivedEvent(**e) for e in (episode.perceived_day or [])]
    mood = Mood(**(mind.mood or {})) if mind else Mood()
    return PsychePacket(
        episode_id=episode.id,
        perceived_day=perceived,
        lens_block=episode.lens_block or '',
        mood=mood,
        day_mood=Mood(**(episode.mood or {})),
        check_results=_check_results(episode),
        needs_active=episode.needs_active or [],
        brief=episode.brief,
    )


def _episode_state(db, episode: Episode) -> EpisodeStateResponse:
    return EpisodeStateResponse(
        episode_id=episode.id,
        game_id=episode.game_id,
        character_id=episode.character_id,
        episode_ref=episode.episode_ref,
        episode_idx=episode.episode_idx,
        episode_date=(
            episode.episode_date.isoformat() if episode.episode_date else None
        ),
        status=episode.status,
        events=episode.events or [],
        perceived_day=episode.perceived_day or [],
        check_results=_check_results(episode),
        needs_active=episode.needs_active or [],
        lens_block=episode.lens_block,
        mood=episode.mood,
        outcome=episode.outcome,
        decisions=episode.decisions or {},
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
            # Lazy mind provisioning: first open clones the preset (the
            # character's preset hint applies only here).
            mind = get_or_create_mind(
                db, payload.game_id, payload.character.id,
                hint_slug=getattr(payload.character, 'preset', None),
            )
            # ADR 0001: the card belongs to the Mind. The first payload
            # adopts it; from then on the Mind's copy answers identity
            # and the wire only carries the live Condition.
            character = get_or_create_character(
                db, payload.game_id, payload.character.model_dump()
            )
            card = effective_character(
                character, payload.character.model_dump()
            )
            # ADR-0016: the wire `condition` is the live Condition report —
            # it overrides the card's stored scalars so detectors and
            # checks read the freshest body, never yesterday's snapshot.
            for k, v in (payload.condition or {}).items():
                if v is not None:
                    card[k] = v
            # C29: the mind keeps its own clock — episode_idx counts this
            # mind's lived episodes monotonically, so a new trip's day 1
            # never collides with an old journey's day 1 in memory ages.
            prev_idx = (
                db.query(func.max(Episode.episode_idx))
                .filter_by(
                    game_id=payload.game_id,
                    character_id=payload.character.id,
                )
                .scalar()
            )
            episode = Episode(
                game_id=payload.game_id,
                character_id=payload.character.id,
                episode_ref=payload.episode_ref,
                status='open',
                episode_idx=(prev_idx or 0) + 1,
                events=[e.model_dump() for e in payload.events],
                # The flat open body IS the narrator input — store the
                # canonical channels; narrate rebuilds the day's phase
                # material from episode.events themselves.
                narrator_payload={
                    'trip': {'name': payload.arc},
                    'character': {
                        k: v for k, v in card.items() if v is not None
                    },
                    'language': payload.language,
                    'characterState': payload.condition,
                    'fate': payload.fate,
                    'episode': (
                        payload.episode.model_dump(exclude_none=True)
                        if payload.episode else None
                    ),
                    'arc': payload.arc,
                    'condition': payload.condition,
                    'narration_notes': payload.narration_notes,
                },
                # Audit snapshot: the exact knobs this episode runs under.
                # Admin edits apply to future episodes, not in-flight ones.
                config_snapshot={
                    'pack_version': active_version(db, payload.game_id),
                    'preset': mind.preset_slug,
                    'wiring': mind.wiring,
                },
            )
            # C30: the calendar clock — narrative age is measured in
            # in-world days, so rest between journeys counts.
            episode.episode_date = episode_date(episode)
            db.add(episode)
            db.flush()  # fires the id default before we build the packet
            # Wave C: events already sedimented by interim /perceive are
            # annotated for narration but never re-fed — the counters the
            # interim pass left are consumed here, once.
            felt_ids = set(
                (mind.counters or {}).get('felt_event_ids') or []
            )
            perceived = perceive_events(
                db, payload.game_id, mind,
                [e.model_dump() for e in payload.events],
                character=card,
                episode_idx=episode.episode_idx,
                felt_ids=felt_ids,
            )
            if felt_ids:
                counters = dict(mind.counters or {})
                counters['felt_event_ids'] = []
                mind.counters = counters
            # The episode stirs memory: top-K evoked, strengthened, linked.
            evoked = retrieve(db, mind, episode, perceived)
            episode.perceived_day = link_evoked(perceived, evoked)
            # C23: a spoken encounter queries memory on its own terms —
            # what was asked embeds against what the mind retained, so
            # the traveller may answer from their own past. The hit joins
            # the item's evoked list and rides the RECALLS channel.
            episode_idx = episode_index(episode)
            w_mind = {**DEFAULT_WIRING, **(mind.wiring or {})}
            evoked_ids = {m.id for m in evoked}
            for item in episode.perceived_day:
                data = item.get('data') or {}
                if item.get('type') != 'encounter' or not data.get('substance'):
                    continue
                mem = dialogue_recall(
                    db, mind, item, episode_idx, exclude_ids=evoked_ids
                )
                if mem is None:
                    continue
                item['evoked'].append(mem.id)
                evoked_ids.add(mem.id)
                mem.evocations = (mem.evocations or 0) + 1
                if episode_idx is not None:
                    mem.last_evoked_episode = episode_idx
                mem.strength = min(
                    1.0,
                    (mem.strength or 0.0)
                    + w_mind.get('retrieval_boost', 0.1),
                )
            # Needs: detectors fire from the snapshot/body state, threads
            # from what was just perceived. Snapshot lands on the episode.
            needs = needs_pass(
                db, payload.game_id, mind, episode, perceived,
                character=card,
            )
            episode.needs_active = need_snapshot(needs)
            # A streak that died while a watched need is open ended the
            # wrong way (C12) — 'no bread' while hungry is no relief.
            resolve_break_items(
                db, payload.game_id, mind, perceived, needs, w_mind,
            )
            # The felt body joins the perceived day (C11): 'need' items
            # encode as memory — the ache of these days, not just a fact.
            episode.perceived_day = (
                episode.perceived_day or []
            ) + need_items(needs)
            # Mood: this episode's feel — the perceived day INCLUDING the
            # body's own need items (the single need channel: their
            # valence weighs the day, their imprint the running mood) —
            # blended into the running mood. The lens speaks the ENTERING
            # mood — captured before the blend — so the day never colours
            # its own opening with what has not happened yet.
            entering_mood = dict(mind.mood or {})
            episode.mood = episode_mood(
                db, payload.game_id, episode.perceived_day,
                mind=mind, needs=needs,
            )
            update_mind_mood(
                db, payload.game_id, mind, episode.mood,
                cause=mood_cause(perceived, needs),
                when=episode.episode_date,
            )
            beliefs = active_convictions(db, mind.character_id)
            musings = (
                db.query(Musing)
                .filter_by(
                    game_id=payload.game_id,
                    character_id=mind.character_id,
                )
                .all()
            )
            # link_evoked already knows which perceived item stirred each
            # memory. A memory stirred by something that happens in a
            # phase waits for that phase (C21, C35) — it never speaks
            # before the moment that calls it back.
            anchor_index, anchor_sal = {}, {}
            for i, item in enumerate(episode.perceived_day or []):
                data = item.get('data') or {}
                subj = (
                    data.get('entity_name') or data.get('name')
                    or data.get('entity')
                )
                if not subj or not _beat_phase(item):
                    continue  # 'the rest calls it back' is no anchor
                sal = item.get('salience') or 0.0
                for mem_id in (item.get('evoked') or []):
                    if sal > anchor_sal.get(mem_id, -1.0):
                        anchor_sal[mem_id] = sal
                        anchor_index[mem_id] = i
            # The Episode brief (C35): candidates that touch this Episode,
            # a Focus, the lines that connect to it, and what stays silent.
            # Continuity is no longer a 'yesterday' recap: a memory reaches
            # the Lens because it connects, whatever its age (CONTEXT.md).
            brief = build_brief(
                episode.perceived_day, evoked, beliefs,
                episode.needs_active, entering_mood,
                wiring=mind.wiring, anchors=anchor_index,
                need_origins=need_origins(
                    db, payload.game_id, episode.needs_active,
                    entering_mood, mind=mind,
                ),
                session=db, game_id=payload.game_id, mind=mind,
                episode_idx=episode_index(episode), musings=musings,
            )
            candidates = brief.pop('candidates', [])
            # The director chooses what the Episode turns on (protagonists
            # only); any failure keeps the rules' pick, marked as such.
            if director_enabled(w_mind):
                brief = direct(
                    brief, candidates,
                    payload.character.name or payload.character.id,
                    (card or {}).get('system_prompt'),
                ) or brief
            # Words are fixed at open so a re-narration replays them:
            # memories carry their age, the mood its 'still weighing'.
            mem_by_id = {m.id: m for m in evoked}
            for line in brief_lines(brief):
                if line['kind'] == 'memory':
                    m = mem_by_id.get(line['id'].split(':', 1)[1])
                    if m is not None:
                        line['age'] = _age_phrase(m, memory_age_days(episode, m))
                line['render'] = line_text(
                    line, entering_mood, episode.episode_date
                )
            episode.brief = brief
            episode.lens_block = render_lens(
                payload.character.name or payload.character.id, brief,
            )
            db.commit()
            db.refresh(episode)
        else:
            mind = (
                db.query(Mind)
                .filter_by(
                    game_id=payload.game_id,
                    character_id=payload.character.id,
                )
                .one_or_none()
            )
        packet = _build_packet(db, episode, mind)
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
        mind = (
            db.query(Mind)
            .filter_by(
                game_id=episode.game_id, character_id=episode.character_id
            )
            .one_or_none()
        )
        summary = {}
        if mind:
            # The host's outcome may settle open needs — resolved BEFORE
            # the memory pass so a closed chapter's memory is released in
            # the same sweep (C16); streak counters only count episodes
            # the host actually persisted.
            summary['needs_resolved'] = resolve_from_outcome(
                db, mind, episode, payload.outcome,
            )
            update_streak_counters(db, mind, episode)
            summary.update(close_episode_memory(db, mind, episode))
            # The quiet tick (ADR 0017): the mood drifts back toward its
            # Temperament by the Personality's moodiness, and every
            # Relation cools toward indifference — the sediment lives on
            # what was fed, never on what was merely not contradicted.
            mood = dict(mind.mood or {})
            regress(
                mood, mind.temperament or {},
                (mind.personality or {}).get('moodiness', 0.3),
            )
            mood['dominant'] = mood_phrase(
                mood.get('valence') or 0.0, db,
                getattr(mind, 'game_id', None)) or 'neutral'
            mood['feeling'] = derive_feeling(
                mood, feeling_lexicon(db, getattr(mind, 'game_id', None)))
            mind.mood = mood
            decay_all(
                db, mind,
                {**DEFAULT_WIRING, **(mind.wiring or {})}.get(
                    'relation_decay', 0.98
                ),
            )
            # B4: the mind's only LLM call. Trigger-gated; a skipped or
            # failed reflection never breaks the close.
            summary['reflection'] = maybe_reflect(
                db, mind, episode,
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


_PHASE_MAP = PROMPT_PHASES


def _beat_phase(item):
    """Which prompt phase a perceived item's memory beat belongs to —
    'all-day' or missing phases anchor nowhere and the memory stays an
    unanchored lens line (the exception, not the rule)."""
    return _PHASE_MAP.get(((item.get('when') or {}).get('phase') or ''))


def _merged_beats(db, episode, mind):
    """The phase beats the narrator gets: the brief's day lines plus the
    standing self — each disposition routed to where the world touches
    it, so nothing floats unattached for the narrator to skip."""
    beats = brief_beats(episode.brief)
    if mind is None:
        return beats
    dispositions = inner_lines(
        db, mind, as_of_episode=episode.episode_idx)
    for phase, ds in disposition_beats(
        dispositions, episode.perceived_day or []
    ).items():
        beats.setdefault(phase, []).extend(ds)
    # What spoke is recorded: the same disposition rests a few episodes
    # (the daily waterskin stops narrating every day), mirroring
    # Memory.last_voiced_episode. Idempotent under re-narration.
    if episode.episode_idx is not None:
        for d in dispositions:
            if d.get('id'):
                rel = db.get(Relation, d['id'])
                if rel is not None:
                    rel.last_surfaced_episode = episode.episode_idx
    return beats


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
        stored = episode.narrator_payload or {}
        frame = stored.get('episode') or {}
        if not frame.get('at'):
            raise HTTPException(
                status_code=422,
                detail='episode has no narratable day',
            )
        try:
            req = NarrateDayRequest.model_validate(episode.narrator_payload)
            # ADR-0016: episodes carry episode/arc/narration_notes and no
            # `day`; the prompt's frame is back-filled and the per-phase
            # world material is rebuilt from episode.events themselves.
            day = {'date': frame['at']}
            if frame.get('index') is not None:
                day['day_number'] = frame['index']
            if frame.get('terminal') is not None:
                day['is_last_day'] = frame['terminal']
            if stored.get('narration_notes'):
                day['world_notes'] = stored['narration_notes']
            # Encounters reach the narrator through events now (ADR-0016):
            # rebuild the legacy per-phase shape from episode.events.
            if not day.get('encounters'):
                day['encounters'] = [
                    _encounter_prompt_shape(e)
                    for e in (episode.events or [])
                    if e.get('type') == 'encounter'
                ]
        except ValidationError as exc:
            raise HTTPException(
                status_code=422,
                detail=f'invalid narrator_payload: {exc.errors()[:3]}',
            )
        mind = (
            db.query(Mind)
            .filter_by(
                game_id=episode.game_id, character_id=episode.character_id
            )
            .one_or_none()
        )
        result = narrate_day(
            day=day,
            trip=req.trip,
            character=req.character,
            language=payload.language or req.language,
            character_state=req.characterState,
            fate=req.fate,
            # The episode's own events carry the per-phase world prose
            # (weather/meal/terrain/place/water readings).
            events=episode.events or [],
            # Forwarded, not dead: an episode without lens_block falls
            # back to the stateless prompt, where this is the only
            # continuity. With a lens, build_day_prompt drops it.
            previous_day=req.previousDay,
            # The spine's first fixed point: today's dawn opens where
            # last night was spent.
            previous_rest=_previous_rest(db, episode),
            mind_block=episode.lens_block or '',
            # C35: the brief's day lines ride inside their phase. And
            # the standing self speaks in scene, not in preamble — each
            # disposition lands where the world touches it, or waits
            # for the quietest hour (ADR 0017).
            memory_beats=_merged_beats(db, episode, mind),
        )
        generation = result['generation'] or {}
        # ADR 0003: the Mind keeps and measures the inner-language text;
        # the reader's language is a translation stored beside it.
        inner = generation.get('inner_text') or generation.get('text')
        if inner:
            episode.narrative = inner
            episode.narrative_language = INNER_LANGUAGE
            episode.narrative_translation = (
                {'language': generation['language'], 'text': generation['text']}
                if generation.get('language') != INNER_LANGUAGE
                and generation.get('text')
                else None
            )
        episode.narrated_at = datetime.now(timezone.utc)
        if episode.status == 'open':
            episode.status = 'narrated'
        db.commit()
        return NarrateEpisodeResponse(
            episode_id=episode.id,
            prompt=result['prompt'],
            generation=generation,
            perceived_day=[
                PerceivedEvent(**e) for e in (episode.perceived_day or [])
            ],
            mood=Mood(**(mind.mood or {})) if mind else Mood(),
            lens_block=episode.lens_block or '',
            check_results=_check_results(episode),
            needs_active=episode.needs_active or [],
            generation_meta={
                k: v for k, v in generation.items()
                if k not in ('text', 'inner_text')
            },
        )
    except SQLAlchemyError as exc:
        db.rollback()
        log.warning('narrate_episode failed: %s', exc)
        raise HTTPException(status_code=503, detail='mind persistence unavailable')


@router.get('/mind/state/{character_id}', response_model=MindStateResponse)
def mind_state(character_id: str, db: Session = Depends(get_session)):
    try:
        mind = db.query(Mind).filter_by(character_id=character_id).one_or_none()
        beliefs = (
            db.query(Memory)
            .filter_by(character_id=character_id, kind='conviction')
            .all()
            if mind else []
        )
        memories = (
            db.query(Memory)
            .filter_by(character_id=character_id)
            .order_by(Memory.importance.desc())
            .all()
            if mind else []
        )
        needs = (
            db.query(Need)
            .filter_by(character_id=character_id)
            .order_by(Need.urgency.desc())
            .all()
            if mind else []
        )
        musings = (
            db.query(Musing).filter_by(character_id=character_id).all()
            if mind else []
        )
        count = db.query(Episode).filter_by(character_id=character_id).count()
    except SQLAlchemyError as exc:
        log.warning('mind_state failed: %s', exc)
        raise HTTPException(status_code=503, detail='mind persistence unavailable')
    return MindStateResponse(
        character_id=character_id,
        mind=(
            {
                'id': mind.id,
                'preset_slug': mind.preset_slug,
                'wiring': mind.wiring,
                'mood': mind.mood,
                'counters': mind.counters,
            }
            if mind else None
        ),
        beliefs=[
            {
                'id': b.id,
                'kind': (b.conviction or {}).get('kind'),
                'horizon': (b.conviction or {}).get('horizon'),
                'statement': b.desc,
                'strength': (b.conviction or {}).get('strength'),
                'origin': b.origin,
                'status': (b.conviction or {}).get('status'),
                'subject': b.subjects,
                'stance': (b.imprint or {}).get('affection'),
                'source': (b.conviction or {}).get('source'),
            }
            for b in beliefs
        ],
        memories=[
            {
                'id': m.id, 'kind': m.kind, 'desc': m.desc, 'tags': m.tags,
                'importance': m.importance, 'strength': m.strength,
                'evocations': m.evocations, 'voiced': m.voiced,
                'consolidated': m.consolidated,
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
        musings=[
            {
                'id': m.id, 'statement': m.statement, 'tags': m.tags,
                'origin': m.origin,
            }
            for m in musings
        ],
        episodes=count,
    )


@router.post('/mind/minds/{character_id}/preset')
def reassign_mind_preset(
    character_id: str,
    payload: ReassignPresetRequest,
    db: Session = Depends(get_session),
):
    """Admin reassignment: point the mind at another preset. reclone=True also
    resets config (theme_weights + wiring) to the preset's — memories and
    beliefs are content and are never touched."""
    try:
        mind = reassign_preset(
            db, payload.game_id or 'middle_earth', character_id,
            payload.slug, reclone=payload.reclone,
        )
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        log.warning('reassign_preset failed: %s', exc)
        raise HTTPException(status_code=503, detail='mind persistence unavailable')
    if mind is None:
        raise HTTPException(status_code=404, detail='mind not found')
    return {
        'character_id': character_id,
        'preset_slug': mind.preset_slug,
        'recloned': payload.reclone,
    }


@router.post('/mind/minds/{character_id}/choose', response_model=ChooseResponse)
def choose_interactions(
    character_id: str,
    payload: ChooseRequest,
    db: Session = Depends(get_session),
):
    """The host hands over each resolved Situation's feasible Interactions
    (ADR-0019); the Mind returns one interaction_id per situation, drawn by
    softmax over its own preference — Needs, the Relation with the concrete
    subject, theme affinity — tempered by `personality.choice_variability`.
    Runs before the episode opens: effects are applied by the host and the
    Events arrive saying what happened. Mind missing → neutral draw; the
    choice never blocks the game."""
    try:
        mind = (
            db.query(Mind)
            .filter_by(
                game_id=payload.game_id, character_id=character_id
            )
            .one_or_none()
        )
        return ChooseResponse(
            **choose(
                db, mind, payload.game_id, character_id,
                [c.model_dump() for c in payload.choices],
            )
        )
    except SQLAlchemyError as exc:
        db.rollback()
        log.warning('choose_interactions failed: %s', exc)
        raise HTTPException(status_code=503, detail='mind persistence unavailable')


@router.post('/mind/minds/{character_id}/perceive',
             response_model=PerceiveResponse)
def perceive_interim(
    character_id: str,
    payload: PerceiveRequest,
    db: Session = Depends(get_session),
):
    """Mid-day digestion for sequential choosing (Wave C): the host hands
    over each Situation's outcome event as it resolves — the sediment
    (Relations via feed_event, body via acute_hit) lands NOW so the next
    /choose reads the evolved state, not the morning's.

    Each event carries the host's stable id; `mind.counters.felt_event_ids`
    remembers what already sedimented — a regenerated day with the same
    picks skips rather than double-feeds, and episode open annotates the
    same ids for narration without re-feeding them either. Events with no
    id sediment unconditionally (pre-Wave-C wire).

    Outcome events are the traveller's own acts: always 'noticed', no
    perception roll. Needs refresh off the reported Condition so a meal
    closes 'hunger' before the afternoon's pool is chosen.
    """
    try:
        mind = (
            db.query(Mind)
            .filter_by(
                game_id=payload.game_id, character_id=character_id
            )
            .one_or_none()
        )
        if mind is None:
            return PerceiveResponse(perceived=0, skipped=len(payload.events))

        counters = dict(mind.counters or {})
        felt = set(counters.get('felt_event_ids') or [])
        semantics = load_semantics(db, payload.game_id)

        # The reported Condition re-anchors the body projection; this
        # batch's hits land on top (same contract as open's perceive).
        if payload.character is not None:
            state = character_state(payload.character)
            mind.body = project_body(
                state, body_projection(db, payload.game_id))

        perceived_n = skipped_n = 0
        for event in (e.model_dump() for e in payload.events):
            eid = event.get('id')
            if eid and eid in felt:
                skipped_n += 1
                continue
            tags = derive_tags(event)
            data = event.get('data') or {}
            world_delta, _contact_w, body_hit = semantic_delta(
                tags, data, semantics
            )
            subjects = sorted(subject_tags(tags))
            if subjects:
                feed_event(
                    db, mind, subjects, world_delta,
                    displays={
                        s: (data.get('entity_name')
                            or data.get('name') or s)
                        for s in subjects
                    },
                )
            if body_hit:
                acute_hit(mind.body, body_hit)
            if eid:
                felt.add(eid)
            perceived_n += 1

        counters['felt_event_ids'] = sorted(felt)
        mind.counters = counters

        needs = []
        if payload.character is not None:
            needs = refresh_state_needs(
                db, payload.game_id, mind,
                character_state(payload.character),
            )
        db.commit()
        return PerceiveResponse(
            perceived=perceived_n,
            skipped=skipped_n,
            needs=need_snapshot(needs),
        )
    except SQLAlchemyError as exc:
        db.rollback()
        log.warning('perceive_interim failed: %s', exc)
        raise HTTPException(status_code=503, detail='mind persistence unavailable')


@router.post('/mind/minds/{character_id}/reset')
def reset_mind(
    character_id: str,
    payload: ResetMindRequest,
    db: Session = Depends(get_session),
):
    """Full mind wipe (C19): everything the character LIVED dies — every
    memory (volatile, consolidated, patterns), every learned belief, every
    open need, every episode, every musing. The nature survives: preset,
    theme_weights, wiring. Its preset's starter beliefs and musings are
    re-seeded — a person with no past, not a different person. Idempotent."""
    try:
        game_id = payload.game_id or 'middle_earth'
        mind = (
            db.query(Mind)
            .filter_by(game_id=game_id, character_id=character_id)
            .one_or_none()
        )
        if mind is None:
            return {
                'character_id': character_id, 'mind': None,
                'deleted': {'memories': 0, 'forgotten': 0, 'beliefs': 0,
                            'needs': 0, 'episodes': 0, 'musings': 0},
                'seeds': 0,
            }
        deleted = {
            # Beliefs are conviction-tier memories (#168): they die inside
            # the memories count; 'beliefs' reports the conviction share.
            'beliefs': db.query(Memory).filter_by(
                game_id=game_id, character_id=character_id,
                kind='conviction').count(),
            'memories': db.query(Memory).filter_by(
                game_id=game_id, character_id=character_id).delete(),
            'forgotten': db.query(ForgottenMemory).filter_by(
                game_id=game_id, character_id=character_id).delete(),
            'needs': db.query(Need).filter_by(
                game_id=game_id, character_id=character_id).delete(),
            'episodes': db.query(Episode).filter_by(
                game_id=game_id, character_id=character_id).delete(),
            'musings': db.query(Musing).filter_by(
                game_id=game_id, character_id=character_id).delete(),
        }
        mind.mood = dict(NEUTRAL_MOOD)
        mind.counters = {}
        preset = (
            db.query(MindPreset)
            .filter_by(game_id=game_id, slug=mind.preset_slug)
            .one_or_none()
        )
        seeds = seed_starter_beliefs(db, game_id, character_id, preset)
        musings = seed_musings(db, game_id, character_id, preset)
        db.commit()
        return {
            'character_id': character_id,
            'mind': {'id': mind.id, 'preset_slug': mind.preset_slug},
            'deleted': deleted,
            'seeds': len(seeds) + len(musings),
        }
    except SQLAlchemyError as exc:
        db.rollback()
        log.warning('reset_mind failed: %s', exc)
        raise HTTPException(status_code=503, detail='mind persistence unavailable')


@router.post('/maintenance/consolidate', response_model=ConsolidateResponse)
def consolidate_degraded(
    payload: ConsolidateRequest,
    db: Session = Depends(get_session),
):
    """B10: batch consolidation for degraded minds (NPCs). Their closes
    only encode — this pass runs the deferred decay + pattern detection.
    `mind_ids` pins specific minds (degraded or not — an explicit pin is
    operator intent); otherwise every mind wired 'degraded', scoped by
    `game_id` when given."""
    try:
        query = db.query(Mind)
        if payload.mind_ids:
            query = query.filter(Mind.id.in_(payload.mind_ids))
        else:
            if payload.game_id:
                query = query.filter_by(game_id=payload.game_id)
        minds = query.all()
        results = []
        for mind in minds:
            w = {**DEFAULT_WIRING, **(mind.wiring or {})}
            if not payload.mind_ids and not w.get('degraded'):
                continue
            latest = (
                db.query(Episode)
                .filter_by(character_id=mind.character_id)
                .order_by(Episode.created_at.desc())
                .first()
            )
            idx = episode_index(latest) if latest else None
            if idx is None:
                continue
            # Degraded minds clean in batch too (C16): resolved needs
            # release their memory and duplicate rows fold in here.
            released = _release_resolved_needs(db, mind)
            merged = _compact_duplicates(db, mind)
            patterns = detect_patterns(db, mind, latest, idx, w)
            results.append({
                'mind_id': mind.id,
                'character_id': mind.character_id,
                'patterns': patterns['formed'],
                'patterns_faded': patterns['faded'],
                'needs_released': released,
                'memories_merged': merged,
                **decay_pass(db, mind, idx),
            })
        db.commit()
        return ConsolidateResponse(minds=len(results), results=results)
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
        return PromotePackResponse(
            game_id=game_id, version=row.version, status=row.status,
            archived_version=prev_active or 1,
        )
    except SQLAlchemyError as exc:
        db.rollback()
        log.warning('pack_promote failed: %s', exc)
        raise HTTPException(status_code=503, detail='mind persistence unavailable')
