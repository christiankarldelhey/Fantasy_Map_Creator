# ============================================================================
# C9 — homeostasis: open needs weigh on the mood
# ----------------------------------------------------------------------------
# The body's voice: an open need pulls the episode's valence down by
# urgency * need_affect_scale (capped by need_affect_cap), independent
# of what the day held. need_pressure is recorded on the mood dict.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.db import SessionLocal
from app.mind.tables import Episode, Memory, Need


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _open_and_close(client, char, ref, events):
    r = client.post('/episodes', json={
        'game_id': 'middle_earth',
        'character': {'id': char},
        'episode_ref': ref,
        'events': events,
        'day': {},
    })
    assert r.status_code == 200, r.text
    c = client.post(f"/episodes/{r.json()['episode_id']}/close", json={})
    assert c.status_code == 200, c.text
    return r.json(), c.json()


def _mood(char, index=0):
    session = SessionLocal()
    rows = (
        session.query(Episode.mood)
        .filter_by(character_id=char)
        .order_by(Episode.created_at)
        .all()
    )
    session.close()
    return rows[index][0]


def _calm_day(ep, **body):
    events = [{
        'type': 'travel',
        'when': {'episode': ep, 'date': f'1950-01-{18 + ep:02d}'},
        'data': {'distance_km': 10},
    }]
    if body:
        events.append({
            'type': 'body',
            'when': {'episode': ep, 'date': f'1950-01-{18 + ep:02d}'},
            'data': body,
        })
    return events


def test_an_open_need_darkens_a_fine_day(client):
    """Two identical calm days; only the hungry one bleeds into mood."""
    fed, starved = _uid('fed'), _uid('hungry')
    _open_and_close(client, fed, 'd1', _calm_day(1))
    _open_and_close(client, starved, 'd1', _calm_day(1, days_without_food=3))

    fine = _mood(fed)
    hungry = _mood(starved)
    assert fine['need_pressure'] == 0.0
    assert fine['valence'] == 0.0
    # hunger urgency min(1, 0.3 + 0.2*3) = 0.9 -> pressure 0.27
    assert hungry['need_pressure'] == pytest.approx(0.27)
    assert hungry['valence'] == pytest.approx(-0.27)
    assert hungry['dominant'] != fine['dominant'] or hungry['valence'] < 0


def test_pressure_grows_with_urgency_and_respects_the_cap(client):
    """More days hungry -> heavier. Stacked needs can't exceed the cap."""
    growing = _uid('grow')
    for days in (1, 4):
        _open_and_close(
            client, growing, f'd{days}',
            _calm_day(days, days_without_food=days),
        )
    assert _mood(growing, 0)['need_pressure'] == pytest.approx(0.15)   # urg 0.5
    assert _mood(growing, 1)['need_pressure'] == pytest.approx(0.3)    # urg 1.0

    capped = _uid('cap')
    _open_and_close(client, capped, 'd1', _calm_day(
        1, days_without_food=4, days_without_water=3, energy=0.1,
    ))
    # hunger 1.0 + thirst 1.0 + exhaustion ~0.8 -> 2.8 * 0.3 = 0.84, capped
    assert _mood(capped)['need_pressure'] == pytest.approx(0.4)


def test_eating_lifts_the_weight(client):
    """The detector clears at the next open — the pressure is gone, and
    the brain's running mood only keeps the blended trace."""
    char = _uid('relief')
    _open_and_close(client, char, 'd1', _calm_day(1, days_without_food=4))
    assert _mood(char)['valence'] < -0.2

    _open_and_close(client, char, 'd2', _calm_day(2))
    mood = _mood(char, 1)
    assert mood['need_pressure'] == 0.0
    assert mood['valence'] == 0.0

    session = SessionLocal()
    hunger = (
        session.query(Need)
        .filter_by(character_id=char, key='hunger')
        .one()
    )
    session.close()
    assert hunger.status == 'resolved'


def test_an_open_wound_is_a_need(client):
    """C10: the lens voices wounds now — 'badly_wounded' outweighs a
    scratch, and both weigh on the day."""
    char = _uid('wounded')
    _open_and_close(client, char, 'd1', _calm_day(1, wounded='badly_wounded'))

    session = SessionLocal()
    wound = (
        session.query(Need)
        .filter_by(character_id=char, key='wound')
        .one()
    )
    session.close()
    assert wound.status == 'open'
    assert wound.urgency == pytest.approx(0.65)
    assert _mood(char)['need_pressure'] == pytest.approx(0.195)


def _need(char, key):
    session = SessionLocal()
    need = (
        session.query(Need)
        .filter_by(character_id=char, key=key)
        .one()
    )
    session.close()
    return need


def _perceived_day(char, index=0):
    session = SessionLocal()
    rows = (
        session.query(Episode.perceived_day)
        .filter_by(character_id=char)
        .order_by(Episode.created_at)
        .all()
    )
    session.close()
    return rows[index][0]


def test_a_need_speaks_in_tiers(client):
    """C11: one day without food wonders about dinner; three days is the
    hunger that owns you — different words for different depths."""
    char = _uid('tiers')
    _open_and_close(client, char, 'd1', _calm_day(1, days_without_food=1))
    mild = _need(char, 'hunger').description

    _open_and_close(client, char, 'd2', _calm_day(2, days_without_food=3))
    deep = _need(char, 'hunger').description

    assert mild != deep
    assert 'ache' in deep or 'gnawing' in deep or 'crowds' in deep


def test_a_deepening_need_rotates_its_words(client):
    """Same tier across episodes rotates through the pack's variants —
    deterministic per episode, never the same line on repeat."""
    char = _uid('rotate')
    descs = set()
    for i in range(3):
        _open_and_close(
            client, char, f'd{i + 1}',
            _calm_day(i + 1, days_without_food=3),
        )
        descs.add(_need(char, 'hunger').description)
    assert len(descs) == 3  # one full rotation of the deep tier


def test_the_felt_body_becomes_memory(client):
    """The need item lands on perceived_day and encodes like any
    perception: the reading is the phrase, valence the felt badness."""
    char = _uid('remembers')
    _open_and_close(client, char, 'd1', _calm_day(1, days_without_food=3))

    item = next(
        i for i in _perceived_day(char) if i.get('type') == 'need'
    )
    assert item['data']['need'] == 'hunger'
    assert item['reading']
    assert item['salience'] == pytest.approx(0.9)
    assert item['valence'] == pytest.approx(-0.9)

    session = SessionLocal()
    mem = (
        session.query(Memory)
        .filter_by(character_id=char)
        .filter(Memory.tags.contains(['need:hunger']))
        .one()
    )
    session.close()
    assert mem.desc == item['reading']
    assert mem.valence == pytest.approx(-0.9)


def test_need_items_do_not_feed_the_repetition_channel(client):
    """'need:hunger' tags are bookkeeping — four hungry days must not
    synthesize 'hunger again — the sameness is starting to wear': the
    need's own pressure already IS the wear."""
    char = _uid('noecho')
    for i in range(4):
        _open_and_close(
            client, char, f'd{i + 1}',
            _calm_day(i + 1, days_without_food=i + 1),
        )
    for day in range(4):
        for item in _perceived_day(char, day):
            assert item.get('type') != 'recurrence' or \
                'need:' not in str(item.get('data'))
