# ============================================================================
# SQLAlchemy tables for the Mind Engine
# ----------------------------------------------------------------------------
# All tables land in the `mind` schema via Base.metadata (app/db.py). Only
# mind.episodes exists for A2; brains/memories/beliefs arrive in A5+.
# ============================================================================
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def new_episode_id():
    return 'ep_' + uuid.uuid4().hex


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
