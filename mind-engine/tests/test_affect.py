# ============================================================================
# The felt channel — what the semantics pack + Relations do to an event
# ----------------------------------------------------------------------------
# Events travel clean — facts and words, never valence (ADR 0017). The
# semantic pack reads what the contact objectively meant (the world
# delta), Relations sediment it, and the felt delta — bent by the
# standing Relation — is what the item reports. Memory stores the
# *felt* imprint, so the same world can leave different traces in
# different minds.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.db import SessionLocal
from app.mind.tables import Mind, MindPreset, Episode, Memory, PresetLean


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _open(client, char, events, ref, preset=None):
    character = {'id': char}
    if preset:
        character['preset'] = preset
    r = client.post('/episodes', json={
        'game_id': 'middle_earth',
        'character': character,
        'episode_ref': ref,
        'events': events,
    })
    assert r.status_code == 200, r.text
    return r.json()


def _open_and_close(client, char, ref, events, preset=None):
    opened = _open(client, char, events, ref, preset)
    c = client.post(f"/episodes/{opened['episode_id']}/close", json={})
    assert c.status_code == 200, c.text
    return opened, c.json()


def _encounter(ep, form='confronts', outcome='wounded', danger=3):
    return {
        'type': 'encounter',
        'when': {'episode': ep, 'date': f'1950-01-{18 + ep:02d}'},
        'data': {
            'entity': 'corpse-candles',
            'entity_name': 'Corpse Candles',
            'entity_type': 'undead',
            'danger': danger,
            'form': form,
            'outcome': outcome,
        },
    }


def _perceived(char, episode_index=0, item_index=0):
    session = SessionLocal()
    days = (
        session.query(Episode.perceived_day)
        .filter_by(character_id=char)
        .order_by(Episode.created_at)
        .all()
    )
    session.close()
    return days[episode_index][0][item_index]


def _episode_mood(char, episode_index=0):
    session = SessionLocal()
    moods = (
        session.query(Episode.mood)
        .filter_by(character_id=char)
        .order_by(Episode.created_at)
        .all()
    )
    session.close()
    return moods[episode_index][0]


def _brain_mood(char):
    session = SessionLocal()
    mind = session.query(Mind).filter_by(character_id=char).one()
    mood = dict(mind.mood or {})
    session.close()
    return mood


def test_hostile_encounter_darkens_the_day(client):
    """A confrontation that wounds is a bad day — the semantic pack reads
    the contact, the felt delta lands on the item, the mood, the memory."""
    char = _uid('hurt')
    _open_and_close(client, char, 'd1', [_encounter(1)])

    item = _perceived(char)
    # confronts + wounded + the entity's declared danger, all objective.
    assert item['world_valence'] < -0.4
    assert item['valence'] < -0.4
    assert item['imprint']['fear'] > 0.4
    mood = _episode_mood(char)
    assert mood['valence'] < 0
    assert mood['dominant'] != 'steady'
    assert mood['felt']['fear'] > 0.4
    assert mood['trace'][0]['subject'].startswith('entity:')

    session = SessionLocal()
    mem = session.query(Memory).filter_by(character_id=char).one()
    session.close()
    assert mem.valence == pytest.approx(item['valence'])
    assert mem.imprint['fear'] > 0.4
    assert 'entity:corpse-candles' in mem.subjects


def test_host_valence_is_not_the_hosts_to_declare(client):
    """data.valence is dead on the wire — the mind reads the world's
    facts; a declared feeling is just an unknown field, ignored."""
    char = _uid('host')
    event = {**_encounter(1), 'data': {
        **_encounter(1)['data'], 'valence': 0.8,
    }}
    _open_and_close(client, char, 'd1', [event])
    item = _perceived(char)
    assert item['valence'] < -0.4  # the confrontation, not the 0.8


def test_numeric_fields_push_valence(client):
    """'shadow_effect' is a declared numeric fact — it reads as menace
    scaled by contact, no tag needed."""
    char = _uid('haunted')
    rest = {
        'type': 'rest',
        'when': {'episode': 1, 'date': '1950-01-19'},
        'data': {'shadow_effect': 2},
    }
    _open_and_close(client, char, 'd1', [rest])
    assert _perceived(char)['valence'] < 0


def test_a_shut_door_is_felt_and_remembered(client):
    """The night's social truth travels as tags: 'lodging:turned_away'
    wounds and clears its salience floor — the mind does not need a
    number to know a refused bed hurt. Under the semantic pack the
    valence is emergent (affection/trust deltas through Relations), so
    the contract is the sign and the floor, not a declared figure."""
    char = _uid('refused')
    rest = {
        'type': 'rest',
        'when': {'episode': 1, 'date': '1950-01-19'},
        'data': {
            'entity_name': 'The Prancing Pony',
            'reading': 'The door of The Prancing Pony shut on an empty purse.',
            'tags': ['lodging:turned_away', 'rest:poor', 'rest:open_sky'],
        },
    }
    _open_and_close(client, char, 'd1', [rest])
    item = _perceived(char)
    assert item['valence'] < 0
    assert item['salience'] >= 0.5


def test_a_kind_night_warms(client):
    """'lodging:charity' is felt as mercy — a charitable roof reads
    warmer than a merely adequate one (emergent valence, positive)."""
    char = _uid('sheltered')
    rest = {
        'type': 'rest',
        'when': {'episode': 1, 'date': '1950-01-19'},
        'data': {
            'reading': 'A corner by the fire, freely given.',
            'tags': ['lodging:charity', 'rest:good', 'rest:indoor'],
        },
    }
    _open_and_close(client, char, 'd1', [rest])
    item = _perceived(char)
    assert item['valence'] > 0
    assert item['salience'] >= 0.5


def test_two_minds_feel_the_same_world_differently(client):
    """The whole point: a preset leaning 'orcs are dreaded' meets the
    same orc sighting as a feared thing where the default mind merely
    registers it."""
    session = SessionLocal()
    slug = _uid('orcdread')
    preset = MindPreset(game_id='middle_earth', slug=slug, name='Orcdread')
    session.add(preset)
    session.flush()
    session.add(PresetLean(
        preset_id=preset.id, subject='tag:entity_type:orcs',
        fear=0.8, affection=-0.6,
    ))
    session.commit()
    session.close()

    orcs = {
        'type': 'encounter',
        'when': {'episode': 1, 'date': '1950-01-19'},
        'data': {'entity': 'orc_scouts', 'entity_type': 'orcs',
                 'form': 'stalks', 'danger': 3},
    }
    calm = _uid('calm')
    _open_and_close(client, calm, 'd1', [orcs])
    neutral = _perceived(calm)

    dreading = _uid('dreading')
    _open_and_close(client, dreading, 'd1', [orcs], preset=slug)
    feared = _perceived(dreading)
    # The standing fear amplifies the landing (1 + k·fear) — same world,
    # heavier felt.
    assert feared['valence'] < neutral['valence']
    assert feared['imprint']['fear'] > neutral['imprint']['fear']
    assert feared['imprint']['fear'] > 0.0


def test_a_bad_day_leaves_a_morning_after(client):
    """The felt day carries into the running mood: the day after the
    wound is not a reset — the trace persists through the night."""
    char = _uid('carrying')
    _open_and_close(client, char, 'd1', [_encounter(1)])
    assert _brain_mood(char)['valence'] < 0

    calm = {
        'type': 'travel',
        'when': {'episode': 2, 'date': '1950-01-20'},
        'data': {'distance_km': 10},
    }
    _open_and_close(client, char, 'd2', [calm])
    assert _episode_mood(char, 1)['valence'] == 0.0  # the day itself: neutral
    assert _brain_mood(char)['valence'] < 0          # the mind: still marked
