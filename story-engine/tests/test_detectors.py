# ============================================================================
# Detectors — declared rules reading the Condition (ADR 0005)
# ----------------------------------------------------------------------------
# The mind knows no snapshot field the host did not declare. These tests
# pin the contract: the built-in pack reproduces the old hardcoded
# behaviour for middle_earth, declared rows tune it per game, and a
# second host with its own vitals (oxygen, sanity) lives entirely off
# rows — no field name exists in the engine.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete

import app.main as main_module
from app.db import SessionLocal
from app.mind.detectors import invalidate as invalidate_detectors
from app.mind.focus import build_brief
from app.mind.nl_resolver import invalidate as invalidate_nl
from app.mind.tables import Brain, Detector, Need, NlPhraseList


@pytest.fixture()
def client():
    return TestClient(main_module.app)


@pytest.fixture()
def deep_space():
    """A second host: its body is oxygen/sanity/hull, declared as rows.
    The engine never learned those names — the pack teaches it."""
    session = SessionLocal()
    session.execute(
        delete(Detector).where(Detector.game_id == 'deep_space')
    )
    session.execute(
        delete(NlPhraseList).where(
            NlPhraseList.game_id == 'deep_space',
            NlPhraseList.key == 'mind.focus_excluded',
        )
    )
    session.add_all([
        Detector(
            game_id='deep_space', kind='need', key='hypoxia',
            field='oxygen', op='<=', value=0.3,
            urgency_base=0.4, urgency_per=1.0, urgency_from='distance',
            need_type='physiological',
        ),
        Detector(
            game_id='deep_space', kind='check_mod', key='sanity_low',
            field='sanity', op='<', value=0.3, group_key='sanity',
            ordinal=0, mod=-1.5,
        ),
        Detector(
            game_id='deep_space', kind='altered', key='sanity_altered',
            field='sanity', op='<=', value=0.2,
        ),
        NlPhraseList(
            game_id='deep_space', key='mind.focus_excluded',
            ordinal=0, phrase='transmission',
        ),
    ])
    session.commit()
    session.close()
    invalidate_detectors('deep_space')
    invalidate_nl('deep_space')
    yield 'deep_space'
    session = SessionLocal()
    session.execute(
        delete(Detector).where(Detector.game_id == 'deep_space')
    )
    session.execute(
        delete(NlPhraseList).where(NlPhraseList.game_id == 'deep_space')
    )
    session.commit()
    session.close()
    invalidate_detectors('deep_space')
    invalidate_nl('deep_space')


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _open(client, character_id, ref, events, extra=None, game_id='middle_earth'):
    r = client.post('/episodes', json={
        'game_id': game_id,
        'character': {'id': character_id, **(extra or {})},
        'episode_ref': ref,
        'events': events, 'day': {},
    })
    assert r.status_code == 200, r.text
    return r.json()


def _body(ep, **data):
    return {
        'type': 'body',
        'when': {'episode': ep, 'date': f'1950-01-{18 + ep:02d}'},
        'data': data,
    }


def _need_keys(packet):
    return [n['key'] for n in packet['psyche_packet']['needs_active']]


def _checked_event(check, ep=1):
    return {
        'type': 'encounter',
        'when': {'episode': ep, 'date': '1950-01-19'},
        'data': {'entity': 'void-whale', 'check': check},
    }


# --- built-in pack: the old behaviour, byte for byte ----------------------

def test_builtin_pack_urgencies(client):
    """Exhaustion/unrest/wound urgencies match the formulas the hardcoded
    detectors used."""
    char = _uid('worn')
    packet = _open(client, char, 'd1', [
        _body(1, energy=0.2, shadow=0.5, wounded='badly_wounded'),
    ])
    needs = {
        n['key']: n for n in packet['psyche_packet']['needs_active']
    }
    # 0.5 + (0.4 - 0.2) — distance to the declared floor.
    assert needs['exhaustion']['urgency'] == pytest.approx(0.7)
    # 0.3 + 0.5 * 0.5.
    assert needs['unrest']['urgency'] == pytest.approx(0.55)
    # severity map, not a formula.
    assert needs['wound']['urgency'] == pytest.approx(0.65)


def test_builtin_check_mod_tiers(client):
    """worn energy and shadowed shadow bend the roll like before."""
    tired = _open(
        client, _uid('tired'), 'd1',
        [_checked_event({'skill': 'lore', 'difficulty': 5})],
        extra={'skills': {'lore': 8}, 'energy': 40, 'shadow': 30},
    )
    item = tired['psyche_packet']['perceived_day'][0]
    # energy 40 -> 0.4 worn (-1.0); shadow 30 -> 0.3 shadowed (-1.0).
    assert item['check']['mods'] == pytest.approx(-2.0)


def test_builtin_pack_reads_conditions_wound(client):
    """A wound reported only inside conditions[] still feeds the wound
    need and the wounded check mod."""
    char = _uid('bleeding')
    packet = _open(client, char, 'd1', [
        _checked_event({'skill': 'lore', 'difficulty': 5}),
    ], extra={'skills': {'lore': 8}, 'conditions': ['wounded']})
    assert 'wound' in _need_keys(packet)
    item = packet['psyche_packet']['perceived_day'][0]
    assert item['check']['mods'] == pytest.approx(-1.0)


# --- rows tune the pack ---------------------------------------------------

def test_declared_row_overrides_default_threshold(client):
    """A game's own detector row replaces the built-in for its key."""
    session = SessionLocal()
    session.add(Detector(
        game_id='middle_earth', kind='need', key='hunger',
        field='days_without_food', op='>=', value=4.0,
        urgency_base=0.3, urgency_per=0.2,
    ))
    session.commit()
    session.close()
    invalidate_detectors('middle_earth')
    try:
        packet = _open(client, _uid('patient'), 'd1', [
            _body(1, days_without_food=2),
        ])
        assert 'hunger' not in _need_keys(packet)
        packet = _open(client, _uid('starving'), 'd1', [
            _body(1, days_without_food=4),
        ])
        assert 'hunger' in _need_keys(packet)
    finally:
        session = SessionLocal()
        session.execute(
            delete(Detector).where(
                Detector.game_id == 'middle_earth',
                Detector.key == 'hunger',
            )
        )
        session.commit()
        session.close()
        invalidate_detectors('middle_earth')


def test_disabled_row_silences_default(client):
    """enabled=False is how a game turns a built-in detector off."""
    session = SessionLocal()
    session.add(Detector(
        game_id='middle_earth', kind='need', key='hunger',
        field='days_without_food', op='>=', value=1.0, enabled=False,
    ))
    session.commit()
    session.close()
    invalidate_detectors('middle_earth')
    try:
        packet = _open(client, _uid('no-hunger'), 'd1', [
            _body(1, days_without_food=9),
        ])
        assert 'hunger' not in _need_keys(packet)
    finally:
        session = SessionLocal()
        session.execute(
            delete(Detector).where(
                Detector.game_id == 'middle_earth',
                Detector.key == 'hunger',
            )
        )
        session.commit()
        session.close()
        invalidate_detectors('middle_earth')


# --- the second host -------------------------------------------------------

def test_second_host_lives_off_its_own_fields(client, deep_space):
    """oxygen arrives through the free-form `state` channel; a declared
    detector turns it into a need the engine never heard of."""
    packet = _open(
        client, _uid('astronaut'), 'd1', [],
        extra={'state': {'oxygen': 0.2, 'sanity': 0.9}},
        game_id=deep_space,
    )
    needs = {
        n['key']: n for n in packet['psyche_packet']['needs_active']
    }
    assert needs['hypoxia']['type'] == 'physiological'
    # 0.4 + 1.0 * (0.3 - 0.2) — distance to the declared floor.
    assert needs['hypoxia']['urgency'] == pytest.approx(0.5)
    # The built-in pack's fields were never sent, so nothing fires.
    assert 'hunger' not in needs and 'unrest' not in needs


def test_second_host_body_event_also_reads(client, deep_space):
    """The Condition may also arrive in the episode's body event —
    same flat map."""
    packet = _open(
        client, _uid('astronaut'), 'd1',
        [_body(1, oxygen=0.1)],
        game_id=deep_space,
    )
    assert 'hypoxia' in _need_keys(packet)


def test_second_host_need_auto_resolves(client, deep_space):
    char = _uid('recovered')
    _open(client, char, 'd1', [], extra={'state': {'oxygen': 0.2}},
          game_id=deep_space)
    second = _open(client, char, 'd2', [],
                   extra={'state': {'oxygen': 0.95}},
                   game_id=deep_space)
    assert 'hypoxia' not in _need_keys(second)
    session = SessionLocal()
    need = session.query(Need).filter_by(
        character_id=char, key='hypoxia'
    ).one()
    session.close()
    assert need.status == 'resolved'
    assert need.resolution['reason'] == 'state_cleared'


def test_second_host_check_mod_and_altered(client, deep_space):
    """A declared check_mod bends rolls; a declared altered rule turns a
    failed roll into a misread — on fields the engine never named."""
    sane = _open(
        client, _uid('sane'), 'd1',
        [_checked_event({'skill': 'lore', 'difficulty': 5})],
        extra={'skills': {'lore': 8}, 'state': {'sanity': 0.9}},
        game_id=deep_space,
    )
    item = sane['psyche_packet']['perceived_day'][0]
    assert item['check']['mods'] == pytest.approx(0.0)

    unraveling = _open(
        client, _uid('unraveling'), 'd1',
        [_checked_event({'skill': 'lore', 'difficulty': 5})],
        extra={'skills': {'lore': 8}, 'state': {'sanity': 0.1}},
        game_id=deep_space,
    )
    item = unraveling['psyche_packet']['perceived_day'][0]
    assert item['check']['mods'] == pytest.approx(-1.5)

    misread = _open(
        client, _uid('mad'), 'd1',
        [_checked_event({'skill': 'lore', 'difficulty': 25})],
        extra={'skills': {'lore': 0}, 'state': {'sanity': 0.15}},
        game_id=deep_space,
    )
    item = misread['psyche_packet']['perceived_day'][0]
    assert item['perception'] == 'misread'


# --- per-brain overrides -----------------------------------------------------

def test_brain_override_beats_declared_value(client):
    """wiring 'detector.<key>.<param>' retunes one brain only."""
    char = _uid('ascetic')
    _open(client, char, 'd1', [_body(1, days_without_food=0)])
    session = SessionLocal()
    brain = session.query(Brain).filter_by(character_id=char).one()
    brain.wiring = {**(brain.wiring or {}), 'detector.hunger.value': 5.0}
    session.commit()
    session.close()
    packet = _open(client, char, 'd2', [_body(2, days_without_food=2)])
    assert 'hunger' not in _need_keys(packet)


def test_legacy_wiring_key_still_reads(client):
    """Brains authored before the move keep their old knobs working."""
    char = _uid('legacy')
    _open(client, char, 'd1', [_body(1, days_without_food=0)])
    session = SessionLocal()
    brain = session.query(Brain).filter_by(character_id=char).one()
    brain.wiring = {**(brain.wiring or {}), 'need_hunger_days': 5.0}
    session.commit()
    session.close()
    packet = _open(client, char, 'd2', [_body(2, days_without_food=2)])
    assert 'hunger' not in _need_keys(packet)


# --- focus exclusions are pack data ------------------------------------------

def _day_item(t, reading='what passes', salience=0.9):
    return {
        'type': t, 'perception': 'noticed', 'reading': reading,
        'salience': salience, 'data': {},
    }


def test_focus_exclusion_is_game_scoped(client, deep_space):
    """'transmission' frames deep_space's episodes but could take the
    Focus anywhere the pack doesn't declare it."""
    session = SessionLocal()
    day = [_day_item('transmission')]
    brief = build_brief(
        day, [], [], [], {}, session=session, game_id=deep_space,
    )
    assert brief['focus'] is None
    brief = build_brief(
        day, [], [], [], {}, session=session, game_id='middle_earth',
    )
    assert brief['focus'] is not None
    assert brief['focus']['kind'] == 'event'
    session.close()


def test_builtin_pack_still_frames_travel(client):
    """middle_earth keeps its frame types through the built-in pack."""
    session = SessionLocal()
    brief = build_brief(
        [_day_item('travel')], [], [], [], {},
        session=session, game_id='middle_earth',
    )
    session.close()
    assert brief['focus'] is None
