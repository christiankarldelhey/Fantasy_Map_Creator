# ============================================================================
# Attention converged (#165) — two channels, no theme_weights
# ----------------------------------------------------------------------------
# ADR 0017 leaves exactly two things bending what stands out: the
# semantic pack's objective weight (charge + floors) and the mind's
# Relations — a loved or feared subject stays watched via
# attention_weights. The theme_weights dict and the belief-boost fold
# are gone; a strong belief no longer bends salience on its own.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.db import SessionLocal
from app.mind.relations import attention_weights
from app.mind.tables import Belief, Mind, Relation


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _rainy_day(ep=1):
    return {
        'type': 'climate',
        'when': {'episode': ep, 'date': f'1950-01-{18 + ep:02d}'},
        'data': {'temperature_2m': 8.0, 'precipitation': 4.0,
                 'tags': ['weather:wet']},
    }


def _foxes(ep=1):
    return {
        'type': 'encounter',
        'when': {'episode': ep, 'date': f'1950-01-{18 + ep:02d}'},
        'data': {
            'reading': 'red foxes cross the path at dusk',
            'form': 'presence_felt', 'entity': 'red_foxes',
            'tags': ['family:foxes'],
        },
    }


def _open(client, char, events, ref='d1'):
    r = client.post('/episodes', json={
        'game_id': 'middle_earth', 'character': {'id': char},
        'episode_ref': ref, 'events': events,
    })
    assert r.status_code == 200, r.text
    return r.json()


def test_relation_attention_is_the_only_personal_channel():
    """attention_weights maps each Relation subject to max|dim| * gain —
    loved or feared things stay watched; nothing else contributes."""
    session = SessionLocal()
    char = _uid('watcher')
    mind = Mind(
        game_id='middle_earth', character_id=char,
        preset_slug='x', wiring={}, mood={}, counters={},
    )
    session.add(mind)
    session.add(Relation(
        game_id='middle_earth', character_id=char,
        subject='tag:entity_type:orcs',
        fear=0.6, origin='lived',
    ))
    # A strong belief with a boost payload — inert data now, it must not
    # reach the attention map.
    session.add(Belief(
        game_id='middle_earth', character_id=char, kind='world',
        statement='rain means ruin', strength=4, status='active',
        tags=['tag:weather:wet'], boosts={'tag:weather:wet': 0.9},
    ))
    session.flush()
    weights = attention_weights(session, mind, 0.3)
    session.rollback()
    session.close()
    assert weights['tag:entity_type:orcs'] == pytest.approx(0.18)
    assert 'tag:weather:wet' not in weights


def test_relation_bends_perceived_salience(client):
    """The loved subject stands out: a mind fond of the foxes reads
    their crossing as more salient than a mind that never met them.
    (entity_type:* carries a salience floor that would mask the lift —
    foxes do not.)"""
    char = _uid('fond')
    # The scar lands before the day starts — Relations are the lived
    # channel (#165), no mind row needed to hold them.
    session = SessionLocal()
    session.add(Relation(
        game_id='middle_earth', character_id=char,
        subject='entity:red_foxes',
        affection=0.6, origin='lived',
    ))
    session.commit()
    session.close()

    fond = _open(client, char, [_foxes()])
    plain = _open(client, _uid('plain'), [_foxes()])

    s_fond = fond['psyche_packet']['perceived_day'][0]['salience']
    s_plain = plain['psyche_packet']['perceived_day'][0]['salience']
    # w_attention * (affection .6 * gain .3) = 0.15 * 0.18 = 0.027 of lift.
    assert s_fond > s_plain
    assert s_fond - s_plain == pytest.approx(0.027, abs=0.005)
