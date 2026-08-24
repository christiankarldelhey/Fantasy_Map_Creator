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

app = FastAPI(title='Story Engine', version='0.1.0')


@app.get('/health')
def health():
    return {'status': 'ok', 'ai_configured': is_ai_configured()}


@app.post('/narrate-day', response_model=NarrateDayResponse)
def narrate_day_endpoint(payload: NarrateDayRequest):
    result = narrate_day(
        day=payload.day,
        trip=payload.trip,
        character=payload.character,
        language=payload.language,
        condition_block=payload.conditionBlock,
        equipment_block=payload.equipmentBlock,
        end_state_block=payload.endStateBlock,
        previous_day_summary=payload.previousDaySummary,
        banned_phrases=payload.bannedPhrases,
        recent_day_climates=payload.recentDayClimates,
        previous_openings=payload.previousOpenings,
    )
    return result
