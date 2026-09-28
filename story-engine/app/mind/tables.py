# ============================================================================
# SQLAlchemy tables for the Mind Engine
# ----------------------------------------------------------------------------
# All tables land in the `mind` schema via Base.metadata (app/db.py).
# Episodes (A2), NL config (A3), brain molds/brains/beliefs (A5);
# memories arrive in A7.
# ============================================================================
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _new_id(prefix):
    def gen():
        return f'{prefix}_' + uuid.uuid4().hex
    return gen


new_episode_id = _new_id('ep')
new_brain_id = _new_id('br')
new_belief_id = _new_id('bl')
new_memory_id = _new_id('mem')


class Episode(Base):
    __tablename__ = 'episodes'
    __table_args__ = (
        # Idempotency: re-open of the same episode_ref returns the existing
        # row instead of duplicating. NULL episode_refs never conflict —
        # Postgres treats NULLs as distinct, which is what we want.
        UniqueConstraint(
            'game_id', 'character_id', 'episode_ref', name='uq_episode_ref'
        ),
    )

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=new_episode_id)
    game_id: Mapped[str] = mapped_column(String(120), nullable=False)
    character_id: Mapped[str] = mapped_column(String(120), nullable=False)
    episode_ref: Mapped[str] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default='open')

    events: Mapped[dict] = mapped_column(JSONB, nullable=False, default=list)
    narrator_payload: Mapped[dict] = mapped_column(JSONB, nullable=True)
    config_snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    perceived_day: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    # Rendered once at open (A8) and replayed verbatim on re-open — the lens
    # is a snapshot of the mind the moment this episode was perceived.
    lens_block: Mapped[str] = mapped_column(Text, nullable=True)
    mood: Mapped[dict] = mapped_column(JSONB, nullable=True)
    # Needs snapshot at open (B2) — same replay semantics as perceived_day.
    needs_active: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    # Recorded picks for the episode's decision points (B5):
    # {decision_id: option_id}. The mind records; the host executes.
    decisions: Mapped[dict] = mapped_column(JSONB, nullable=True)
    outcome: Mapped[dict] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    narrated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)


# ============================================================================
# Natural-language configuration (A3)
# ----------------------------------------------------------------------------
# One NL pack per game_id — game-scoped, not per brain (PRD §8). Values in
# natural_language/* stay as the code fallback; these rows override them.
# ============================================================================


class BrainNlOverride(Base):
    """Per-brain NL override (B7) — one row of a band table, a threshold
    value, or a phrase-list entry. Resolution order: brain override →
    game pack row → built-in default, per key. A key with ANY override
    rows replaces its global content entirely (no partial merges).

    kind='band':        key=table_name, ordinal + below + phrase
    kind='threshold':   key + value
    kind='phrase_list': key + ordinal + phrase
    """

    __tablename__ = 'brain_nl_overrides'
    __table_args__ = (
        UniqueConstraint('brain_id', 'kind', 'key', 'ordinal',
                         name='uq_brain_nl_override'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    brain_id: Mapped[str] = mapped_column(
        ForeignKey('mind.brains.id', ondelete='CASCADE'), nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    key: Mapped[str] = mapped_column(String(120), nullable=False)
    ordinal: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    below: Mapped[float] = mapped_column(Float, nullable=True)
    phrase: Mapped[str] = mapped_column(Text, nullable=True)
    value: Mapped[float] = mapped_column(Float, nullable=True)


class NlBand(Base):
    """Ordered band: first row whose threshold matches the value wins.

    `below` semantics: value < below (NULL = catch-all, i.e. +inf).
    `meta.above_m` flips to `value >= above_m` for descending bands like
    altitude; `meta.phrases` holds a variant list instead of one phrase.
    """

    __tablename__ = 'nl_bands'
    __table_args__ = (
        UniqueConstraint('game_id', 'table_name', 'ordinal', name='uq_nl_band'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_id: Mapped[str] = mapped_column(String(120), nullable=False)
    table_name: Mapped[str] = mapped_column(String(60), nullable=False)
    ordinal: Mapped[int] = mapped_column(Integer, nullable=False)
    below: Mapped[float] = mapped_column(Float, nullable=True)
    phrase: Mapped[str] = mapped_column(Text, nullable=True)
    meta: Mapped[dict] = mapped_column(JSONB, nullable=True)


class NlThreshold(Base):
    """Loose numeric thresholds, namespaced by domain: 'climate.windy_speed_min'."""

    __tablename__ = 'nl_thresholds'
    __table_args__ = (UniqueConstraint('game_id', 'key', name='uq_nl_threshold'),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_id: Mapped[str] = mapped_column(String(120), nullable=False)
    key: Mapped[str] = mapped_column(String(120), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)


class NlPhraseList(Base):
    """Phrase banks keyed by domain path; dict-style constants are stored as
    one key per entry ('climate.moon.full_moon' -> single phrase)."""

    __tablename__ = 'nl_phrase_lists'
    __table_args__ = (
        UniqueConstraint('game_id', 'key', 'ordinal', name='uq_nl_phrase'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_id: Mapped[str] = mapped_column(String(120), nullable=False)
    key: Mapped[str] = mapped_column(String(120), nullable=False)
    ordinal: Mapped[int] = mapped_column(Integer, nullable=False)
    phrase: Mapped[str] = mapped_column(Text, nullable=False)


def _now():
    return datetime.now(timezone.utc)


# ============================================================================
# Brain molds -> living brains (A5)
# ----------------------------------------------------------------------------
# Clone-and-own: a mold is an archetype (theme_weights + wiring + starter
# beliefs in child tables, editable field by field); each character's brain is
# a MATERIALISED copy (jsonb snapshot) that diverges only by content and admin
# edits — editing the mold later never reconfigures existing brains.
# ============================================================================


class BrainMold(Base):
    __tablename__ = 'brain_molds'
    __table_args__ = (UniqueConstraint('game_id', 'slug', name='uq_brain_mold'),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_id: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(60), nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    theme_weights = relationship('MoldThemeWeight', lazy='selectin',
                                 cascade='all, delete-orphan')
    wiring = relationship('MoldWiring', lazy='selectin',
                          cascade='all, delete-orphan')
    starter_beliefs = relationship('MoldStarterBelief', lazy='selectin',
                                   cascade='all, delete-orphan')


class MoldThemeWeight(Base):
    """key = 'type:<event_type>' | 'tag:<tag>' | 'entity:<id>' | 'tag:prefix:*'."""

    __tablename__ = 'mold_theme_weights'
    __table_args__ = (UniqueConstraint('mold_id', 'key', name='uq_mold_weight'),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mold_id: Mapped[int] = mapped_column(
        ForeignKey('mind.brain_molds.id', ondelete='CASCADE'), nullable=False)
    key: Mapped[str] = mapped_column(String(120), nullable=False)
    weight: Mapped[float] = mapped_column(Float, nullable=False)


class MoldWiring(Base):
    """Engine parameters: decay, forget_threshold, fixed_threshold, w_*,
    alpha/beta/gamma, lambda_recency, retrieval_top_k, evocations_to_fix."""

    __tablename__ = 'mold_wiring'
    __table_args__ = (UniqueConstraint('mold_id', 'key', name='uq_mold_wiring'),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mold_id: Mapped[int] = mapped_column(
        ForeignKey('mind.brain_molds.id', ondelete='CASCADE'), nullable=False)
    key: Mapped[str] = mapped_column(String(60), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)


class MoldStarterBelief(Base):
    __tablename__ = 'mold_starter_beliefs'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mold_id: Mapped[int] = mapped_column(
        ForeignKey('mind.brain_molds.id', ondelete='CASCADE'), nullable=False)
    kind: Mapped[str] = mapped_column(String(30), nullable=False)  # world|self|other
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)
    tags: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    # {tag: magnitude} cloned into beliefs.boosts — B6.
    boosts: Mapped[dict] = mapped_column(JSONB, nullable=True)


class Brain(Base):
    __tablename__ = 'brains'
    __table_args__ = (
        UniqueConstraint('game_id', 'character_id', name='uq_brain_character'),
    )

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=new_brain_id)
    game_id: Mapped[str] = mapped_column(String(120), nullable=False)
    character_id: Mapped[str] = mapped_column(String(120), nullable=False)
    mold_id: Mapped[int] = mapped_column(Integer, nullable=True)
    mold_slug: Mapped[str] = mapped_column(String(60), nullable=False)

    # Materialised copy of the mold's config at clone time — the "nature".
    theme_weights: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    wiring: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # Lived content — the "nurture".
    mood: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    counters: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Belief(Base):
    """Beliefs-lite: full table from day one, seeded at clone (origin='seed' —
    exempt from the evidence rule, backstory is the off-screen evidence).
    The reflection pipeline that mutates these is B4."""

    __tablename__ = 'beliefs'

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=new_belief_id)
    game_id: Mapped[str] = mapped_column(String(120), nullable=False)
    character_id: Mapped[str] = mapped_column(String(120), nullable=False)
    kind: Mapped[str] = mapped_column(String(30), nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)
    tags: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    evidence: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    origin: Mapped[str] = mapped_column(String(30), nullable=False, default='experience')
    status: Mapped[str] = mapped_column(String(20), nullable=False, default='active')
    boosts: Mapped[dict] = mapped_column(JSONB, nullable=True)  # reserved, B6
    formed_episode: Mapped[int] = mapped_column(Integer, nullable=True)
    updated_episode: Mapped[int] = mapped_column(Integer, nullable=True)


class Memory(Base):
    """A lived impression. Volatile memories decay each close and die below
    forget_threshold; consolidated ones never decay (the three paths to
    permanence: born fixed, promoted by evocations, or — later — patterns)."""

    __tablename__ = 'memories'
    __table_args__ = (
        Index('ix_memories_character', 'character_id'),
        Index('ix_memories_tags', 'tags', postgresql_using='gin'),
    )

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=new_memory_id)
    game_id: Mapped[str] = mapped_column(String(120), nullable=False)
    character_id: Mapped[str] = mapped_column(String(120), nullable=False)
    episode_ids: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    kind: Mapped[str] = mapped_column(String(20), nullable=False, default='episodic')
    tags: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    entity_id: Mapped[str] = mapped_column(String(120), nullable=True)
    region: Mapped[str] = mapped_column(String(120), nullable=True)
    desc: Mapped[str] = mapped_column(Text, nullable=False)
    valence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    importance: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    strength: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    evocations: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_evoked_episode: Mapped[int] = mapped_column(Integer, nullable=True)
    consolidated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    embedding: Mapped[dict] = mapped_column(JSONB, nullable=True)  # reserved, B8
    origin: Mapped[str] = mapped_column(String(30), nullable=False, default='experience')
    created_episode: Mapped[int] = mapped_column(Integer, nullable=True)


class Need(Base):
    """An open intention of the mind (B2). Detector needs ('physiological')
    are upserted each open and auto-resolve when the state stops holding;
    'thread' needs come from narrative events (data.thread) and close only
    when the host resolves them (outcome.resolved_needs or data.resolves).
    One row per (game, character, key) — a re-fired detector reopens the
    same row rather than duplicating it."""

    __tablename__ = 'needs'
    __table_args__ = (
        UniqueConstraint('game_id', 'character_id', 'key', name='uq_need_key'),
        Index('ix_needs_character', 'character_id', 'status'),
    )

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=_new_id('nd'))
    game_id: Mapped[str] = mapped_column(String(120), nullable=False)
    character_id: Mapped[str] = mapped_column(String(120), nullable=False)
    key: Mapped[str] = mapped_column(String(120), nullable=False)
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    urgency: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default='open')
    source: Mapped[dict] = mapped_column(JSONB, nullable=True)
    linked_entity: Mapped[str] = mapped_column(String(120), nullable=True)
    linked_region: Mapped[str] = mapped_column(String(120), nullable=True)
    opened_episode: Mapped[int] = mapped_column(Integer, nullable=True)
    due_episode: Mapped[int] = mapped_column(Integer, nullable=True)
    updated_episode: Mapped[int] = mapped_column(Integer, nullable=True)
    resolution: Mapped[dict] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class CompositeRule(Base):
    """B9: declarative multi-day rule — when ANY condition group matches
    (of `event_type`, if set) for `streak_days` consecutive episodes, the
    `key` Need opens. conditions JSONB: [[{field,op,value},...],...] —
    OR of AND-groups. streak_days NULL falls back to wiring
    'need_weather_streak'."""

    __tablename__ = 'composite_rules'
    __table_args__ = (
        UniqueConstraint('game_id', 'key', name='uq_composite_rule'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_id: Mapped[str] = mapped_column(String(120), nullable=False)
    key: Mapped[str] = mapped_column(String(120), nullable=False)
    need_type: Mapped[str] = mapped_column(String(30), nullable=False,
                                          default='physiological')
    event_type: Mapped[str] = mapped_column(String(60), nullable=True)
    streak_days: Mapped[int] = mapped_column(Integer, nullable=True)
    urgency_base: Mapped[float] = mapped_column(Float, nullable=True)
    urgency_per_day: Mapped[float] = mapped_column(Float, nullable=True)
    conditions: Mapped[list] = mapped_column(JSONB, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)


class Facet(Base):
    """Registry of bandable fields per event type — feeds admin autocomplete
    and the NL tester."""

    __tablename__ = 'facets'
    __table_args__ = (
        UniqueConstraint('game_id', 'event_type', 'field_path', name='uq_facet'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_id: Mapped[str] = mapped_column(String(120), nullable=False)
    event_type: Mapped[str] = mapped_column(String(60), nullable=False)
    field_path: Mapped[str] = mapped_column(String(120), nullable=False)
    unit: Mapped[str] = mapped_column(String(30), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)


class PackVersion(Base):
    """B10 (PRD §9.2): a versioned world pack. The live pack is the rows
    under `game_id`; a draft is a copy under `namespace` (a sibling
    game_id like 'middle_earth@draft-2'). Promoting swaps the draft's
    rows into the live namespace and archives the previous live content
    as a frozen `snapshot` — the rollback record."""

    __tablename__ = 'pack_versions'
    __table_args__ = (
        UniqueConstraint('game_id', 'version', name='uq_pack_version'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_id: Mapped[str] = mapped_column(String(120), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False,
                                        default='draft')
    namespace: Mapped[str] = mapped_column(String(120), nullable=True)
    snapshot: Mapped[dict] = mapped_column(JSONB, nullable=True)
    note: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, nullable=False
    )
