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
