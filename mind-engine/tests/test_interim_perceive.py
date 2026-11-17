# Interim perceive (Wave C) — outcome events sediment mid-day so the next
# choose reads the evolved Mind; ids make every blow count once.
import random
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete

import app.main as main_module
from app.db import SessionLocal
from app.mind.choosing import choose
from app.mind.perceive import perceive_events
from app.mind.tables import Detector, Mind, Need, Relation


GAME = 'interim_test'


def _uid():
    return f'c-{uuid.uuid4().hex[:8]}'


@pytest.fixture()
def client():
    return TestClient(main_module.app)


@pytest.fixture()
def mind():
    char = _uid()
    s = SessionLocal()
    s.add(Mind(game_id=GAME, character_id=char,
               preset_slug='test', personality={}))
    s.commit()
    s.close()
    yield char
    s = SessionLocal()
    s.execute(delete(Mind).where(
        Mind.game_id == GAME, Mind.character_id == char))
    s.execute(delete(Relation).where(
        Relation.game_id == GAME, Relation.character_id == char))
    s.execute(delete(Need).where(
        Need.game_id == GAME, Need.character_id == char))
    s.commit()
    s.close()


def _ev(eid, form='attacks', npc='hal', name='Hal'):
    return {
        'id': eid, 'type': 'interaction',
        'when': {'hour': 20.5, 'phase': 'night'},
        'data': {'form': form, 'npc': npc, 'npc_name': name},
    }


def _post_perceive(client, char, events, character=None):
    return client.post(
        f'/mind/minds/{char}/perceive',
        json={'game_id': GAME, 'events': events, 'character': character},
    )


def _relation_fear(char, subject):
    s = SessionLocal()
    row = s.query(Relation).filter_by(
        game_id=GAME, character_id=char, subject=subject).one_or_none()
    s.close()
    return row.fear if row else 0.0


def test_interim_event_sediments_relation(client, mind):
    res = _post_perceive(client, mind, [_ev('d1:sit:x:stay')])
    assert res.status_code == 200
    assert res.json()['perceived'] == 1
    assert _relation_fear(mind, 'tag:npc:hal') > 0


def test_same_event_id_never_double_feeds(client, mind):
    _post_perceive(client, mind, [_ev('d1:sit:x:stay')])
    fear_once = _relation_fear(mind, 'tag:npc:hal')
    res = _post_perceive(client, mind, [_ev('d1:sit:x:stay')])
    assert res.json()['skipped'] == 1
    assert _relation_fear(mind, 'tag:npc:hal') == fear_once


def test_perceived_then_choose_reads_evolved_state(client, mind):
    # The orc attacked at dusk; the shelter offer after should lean away.
    _post_perceive(client, mind, [_ev('d1:sit:orc:defy', npc='orc', name='Orc')])
    s = SessionLocal()
    out = choose(
        s,
        s.query(Mind).filter_by(game_id=GAME, character_id=mind).one(),
        GAME, mind,
        [{'situation_id': 's:2', 'subject': 'tag:npc:orc', 'options': [
            {'interaction_id': 'i:talk', 'act': 'talk'},
            {'interaction_id': 'i:walk', 'act': 'avoid'},
        ]}],
        rng=random.Random(1),
    )
    # fear sedimented on 'tag:npc:orc' — away-acts gain weight
    pick = out['choices'][0]
    rel = next(w for w in pick['weights'] if w['interaction_id'] == 'i:walk')
    talk = next(w for w in pick['weights'] if w['interaction_id'] == 'i:talk')
    assert rel['weight'] > talk['weight']


def test_felt_ids_skip_sediment_but_still_annotate(client, mind):
    _post_perceive(client, mind, [_ev('d1:sit:x:stay')])
    fear_once = _relation_fear(mind, 'tag:npc:hal')
    s = SessionLocal()
    m = s.query(Mind).filter_by(
        game_id=GAME, character_id=mind).one()
    felt = set((m.counters or {}).get('felt_event_ids') or [])
    items = perceive_events(
        s, GAME, m, [_ev('d1:sit:x:stay')], felt_ids=felt,
    )
    s.commit()
    assert _relation_fear(mind, 'tag:npc:hal') == fear_once
    assert items[0]['salience'] >= 0  # annotated, not re-fed


def test_no_id_events_sediment_unconditionally(client, mind):
    res = _post_perceive(client, mind, [
        {'type': 'interaction', 'when': {},
         'data': {'form': 'attacks', 'npc': 'hal', 'npc_name': 'Hal'}},
    ])
    assert res.status_code == 200
    assert _relation_fear(mind, 'tag:npc:hal') > 0


def test_missing_mind_is_noop(client):
    res = _post_perceive(client, 'no-such', [_ev('e:1')])
    assert res.status_code == 200
    assert res.json()['perceived'] == 0
