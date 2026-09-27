# ============================================================================
# Pydantic models for the Mind Engine contract
# ----------------------------------------------------------------------------
# events[] is the STRICT input contract: the host translates its own domain
# data into these shapes before calling (PRD §5). `type` is a free string —
# the known types of a game are declared via mind.facets (A3), not a code
# enum — and `data` is free-form; facets declare which fields are bandable.
# ============================================================================
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class EventWhen(BaseModel):
    episode: int
    date: str
    hour: Optional[float] = None
    phase: Optional[str] = None


class EventWhere(BaseModel):
    region: Optional[str] = None
    family: Optional[str] = None
    point: Optional[List[float]] = None


class EventIn(BaseModel):
    model_config = ConfigDict(extra='forbid')

    type: str = Field(min_length=1)
    when: EventWhen
    where: Optional[EventWhere] = None
    data: Dict[str, Any] = {}


class CharacterSnapshot(BaseModel):
    """Opaque host character state at episode open. Only `id` is required —
    the rest rides through for the Narrator and future perception."""

    model_config = ConfigDict(extra='allow')

    id: str = Field(min_length=1)
    name: Optional[str] = None
    description: Optional[str] = None
    skills: Dict[str, Any] = {}
    conditions: List[Any] = []
    resources: Dict[str, Any] = {}
    traits: Dict[str, Any] = {}


class OpenEpisodeRequest(BaseModel):
    game_id: str = Field(min_length=1)
    character: CharacterSnapshot
    episode_ref: Optional[str] = None
    events: List[EventIn] = []
    narrator_payload: Optional[Dict[str, Any]] = None


class PerceivedEvent(BaseModel):
    """One event as the mind received it. reading/salience land in A6;
    until then every event is plainly `noticed`."""

    model_config = ConfigDict(extra='allow')

    type: str
    perception: str = 'noticed'
    reading: Optional[str] = None
    salience: Optional[float] = None
    evoked: List[str] = []


class Mood(BaseModel):
    valence: float = 0.0
    arousal: float = 0.0
    dominant: str = 'neutral'


class PsychePacket(BaseModel):
    """What the Narrator consumes. Contract is stable from day one —
    proposed_commands ships empty until `decide` exists."""

    episode_id: str
    perceived_day: List[PerceivedEvent] = []
    lens_block: str = ''
    mood: Mood = Mood()
    needs_active: List[Any] = []
    check_results: List[Any] = []
    proposed_commands: List[Any] = []


class OpenEpisodeResponse(BaseModel):
    episode_id: str
    psyche_packet: PsychePacket


class EpisodeStateResponse(BaseModel):
    episode_id: str
    game_id: str
    character_id: str
    episode_ref: Optional[str]
    status: str
    events: List[Dict[str, Any]]
    perceived_day: List[Dict[str, Any]]
    outcome: Optional[Dict[str, Any]]
    created_at: str
    narrated_at: Optional[str]
    closed_at: Optional[str]


class MindStateResponse(BaseModel):
    """Shell for GET /mind/state/{character_id} — the real profile lands in
    A5 (brain molds + clones). Until then it reports what exists."""

    character_id: str
    brain: Optional[Dict[str, Any]] = None
    episodes: int = 0
