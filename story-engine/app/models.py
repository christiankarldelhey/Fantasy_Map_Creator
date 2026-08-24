# ============================================================================
# Request/response models for POST /narrate-day
# ----------------------------------------------------------------------------
# Mirrors narrateDay()'s current parameters (backend/domains/story/services/
# narrator/narrateDay.js) plus the four tripHistory.js continuity fields,
# which Node now resolves and sends explicitly instead of Python querying a
# database for them. `day`, `trip` and `character` are passed through as
# opaque JSON — their shape is whatever Node's day-generation/day-rehydration
# code already produces, unchanged.
# ============================================================================
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


class NarrateDayRequest(BaseModel):
    model_config = ConfigDict(extra='allow')

    day: Dict[str, Any]
    trip: Dict[str, Any] = {}
    character: Dict[str, Any] = {}
    language: str = 'english'
    conditionBlock: str = ''
    equipmentBlock: str = ''
    endStateBlock: str = ''
    # Continuity fields resolved by tripHistory.js in Node before this call.
    previousDaySummary: Optional[str] = None
    bannedPhrases: List[str] = []
    recentDayClimates: List[Dict[str, Any]] = []
    previousOpenings: List[str] = []


class PromptResponse(BaseModel):
    system: str
    user: str


class GenerationResponse(BaseModel):
    text: Optional[str]
    ia_provider: Optional[str]
    temperature: float
    frequency_penalty: float
    presence_penalty: float
    top_p: float


class NarrateDayResponse(BaseModel):
    prompt: PromptResponse
    generation: GenerationResponse
