# ============================================================================
# Database plumbing for the Mind Engine persistence layer
# ----------------------------------------------------------------------------
# The narrator pipeline (/narrate-day) stays fully stateless and does not
# import this module. Mind tables live in their own Postgres schema (`mind`),
# so extracting this layer into its own database later is a connection-string
# change, not a redesign.
# ============================================================================
import os

from sqlalchemy import MetaData, create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

def _psycopg_url(raw):
    """Force the psycopg3 driver on whatever URL shape the host provides.

    Hosts commonly hand out `postgres://` or `postgresql://` URLs, which
    SQLAlchemy maps to psycopg2 — not installed here. Rewriting the scheme
    keeps a plain URL working instead of failing at first connect.
    """
    if raw.startswith('postgres://'):
        return 'postgresql+psycopg://' + raw[len('postgres://'):]
    if raw.startswith('postgresql://'):
        return 'postgresql+psycopg://' + raw[len('postgresql://'):]
    return raw


DATABASE_URL = _psycopg_url(
    os.environ.get('DATABASE_URL', 'postgresql+psycopg://localhost:5432/middle_earth')
)

# Overridable so the test suite can run in a throwaway schema instead of
# polluting the real `mind` schema with minted molds/brains.
MIND_SCHEMA = os.environ.get('MIND_SCHEMA', 'mind')

# connect_timeout matches the Node pool (backend/db.js uses 2000ms): a dead
# database must degrade the service quickly, never hang it.
engine = create_engine(
    DATABASE_URL, pool_pre_ping=True, connect_args={'connect_timeout': 2}
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    """Declarative base; every mapped table lands in the `mind` schema."""

    metadata = MetaData(schema=MIND_SCHEMA)


def get_session():
    """FastAPI dependency: one session per request."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def db_health():
    """'ok' when the database answers a trivial query, 'down' otherwise.

    Never raises: the service must keep narrating without persistence.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text('SELECT 1'))
        return 'ok'
    except Exception:
        return 'down'
