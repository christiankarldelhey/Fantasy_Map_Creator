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


class OpenCharacter(BaseModel):
    """One merged character: the mind reads id/name/skills/conditions/
    brain_profile; the narrator reads name/description/entity_name/
    system_prompt/introduction_instructions/wounded."""

    model_config = ConfigDict(extra='forbid')

    id: str = Field(min_length=1)
    name: Optional[str] = None
    brain_profile: Optional[str] = None
    skills: Dict[str, Any] = {}
    conditions: List[Any] = []
    energy: Optional[float] = None
    shadow: Optional[float] = None
    description: Optional[str] = None
    entity_name: Optional[str] = None
    system_prompt: Optional[str] = None
    introduction_instructions: Optional[str] = None
    wounded: Optional[str] = None


class WeatherRecord(BaseModel):
    """Inner climate numbers the narrator turns into weather prose."""

    model_config = ConfigDict(extra='forbid')

    cloud_cover: Optional[float] = None
    precipitation: Optional[float] = None
    temperature_2m: Optional[float] = None
    wind_speed_10m: Optional[float] = None


class ClimateSample(BaseModel):
    """One weather sample — flat: time/phase + the weather record."""

    model_config = ConfigDict(extra='forbid')

    time: Optional[str] = None
    phase: Optional[str] = None
    climate: Optional[WeatherRecord] = None


class EncounterEntity(BaseModel):
    model_config = ConfigDict(extra='forbid')

    name: Optional[str] = None
    type: Optional[str] = None
    active: Optional[str] = None
    description: Optional[str] = None
    description_summary: Optional[str] = None


class EncounterInteraction(BaseModel):
    model_config = ConfigDict(extra='forbid')

    form: Optional[str] = None
    outcome: Optional[str] = None
    prose_hint: Optional[str] = None
    dialogue_content: Optional[Dict[str, Any]] = None
    hintKey: Optional[str] = None
    night_timing: Optional[str] = None


class DayEncounter(BaseModel):
    model_config = ConfigDict(extra='forbid')

    hour: Optional[Any] = None
    phase: Optional[str] = None
    region: Optional[str] = None
    entity: Optional[EncounterEntity] = None
    interaction: Optional[EncounterInteraction] = None


class MealEntry(BaseModel):
    model_config = ConfigDict(extra='forbid')

    slot: Optional[str] = None
    food: Optional[str] = None
    drink: Optional[str] = None


class BiomeEntry(BaseModel):
    model_config = ConfigDict(extra='forbid')

    type: Optional[str] = None
    hour_float: Optional[float] = None
    fraction: Optional[float] = None
    total_area_km2: Optional[float] = None


class LocationItem(BaseModel):
    """Loose — locations/water crossings carry small host-specific keys."""

    model_config = ConfigDict(extra='allow')

    name: Optional[str] = None
    type: Optional[str] = None
    region: Optional[str] = None
    hour: Optional[Any] = None
    hour_float: Optional[float] = None
    distance_km: Optional[float] = None


class RegionRef(BaseModel):
    model_config = ConfigDict(extra='forbid')

    id: Optional[Any] = None
    name: Optional[str] = None
    cultural_family: Optional[str] = None
    description: Optional[str] = None
    description_summary: Optional[str] = None


class MoonPhase(BaseModel):
    model_config = ConfigDict(extra='allow')

    phase: Optional[str] = None


class ElevationProfile(BaseModel):
    model_config = ConfigDict(extra='allow')

    dawn_m: Optional[float] = None
    dusk_m: Optional[float] = None
    midday_m: Optional[float] = None
    significant: Optional[bool] = None
    total_gain_m: Optional[float] = None
    total_loss_m: Optional[float] = None


class DayPayload(BaseModel):
    """The resolved day, whitelisted to exactly what the prompt pipeline
    reads. Anything else Node produced is dead weight and gets 422'd."""

    model_config = ConfigDict(extra='forbid')

    date: Optional[str] = None
    day_number: Optional[int] = None
    is_last_day: Optional[bool] = None
    distance_km: Optional[float] = None
    walking_hours: Optional[float] = None
    road_types: Dict[str, Any] = {}
    regions: List[RegionRef] = []
    terrain_phrases: Dict[str, Any] = {}
    biomes: List[BiomeEntry] = []
    locations: List[LocationItem] = []
    water_crossings: List[LocationItem] = []
    climate: List[ClimateSample] = []
    nighttime_climate: List[ClimateSample] = []
    moon_phase: Optional[MoonPhase] = None
    encounters: List[DayEncounter] = []
    meals: List[MealEntry] = []
    overnight_location: Optional[Dict[str, Any]] = None
    overnight_interaction: Optional[Dict[str, Any]] = None
    elevation_profile: Optional[ElevationProfile] = None


class OpenEpisodeRequest(BaseModel):
    """Flat wire contract: everything the episode needs, nothing it doesn't.
    `events[].data` is the single free-form field — the host's event domain
    is its own; the mind only reads what facets declare."""

    model_config = ConfigDict(extra='forbid')

    game_id: str = Field(min_length=1)
    episode_ref: Optional[str] = None
    language: str = 'english'
    character: OpenCharacter
    events: List[EventIn] = []
    day: DayPayload
    trip_name: Optional[str] = None
    # Raw state, not rendered blocks: the host reports numbers and facts,
    # this service owns every translation into words (C10).
    character_state: Optional[Dict[str, Any]] = None
    equipment_state: Optional[Dict[str, Any]] = None
    fate: Optional[str] = None
    # Stateless-fallback continuity (C22): mind-driven prompts ignore
    # this — the lens recaps what the brain retained instead. It still
    # rides the wire so a mindless narrate keeps its 'In Chapter N' line.
    previous_day: Optional[Dict[str, Any]] = None
    recent_day_climates: List[Dict[str, Any]] = []


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


class ResetBrainRequest(BaseModel):
    """POST /mind/brains/{character_id}/reset — full mind wipe (C19).
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
