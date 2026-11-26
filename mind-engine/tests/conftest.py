# ============================================================================
# Suite isolation — mind tables live in a throwaway schema, not `mind`.
# ----------------------------------------------------------------------------
# Sets MIND_SCHEMA before any app module is imported (conftest loads first),
# then drops/recreates `mind_test` so each run starts empty. The suite mints
# hundreds of presets/minds with random suffixes; without this they land in
# the real schema forever.
# ============================================================================
import os

os.environ['MIND_SCHEMA'] = 'mind_test'
# The Lens director is an LLM call inside episode open: off for the suite
# (rules pick the Focus); director tests patch it in explicitly.
os.environ['MIND_DIRECTOR'] = 'off'

from sqlalchemy import text  # noqa: E402

import app.mind.tables  # noqa: E402,F401 — registers every table on Base.metadata
from app.db import Base, engine  # noqa: E402


def _reset_test_schema():
    with engine.begin() as conn:
        conn.execute(text('DROP SCHEMA IF EXISTS mind_test CASCADE'))
        conn.execute(text('CREATE SCHEMA mind_test'))
    Base.metadata.create_all(engine)


_reset_test_schema()


# Mind-map trace (docs/mind-map/): with MIND_TRACE_TESTS=1 every test runs
# inside a trace buffer; at session end each @step the suite exercised is
# written to tests/.mind-trace.json with the test's name and first
# docstring line — the map's "rules" per step.
import inspect as _inspect  # noqa: E402
import json as _json  # noqa: E402

import pytest as _pytest  # noqa: E402

_TRACE_AGG = []

if os.environ.get('MIND_TRACE_TESTS'):
    from app.mind.steps import trace_recording, trace_test_name

    @_pytest.fixture(autouse=True)
    def _mind_step_trace(request):
        doc = _inspect.getdoc(request.node.function) or ''
        with trace_recording() as buf, trace_test_name(request.node.nodeid):
            yield
        for e in buf:
            _TRACE_AGG.append({
                'test': request.node.nodeid,
                'doc': doc.split('\n')[0] if doc else '',
                **e,
            })

    def pytest_sessionfinish(session, exitstatus):
        from pathlib import Path as _P
        (_P(__file__).parent / '.mind-trace.json').write_text(
            _json.dumps(_TRACE_AGG))


def open_state(client, opened):
    """The state an open produced — what the retired psyche_packet
    surfaced; tests read it through GET /episodes/{id}. Accepts the
    open response dict or a bare episode id."""
    ep_id = opened['episode_id'] if isinstance(opened, dict) else opened
    return client.get(f'/episodes/{ep_id}').json()
