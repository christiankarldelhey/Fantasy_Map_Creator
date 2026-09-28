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

from app.models import GenerationResponse, PromptResponse


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
    decision_point: Optional[Dict[str, Any]] = None


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
    check_results: List[Dict[str, Any]] = []
    needs_active: List[Dict[str, Any]] = []
    lens_block: Optional[str] = None
    mood: Optional[Dict[str, Any]] = None
    outcome: Optional[Dict[str, Any]]
    decision_point: Optional[Dict[str, Any]] = None
    decisions: Dict[str, Any] = {}
    proposed_commands: List[Any] = []
    created_at: str
    narrated_at: Optional[str]
    closed_at: Optional[str]


class MindStateResponse(BaseModel):
    """GET /mind/state/{character_id} — the living brain: cloned config
    (nature) plus lived content (nurture)."""

    character_id: str
    brain: Optional[Dict[str, Any]] = None
    beliefs: List[Dict[str, Any]] = []
    memories: List[Dict[str, Any]] = []
    needs: List[Dict[str, Any]] = []
    episodes: int = 0


class ReassignMoldRequest(BaseModel):
    slug: str = Field(min_length=1)
    game_id: Optional[str] = None
    reclone: bool = False


class CloseEpisodeRequest(BaseModel):
    """What the host actually persisted — deltas applied, choice made,
    narrative ref. Free-form; Mind stores it, never interprets it."""

    outcome: Optional[Dict[str, Any]] = None


class CloseEpisodeResponse(BaseModel):
    episode_id: str
    status: str
    encoded: int = 0
    forgotten: int = 0
    consolidated: int = 0
    needs_resolved: int = 0
    patterns: int = 0
    reflection: Optional[Dict[str, Any]] = None
    already_closed: bool = False
    degraded: bool = False


class NarrateEpisodeRequest(BaseModel):
    language: Optional[str] = None


class NarrateEpisodeResponse(BaseModel):
    """NarrateDayResponse + the episode's mind context. The narrative is
    regenerated on each call — it is not persisted mind state."""

    episode_id: str
    prompt: PromptResponse
    generation: GenerationResponse
    perceived_day: List[PerceivedEvent] = []
    mood: Mood = Mood()
    lens_block: str = ''
    check_results: List[Dict[str, Any]] = []
    needs_active: List[Dict[str, Any]] = []
    proposed_commands: List[Any] = []
    decision_point: Optional[Dict[str, Any]] = None
    generation_meta: Dict[str, Any] = {}


class DecideEpisodeRequest(BaseModel):
    """The host reports which option the character takes. `decision_id`
    selects among several decision points; omitted → the first."""

    option_id: str = Field(min_length=1)
    decision_id: Optional[str] = None


class DecideEpisodeResponse(BaseModel):
    episode_id: str
    decision_id: str
    option_id: str
    resolution: str = ''
    proposed_commands: List[Any] = []
    already_decided: bool = False


class ConsolidateRequest(BaseModel):
    """POST /maintenance/consolidate — batch pass over degraded brains
    (B10): the forgetting/pattern work their closes deferred. `brain_ids`
    pins the pass; `game_id` scopes it; both empty → all degraded brains."""

    game_id: Optional[str] = None
    brain_ids: List[str] = []


class ConsolidateResponse(BaseModel):
    brains: int = 0
    results: List[Dict[str, Any]] = []


class ClonePackRequest(BaseModel):
    """POST /packs/{game_id}/clone — copy the live pack into a new draft
    namespace for safe experimentation (PRD §9.2)."""

    note: Optional[str] = None


class PromotePackRequest(BaseModel):
    """POST /packs/{game_id}/promote — publish a draft version: the live
    pack is archived (frozen snapshot) and the draft's rows take over."""

    version: int


class PackVersionOut(BaseModel):
    game_id: str
    version: int
    status: str
    namespace: Optional[str] = None
    note: Optional[str] = None
    created_at: Optional[str] = None


class PackVersionsResponse(BaseModel):
    game_id: str
    active_version: Optional[int] = None
    versions: List[PackVersionOut] = []


class PromotePackResponse(BaseModel):
    game_id: str
    version: int
    status: str
    archived_version: Optional[int] = None
