# ============================================================================
# SQLAlchemy tables for the Mind Engine
# ----------------------------------------------------------------------------
# All tables land in the `mind` schema via Base.metadata (app/db.py). Only
# mind.episodes exists for A2; brains/memories/beliefs arrive in A5+.
# ============================================================================
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String, Text, UniqueConstraint
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
