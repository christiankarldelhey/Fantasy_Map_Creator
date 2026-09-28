# ============================================================================
# B7 smoke — per-brain NL overrides
# ----------------------------------------------------------------------------
# mind.brain_nl_overrides lets one brain replace a band table, a
# threshold or a phrase list for itself: override → game pack → default.
# The hobbit calls the ranger's drizzle a storm.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.db import SessionLocal
from app.mind.nl_resolver import phrases
from app.mind.tables import Brain, BrainNlOverride


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _open(client, char, events, ref='d1'):
    r = client.post('/episodes', json={
        'game_id': 'middle_earth', 'character': {'id': char},
        'episode_ref': ref, 'events': events,
    })
    assert r.status_code == 200, r.text
    return r.json()


def _brain_of(character_id):
    session = SessionLocal()
    brain = session.query(Brain).filter_by(character_id=character_id).one()
    brain_id = brain.id
    session.close()
    return brain_id


def _add_override(brain_id, **row):
    session = SessionLocal()
    session.add(BrainNlOverride(brain_id=brain_id, **row))
    session.commit()
    session.close()


def _climate(temp=8.0, prec=1.0):
    return {
        'type': 'climate',
        'when': {'episode': 1, 'date': '1950-01-19'},
        'data': {'temperature_2m': temp, 'precipitation': prec},
    }


def test_band_override_rewrites_the_reading(client):
    """Same cold day: the plain brain reads the pack's words, the
    overridden brain reads its own."""
    plain = _uid('plain')
    hobbit = _uid('hobbit')
    plain_day = _open(client, plain, [_climate()])
    hobbit_day = _open(client, hobbit, [_climate()])

    brain_id = _brain_of(hobbit)
    _add_override(brain_id, kind='band', key='temperature',
                  ordinal=0, below=None, phrase='a bitter Shire frost')
    hobbit_day2 = _open(client, hobbit, [_climate()], ref='d2')

    reading_plain = plain_day['psyche_packet']['perceived_day'][0]['reading']
    reading_before = hobbit_day['psyche_packet']['perceived_day'][0]['reading']
    reading_after = hobbit_day2['psyche_packet']['perceived_day'][0]['reading']
    assert reading_plain == reading_before
    assert 'a bitter Shire frost' in reading_after


def test_threshold_override_changes_semantic_tags(client):
    """A brain with a sky-high rain threshold never feels 'wet' — its
    climate events lose tag:weather:wet and the 'wet' reading."""
    plain = _uid('plain')
    stoic = _uid('stoic')
    p0 = _open(client, plain, [_climate()])['psyche_packet']
    s0_before = _open(client, stoic, [_climate()])['psyche_packet']
    _add_override(_brain_of(stoic), kind='threshold',
                  key='climate.wet_precipitation_min', value=5.0)
    s0 = _open(client, stoic, [_climate()], ref='d2')['psyche_packet']

    assert 'wet' in p0['perceived_day'][0]['reading']
    assert 'tag:weather:wet' in p0['perceived_day'][0]['tags']
    assert s0_before['perceived_day'][0]['reading'] == \
        p0['perceived_day'][0]['reading']
    assert 'wet' not in s0['perceived_day'][0]['reading']
    assert 'tag:weather:wet' not in s0['perceived_day'][0]['tags']


def test_phrase_list_override():
    session = SessionLocal()
    char = _uid('voice')
    brain = Brain(game_id='middle_earth', character_id=char,
                  mold_slug='x', theme_weights={}, wiring={},
                  mood={}, counters={})
    session.add(brain)
    session.flush()
    session.add(BrainNlOverride(
        brain_id=brain.id, kind='phrase_list', key='mind.decision',
        ordinal=0, phrase='So be it: {choice}.',
    ))
    session.flush()
    mine = phrases(session, 'middle_earth', 'mind.decision', brain=brain)
    global_ = phrases(session, 'middle_earth', 'mind.decision')
    assert mine == ['So be it: {choice}.']
    assert mine != global_
    # Untouched keys still resolve through the pack.
    assert phrases(session, 'middle_earth', 'mind.pattern',
                   brain=brain) == phrases(
                       session, 'middle_earth', 'mind.pattern')
    session.rollback()
    session.close()
