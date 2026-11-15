# ============================================================================
# B9 smoke — composite rules as editable data
# ----------------------------------------------------------------------------
# Multi-day compound states are declarative rows now: a rule fires when
# ANY condition group matches (AND within a group) on an event of the
# declared type for N consecutive persisted episodes → the keyed Need
# opens. 'exposure' itself is now the DEFAULT_RULES entry.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.db import SessionLocal
from app.mind.tables import CompositeRule


@pytest.fixture()
def client():
    yield TestClient(main_module.app)
    # Rules persist game-wide — never leak them into other tests.
    session = SessionLocal()
    session.query(CompositeRule).filter(
        CompositeRule.key.in_(['snowbound', 'exposure'])
    ).delete(synchronize_session=False)
    session.commit()
    session.close()


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _snowbound_rule():
    session = SessionLocal()
    session.query(CompositeRule).filter_by(
        game_id='middle_earth', key='snowbound'
    ).delete()
    session.add(CompositeRule(
        game_id='middle_earth', key='snowbound', need_type='physiological',
        event_type='climate', streak_days=2,
        urgency_base=0.4, urgency_per_day=0.2,
        conditions=[[
            {'field': 'temperature_2m', 'op': '<=', 'value': 1.0},
            {'field': 'precipitation', 'op': '>', 'value': 0.0},
        ]],
        description='snowed in — the passes are closed and the heart sinks',
    ))
    session.commit()
    session.close()


def _snow(ep):
    return {
        'type': 'climate',
        'when': {'episode': ep, 'date': f'1950-01-{18 + ep:02d}'},
        'data': {'temperature_2m': -2.0, 'precipitation': 3.0},
    }


def _mild(ep):
    return {
        'type': 'climate',
        'when': {'episode': ep, 'date': f'1950-01-{18 + ep:02d}'},
        'data': {'temperature_2m': 15.0, 'precipitation': 0.0},
    }


def _open(client, char, events, ref):
    r = client.post('/episodes', json={
        'game_id': 'middle_earth', 'character': {'id': char},
        'episode_ref': ref, 'events': events,
    })
    assert r.status_code == 200, r.text
    return r.json()


def _day(client, char, ep, events):
    opened = _open(client, char, events, f'd{ep}')
    client.post(f"/episodes/{opened['episode_id']}/close", json={})
    return opened


def _need_keys(opened):
    return {n['key'] for n in opened['psyche_packet']['needs_active']}


def test_compound_rule_fires_after_streak(client):
    _snowbound_rule()
    char = _uid('snowed')
    # Day 1 snowy → streak 1 < 2, nothing yet.
    opened = _day(client, char, 1, [_snow(1)])
    assert 'snowbound' not in _need_keys(opened)
    # Day 2 snowy → streak 2 → the need opens, with the rule's own words.
    opened = _day(client, char, 2, [_snow(2)])
    needs = opened['psyche_packet']['needs_active']
    snowbound = next(n for n in needs if n['key'] == 'snowbound')
    assert snowbound['description'] == \
        'snowed in — the passes are closed and the heart sinks'


def test_streak_resets_on_mild_day(client):
    _snowbound_rule()
    char = _uid('snowed')
    _day(client, char, 1, [_snow(1)])
    _day(client, char, 2, [_mild(2)])          # breaks the streak
    opened = _day(client, char, 3, [_snow(3)])  # back to 1 < 2
    assert 'snowbound' not in _need_keys(opened)


def test_and_clauses_must_share_one_event(client):
    """temp<=1 on one event and precip>0 on another must NOT fire —
    the group binds to a single event."""
    _snowbound_rule()
    char = _uid('split')
    for ep in (1, 2):
        opened = _day(client, char, ep, [
            {'type': 'climate',
             'when': {'episode': ep, 'date': f'1950-01-{18 + ep:02d}'},
             'data': {'temperature_2m': -2.0}},          # cold, no precip
            {'type': 'climate',
             'when': {'episode': ep, 'date': f'1950-01-{18 + ep:02d}'},
             'data': {'precipitation': 3.0}},           # wet, no temp
        ])
    assert 'snowbound' not in _need_keys(opened)


def test_malformed_rule_never_breaks_the_day(client):
    """Garbage in conditions must be ignored — not raise, not block open."""
    session = SessionLocal()
    session.query(CompositeRule).filter_by(
        game_id='middle_earth', key='garbage'
    ).delete()
    session.add(CompositeRule(
        game_id='middle_earth', key='garbage', need_type='physiological',
        event_type='climate', streak_days=1,
        conditions=[
            'not-a-group',
            [{'field': 'temperature_2m', 'op': '???', 'value': 0}],
            [{'field': 'temperature_2m', 'op': '>=', 'value': 'hot'}],
        ],
    ))
    session.commit()
    session.close()
    try:
        opened = _open(client, _uid('safe'), [_snow(1)], 'd1')
        assert 'garbage' not in _need_keys(opened)
    finally:
        session = SessionLocal()
        session.query(CompositeRule).filter_by(
            game_id='middle_earth', key='garbage'
        ).delete()
        session.commit()
        session.close()


def test_db_rule_overrides_default_exposure(client):
    """A game row keyed 'exposure' replaces the built-in — this one needs
    only 2 consecutive hostile days and uses its own description."""
    session = SessionLocal()
    session.query(CompositeRule).filter_by(
        game_id='middle_earth', key='exposure'
    ).delete()
    session.add(CompositeRule(
        game_id='middle_earth', key='exposure', need_type='physiological',
        event_type='climate', streak_days=2,
        conditions=[[{'field': 'wind_speed_10m', 'op': '>=', 'value': 25}]],
        description='the wind has not let up — the body is worn',
    ))
    session.commit()
    session.close()

    char = _uid('gale')
    for ep in (1, 2):
        opened = _day(client, char, ep, [{
            'type': 'climate',
            'when': {'episode': ep, 'date': f'1950-01-{18 + ep:02d}'},
            'data': {'wind_speed_10m': 40.0},
        }])
    needs = opened['psyche_packet']['needs_active']
    exposure = next(n for n in needs if n['key'] == 'exposure')
    assert exposure['description'] == \
        'the wind has not let up — the body is worn'
