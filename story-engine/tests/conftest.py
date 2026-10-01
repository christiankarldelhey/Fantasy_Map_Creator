# ============================================================================
# Suite isolation — mind tables live in a throwaway schema, not `mind`.
# ----------------------------------------------------------------------------
# Sets MIND_SCHEMA before any app module is imported (conftest loads first),
# then drops/recreates `mind_test` so each run starts empty. The suite mints
# hundreds of molds/brains with random suffixes; without this they land in
# the real schema forever.
# ============================================================================
import os

os.environ['MIND_SCHEMA'] = 'mind_test'

from sqlalchemy import text  # noqa: E402

import app.mind.tables  # noqa: E402,F401 — registers every table on Base.metadata
from app.db import Base, engine  # noqa: E402


def _reset_test_schema():
    with engine.begin() as conn:
        conn.execute(text('DROP SCHEMA IF EXISTS mind_test CASCADE'))
        conn.execute(text('CREATE SCHEMA mind_test'))
    Base.metadata.create_all(engine)


_reset_test_schema()
