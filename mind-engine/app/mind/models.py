# ============================================================================
# Pydantic models for the Mind Engine contract
# ----------------------------------------------------------------------------
# events[] is the STRICT input contract: the host translates its own domain
# data into these shapes before calling (PRD §5). `type` is a free string —
# what a kind means (role, source, reading strategy, expected fields) is
# declared in the Kind Registry ('mind.kinds', #167), not a code enum —
# and `data` is free-form.
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

    # Stable id minted by the host: lets the day be perceived piecemeal
    # (Wave C interim /perceive) without double-sedimenting at open.
    id: Optional[str] = None
    type: str = Field(min_length=1)
    when: EventWhen
    where: Optional[EventWhere] = None
    data: Dict[str, Any] = {}


class OpenCharacter(BaseModel):
    """One merged character: the mind reads id/name/skills/preset; the
    narrator reads name/description/entity_name/system_prompt/
    introduction_instructions.

    Vitals never travel inside the character card — `condition` on the
    open body is the one Condition channel (ADR 0005/0016)."""

    model_config = ConfigDict(extra='forbid')

    id: str = Field(min_length=1)
    name: Optional[str] = None
    preset: Optional[str] = None
    skills: Dict[str, Any] = {}
    description: Optional[str] = None
    entity_name: Optional[str] = None
    portrait_url: Optional[str] = None
    system_prompt: Optional[str] = None
    introduction_instructions: Optional[str] = None


class EpisodeFrame(BaseModel):
    """Where the Episode sits in the host's timeline (ADR-0016): its
    position and the in-world time label. Replaces day_number/date.
    Terminality lives only in `fate` (`fate != 'living'` is the signal)."""

    model_config = ConfigDict(extra='forbid')

    index: Optional[int] = None
    at: Optional[str] = None


class OpenEpisodeRequest(BaseModel):
    """Flat wire contract: everything the episode needs, nothing it doesn't.
    `events[].data` is the single free-form field — the host's event domain
    is its own; the mind reads what the Kind Registry declares.

    Canonical shape (ADR-0016): `episode`/`arc`/`condition`/`events`/
    `fate`. The world reaches the Past only through `events` — even the
    day's framing (climate streaks, the ground crossed) arrives as
    events, never as narrator briefing."""

    model_config = ConfigDict(extra='forbid')

    game_id: str = Field(min_length=1)
    episode_ref: Optional[str] = None
    language: str = 'english'
    character: OpenCharacter
    events: List[EventIn] = []
    # The Episode's frame in the host's timeline: position and
    # in-world time. Whether the Arc closes here rides `fate`.
    episode: Optional[EpisodeFrame] = None
    # The larger narrative this Episode belongs to ('a journey', 'a
    # season' — whatever the host calls it).
    arc: Optional[str] = None
    # The live Condition: one flat map — character_state and
    # equipment_state merged. The only channel where numbers are legal;
    # detectors read it, the narrator never phrases from it.
    condition: Dict[str, Any] = {}
    fate: Optional[str] = None


class PerceivedEvent(BaseModel):
    """One event as the mind received it. reading/salience land in A6;
    until then every event is plainly `noticed`."""

    model_config = ConfigDict(extra='allow')

    type: str
    perception: str = 'noticed'
    reading: Optional[str] = None
    salience: Optional[float] = None


class Mood(BaseModel):
    valence: float = 0.0
    arousal: float = 0.0
    dominant: str = 'neutral'
    # The day's emotional plot (ADR 0017): the accumulated felt delta,
    # the per-event trace, and the phase arc + turn — a pleasant
    # morning and a sad afternoon are two different colours of one day.
    felt: Dict[str, Any] = {}
    trace: List[Dict[str, Any]] = []
    arc: List[Dict[str, Any]] = []
    turn: Optional[Dict[str, Any]] = None
    # Counter-current pulls that moved the mood without turning it —
    # the grief felt inside a good day, rendered as shade beats.
    shades: List[Dict[str, Any]] = []
    thread_pressure: float = 0.0


class OpenEpisodeResponse(BaseModel):
    # The host needs only the handle: the narrate call re-derives the
    # mind's take from the episode row, and inspection reads
    # GET /episodes/{id}.
    episode_id: str


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
    # The Lens's take (C35): the brief behind the lens_block and the
    # candidate-vs-voiced record — what the dead PsychePacket surfaced.
    brief: Optional[Dict[str, Any]] = None
    lens_eval: Optional[Dict[str, Any]] = None
    mood: Optional[Dict[str, Any]] = None
    outcome: Optional[Dict[str, Any]]
    decisions: Dict[str, Any] = {}
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
    generation_meta: Dict[str, Any] = {}


class ChooseOption(BaseModel):
    """One feasible Interaction the host offers (ADR-0019). `act` is the
    Mind-owned vocabulary; `need_tags` the tags the Mind weighs; `p_success`
    the host's honest read of the roll, weighed like anything else."""

    interaction_id: str = Field(min_length=1)
    act: Optional[str] = None
    need_tags: List[str] = []
    p_success: Optional[float] = None


class ChooseSituation(BaseModel):
    """A resolved Situation needing a pick. `subject` is the concrete source
    met (npc:hallas, place:prancing-pony) — generic Situations still ride the
    concrete subject so the Relation that applies is the lived one."""

    situation_id: str = Field(min_length=1)
    subject: Optional[str] = None
    options: List[ChooseOption] = []


class ChooseRequest(BaseModel):
    """POST /mind/minds/{character_id}/choose — the host hands over the
    day's feasible pools; the Mind returns one interaction_id each."""

    game_id: str = Field(min_length=1)
    choices: List[ChooseSituation] = []


class ChooseResponse(BaseModel):
    temperature: float
    choices: List[Dict[str, Any]] = []


class PerceiveRequest(BaseModel):
    """POST /mind/minds/{character_id}/perceive — mid-day digestion (Wave
    C): the host reports outcome events as each Situation resolves so the
    NEXT choose sees the evolved state. Sediment lands now; the episode
    open later annotates the same ids without re-feeding them.
    `character` is the host's projected Condition — needs refresh off it.
    """

    game_id: str = Field(min_length=1)
    events: List[EventIn] = []
    character: Optional[Dict[str, Any]] = None


class PerceiveResponse(BaseModel):
    perceived: int = 0
    skipped: int = 0
    needs: List[Dict[str, Any]] = []


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
