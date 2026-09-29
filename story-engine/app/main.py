# ============================================================================
# Story Engine — FastAPI entry point
# ----------------------------------------------------------------------------
# Literal 1:1 port of the Node narration pipeline. See README.md and
# /Users/christiankarldelhey/.windsurf/plans/story-engine-python-phase1-908d15.md
# for scope.
# ============================================================================
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI  # noqa: E402

from app.ai import is_ai_configured  # noqa: E402
from app.models import NarrateDayRequest, NarrateDayResponse  # noqa: E402
from app.narrate_day import narrate_day  # noqa: E402
from app.prompt.system_prompt import SYSTEM_PROMPT  # noqa: E402

# The Mind persistence layer is optional by design: if sqlalchemy is missing
# or the DB env is broken, the app must still boot and narrate. The narrator
# never dies because the mind can't persist.
try:
    from app.db import SessionLocal, db_health, engine  # noqa: E402
    from app.mind.nl_resolver import NlPack  # noqa: E402
    from app.mind.routes import router as mind_router  # noqa: E402

    try:
        from app.admin import mount_admin  # noqa: E402
    except Exception:  # noqa: BLE001 — sqladmin optional too
        mount_admin = None
except Exception:  # noqa: BLE001
    SessionLocal = None
    NlPack = None
    mind_router = None
    mount_admin = None

    def db_health():
        return 'down'


app = FastAPI(title='Story Engine', version='0.1.0')

if mind_router is not None:
    app.include_router(mind_router)

if mount_admin is not None and engine is not None:
    mount_admin(app, engine)


@app.get('/health')
def health():
    # db reports down instead of failing: Mind endpoints degrade, the
    # stateless narrator keeps working.
    return {'status': 'ok', 'ai_configured': is_ai_configured(), 'db': db_health()}


@app.get('/system-prompt')
def system_prompt():
    # Single source of truth (C13): the host's /meta/system-prompt
    # proxies this — no second copy may drift.
    return {'system_prompt': SYSTEM_PROMPT}


@app.post('/narrate-day', response_model=NarrateDayResponse)
def narrate_day_endpoint(payload: NarrateDayRequest):
    # Mind-down degradation: if a session can't even open, narrate without
    # the NL pack — the stateless path never depends on persistence.
    try:
        session = SessionLocal() if (SessionLocal and payload.game_id) else None
    except Exception:  # noqa: BLE001
        session = None
    try:
        result = narrate_day(
            day=payload.day,
            trip=payload.trip,
            character=payload.character,
            language=payload.language,
            character_state=payload.characterState,
            equipment_state=payload.equipmentState,
            fate=payload.fate,
            previous_day=payload.previousDay,
            banned_phrases=payload.bannedPhrases,
            recent_day_climates=payload.recentDayClimates,
            previous_openings=payload.previousOpenings,
            nl=NlPack(session, payload.game_id) if session else None,
        )
        return result
    finally:
        if session is not None:
            session.close()
