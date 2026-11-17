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
    """Where in the Episode's day this sits. The Episode itself owns
    index/date — events only carry the moment within it."""
    hour: Optional[float] = None
    phase: Optional[str] = None


class EventWhere(BaseModel):
    region: Optional[str] = None
    family: Optional[str] = None
    point: Optional[List[float]] = None
    # The named spot the event happened AT — the orcs at the ford mark
    # the ford too (a splash share as a secondary subject).
    place: Optional[str] = None


class EventIn(BaseModel):
    model_config = ConfigDict(extra='forbid')

    type: str = Field(min_length=1)
    when: EventWhen
    where: Optional[EventWhere] = None
    data: Dict[str, Any] = {}


class OpenCharacter(BaseModel):
    """One merged character: the mind reads id/name/skills/conditions/
    preset; the narrator reads name/description/entity_name/
    system_prompt/introduction_instructions/wounded.

    `state` is the free-form Condition channel (ADR 0005): a host declares
    its body's vitals — oxygen, sanity, suit_food_pct — as flat fields the
    declared detectors read. The explicit energy/shadow/wounded fields
    remain for the built-in pack's hosts; they land in the same map."""

    model_config = ConfigDict(extra='forbid')

    id: str = Field(min_length=1)
    name: Optional[str] = None
    preset: Optional[str] = None
    skills: Dict[str, Any] = {}
    conditions: List[Any] = []
    energy: Optional[float] = None
    shadow: Optional[float] = None
    description: Optional[str] = None
    entity_name: Optional[str] = None
    portrait_url: Optional[str] = None
    system_prompt: Optional[str] = None
    introduction_instructions: Optional[str] = None
    wounded: Optional[str] = None
    state: Dict[str, Any] = {}


class EpisodeFrame(BaseModel):
    """Where the Episode sits in the host's timeline (ADR-0016): its
    position, the in-world time label, and whether the stretch closes
    the Arc. Replaces day_number/date/is_last_day."""

    model_config = ConfigDict(extra='forbid')

    index: Optional[int] = None
    at: Optional[str] = None
    terminal: Optional[bool] = None


class OpenEpisodeRequest(BaseModel):
    """Flat wire contract: everything the episode needs, nothing it doesn't.
    `events[].data` is the single free-form field — the host's event domain
    is its own; the mind only reads what facets declare.

    Canonical shape (ADR-0016): `episode`/`arc`/`condition`/
    `narration_notes`. The world reaches the Past only through `events`;
    `narration_notes` is the narrator's briefing — world material that is
    no lived event (climate continuity, the camp lead-in, journey
    context)."""

    model_config = ConfigDict(extra='forbid')

    game_id: str = Field(min_length=1)
    episode_ref: Optional[str] = None
    language: str = 'english'
    character: OpenCharacter
    events: List[EventIn] = []
    # The Episode's frame in the host's timeline: position, in-world
    # time, whether the Arc closes here.
    episode: Optional[EpisodeFrame] = None
    # The larger narrative this Episode belongs to ('a journey', 'a
    # season' — whatever the host calls it).
    arc: Optional[str] = None
    # The live Condition: one flat map — character_state and
    # equipment_state merged. The only channel where numbers are legal;
    # detectors read it, the narrator never phrases from it.
    condition: Dict[str, Any] = {}
    # The narrator's briefing (#52): the host's pre-verbalized world
    # material that is not itself a lived event — climate continuity,
    # the camp lead-in, lands crossed, equipage, end state, journey
    # context. The per-phase world prose rides events[].data.reading.
    narration_notes: Dict[str, Any] = {}
    fate: Optional[str] = None


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
    # The Episode brief behind the Lens (C35): Focus, connected lines,
    # silenced candidates with reasons.
    brief: Optional[Dict[str, Any]] = None


class OpenEpisodeResponse(BaseModel):
    episode_id: str
    psyche_packet: PsychePacket


class EpisodeStateResponse(BaseModel):
    episode_id: str
    game_id: str
    character_id: str
    episode_ref: Optional[str]
    episode_idx: Optional[int] = None
    episode_date: Optional[str] = None
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
    lens_eval: Optional[Dict[str, Any]] = None
    created_at: str
    narrated_at: Optional[str]
    closed_at: Optional[str]


class MindStateResponse(BaseModel):
    """GET /mind/state/{character_id} — the living mind: cloned config
    (nature) plus lived content (nurture)."""

    character_id: str
    mind: Optional[Dict[str, Any]] = None
    beliefs: List[Dict[str, Any]] = []
    memories: List[Dict[str, Any]] = []
    needs: List[Dict[str, Any]] = []
    musings: List[Dict[str, Any]] = []
    episodes: int = 0


class ReassignPresetRequest(BaseModel):
    slug: str = Field(min_length=1)
    game_id: Optional[str] = None
    reclone: bool = False


class ResetMindRequest(BaseModel):
    """POST /mind/minds/{character_id}/reset — full mind wipe (C19).
    game_id scopes it; absent means the default game."""
    game_id: Optional[str] = None


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
    patterns_faded: int = 0
    beliefs_faded: int = 0
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
    lens_eval: Optional[Dict[str, Any]] = None
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
    """POST /maintenance/consolidate — batch pass over degraded minds
    (B10): the forgetting/pattern work their closes deferred. `mind_ids`
    pins the pass; `game_id` scopes it; both empty → all degraded minds."""

    game_id: Optional[str] = None
    mind_ids: List[str] = []


class ConsolidateResponse(BaseModel):
    minds: int = 0
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
