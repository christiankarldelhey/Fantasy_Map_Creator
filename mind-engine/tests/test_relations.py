# ============================================================================
# Relations — the subject-level sediment (ADR 0017)
# ----------------------------------------------------------------------------
# Seeded at provisioning from preset leans and stanced starter beliefs;
# moved ONLY by perceived events (sediment) — the narrowest subject takes
# the whole delta, broader ones a splash. The felt reading bends through
# the standing relation; quiet episodes cool every relation toward
# indifference.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.db import SessionLocal
from app.mind.tables import (
    Memory, Mind, MindPreset, Episode, PresetLean, PresetStarterBelief,
    Relation,
)


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _open(client, char, events, ref='d1', preset=None):
    character = {'id': char}
    if preset:
        character['preset'] = preset
    r = client.post('/episodes', json={
        'game_id': 'middle_earth', 'character': character,
        'episode_ref': ref, 'events': events,
    })
    assert r.status_code == 200, r.text
    return r.json()


def _open_and_close(client, char, ref, events, preset=None):
    opened = _open(client, char, events, ref, preset)
    c = client.post(f"/episodes/{opened['episode_id']}/close", json={})
    assert c.status_code == 200, c.text
    return opened, c.json()


def _encounter(ep, entity='red_foxes', family='foxes', etype='carnivores',
               form='aid_or_trade', outcome=None, danger=None):
    data = {'entity': entity, 'entity_type': etype, 'form': form}
    if family:
        data['family'] = family
    if outcome:
        data['outcome'] = outcome
    if danger is not None:
        data['danger'] = danger
    return {
        'type': 'encounter',
        'when': {'episode': ep, 'date': f'1950-01-{18 + ep:02d}'},
        'data': data,
    }


def _preset_with(**children):
    """A preset carrying whatever rows the caller declares."""
    session = SessionLocal()
    slug = _uid('preset')
    preset = MindPreset(game_id='middle_earth', slug=slug, name=slug)
    session.add(preset)
    session.flush()
    for row in children.get('leans', []):
        session.add(PresetLean(preset_id=preset.id, **row))
    for row in children.get('beliefs', []):
        session.add(PresetStarterBelief(preset_id=preset.id, **row))
    session.commit()
    session.close()
    return slug


def _relation(char, subject):
    session = SessionLocal()
    row = (
        session.query(Relation)
        .filter_by(character_id=char, subject=subject)
        .one_or_none()
    )
    out = None
    if row is not None:
        out = {d: getattr(row, d) for d in
               ('affection', 'trust', 'fear', 'familiarity')}
        out.update(origin=row.origin, feeling=row.feeling,
                   last_fed=row.last_fed_episode)
    session.close()
    return out


def _relations(char):
    session = SessionLocal()
    rows = session.query(Relation).filter_by(character_id=char).all()
    out = {
        r.subject: {d: getattr(r, d) for d in
                    ('affection', 'trust', 'fear', 'familiarity')}
        for r in rows
    }
    session.close()
    return out


def _perceived(char, item_index=0):
    session = SessionLocal()
    days = (
        session.query(Episode.perceived_day)
        .filter_by(character_id=char)
        .order_by(Episode.created_at)
        .all()
    )
    session.close()
    return days[0][0][item_index]


def test_lean_seeds_the_relation(client):
    """'orcs' feared AND hated — the preset's authored lean lands as the
    mind's seed Relation before any lived contact."""
    slug = _preset_with(leans=[
        {'subject': 'tag:entity_type:orcs', 'fear': 0.5,
         'affection': -0.4},
    ])
    char = _uid('seeded')
    _open(client, char, [{'type': 'travel', 'when': {'episode': 1},
                          'data': {}}], preset=slug)
    rel = _relation(char, 'tag:entity_type:orcs')
    assert rel['fear'] == pytest.approx(0.5)
    assert rel['affection'] == pytest.approx(-0.4)
    assert rel['origin'] == 'seed'


def test_stanced_belief_seeds_affection(client):
    """The numeric shadow of an authored prejudice: a starter belief's
    stance seeds the same subject's Relation as affection."""
    slug = _preset_with(beliefs=[
        {'kind': 'other', 'statement': 'I do not trust dwarves',
         'strength': 3, 'tags': [], 'boosts': {},
         'subject': ['tag:entity_type:dwarves'], 'stance': -0.6,
         'source': 'heard'},
    ])
    char = _uid('dwarfseed')
    _open(client, char, [{'type': 'travel', 'when': {'episode': 1},
                          'data': {}}], preset=slug)
    rel = _relation(char, 'tag:entity_type:dwarves')
    assert rel['affection'] == pytest.approx(-0.6)
    assert rel['origin'] == 'heard'


def test_event_sediments_entity_and_splashes_the_kind(client):
    """Meeting THIS fox feeds her row whole; 'carnivores' accrete the
    splash share."""
    char = _uid('sediment')
    _open_and_close(client, char, 'd1', [_encounter(1)])
    rels = _relations(char)
    entity = rels['entity:red_foxes']
    kind = rels['tag:entity_type:carnivores']
    # aid_or_trade {affection .15, trust .3} x .5 + entity:* fam .1 x .3,
    # then the close tick cools the whole sediment a share.
    assert entity['trust'] == pytest.approx(0.15, abs=0.01)
    assert entity['affection'] == pytest.approx(0.075, abs=0.01)
    assert entity['familiarity'] == pytest.approx(0.03, abs=0.01)
    assert kind['trust'] == pytest.approx(0.15 * 0.3, abs=0.01)
    assert kind['affection'] == pytest.approx(0.075 * 0.3, abs=0.01)


def test_the_standing_relation_bends_the_landing(client):
    """A favour over a hated subject lands damped — the world gave aid;
    the prejudice made it smaller (1 + k·affection, same dim)."""
    slug = _preset_with(leans=[
        {'subject': 'tag:family:wargs', 'affection': -0.6},
    ])
    char = _uid('hated')
    _open_and_close(client, char, 'd1', [
        _encounter(1, entity='wargs', family='wargs', etype='carnivores',
                   form='aid_or_trade'),
    ], preset=slug)
    item = _perceived(char)
    # aid_or_trade is objectively good; over the hated wargs it lands
    # smaller — affection delta x (1 + .5 x -.6) = x .7.
    assert 0 < item['valence'] < item['world_valence']


def test_unnoticed_means_never_happened(client):
    """A favour slept through sediments nothing — no relation grows."""
    char = _uid('asleep')
    night = _encounter(1)
    night['when']['phase'] = 'night'
    night['data']['check'] = {'skill': 'perception'}
    _open(client, char, [night])
    item = _perceived(char)
    assert item['perception'] == 'unnoticed'
    assert _relations(char) == {}


def test_contradicting_evidence_pays_resistance(client):
    """A stubborn mind (resistance .9): what confirms the hatred enters
    whole; what contradicts it is damped to a trickle."""
    slug = _preset_with(leans=[
        {'subject': 'tag:entity_type:dwarves', 'affection': -0.6},
    ])
    char = _uid('stubborn')
    _open(client, char, [{'type': 'travel', 'when': {'episode': 1},
                          'data': {}}], preset=slug)
    session = SessionLocal()
    mind = session.query(Mind).filter_by(character_id=char).one()
    mind.personality = {'resistance': 0.9}
    session.commit()
    session.close()

    _open_and_close(client, char, 'd2', [
        _encounter(2, entity='dwarves_of_erebor', family=None,
                   etype='dwarves', form='aid_or_trade'),
    ])
    rels = _relations(char)
    # The primary (THAT company, fresh row, standing 0) takes the whole
    # delta — nothing to contradict yet.
    assert rels['entity:dwarves_of_erebor']['trust'] == pytest.approx(
        0.15, abs=0.01)
    # The category pays splash AND resistance: the +aff splash (.0225)
    # contradicts the standing -.6 — only a tenth of it lands; +trust
    # splash meets standing 0 and lands whole.
    cat = rels['tag:entity_type:dwarves']
    assert cat['affection'] == pytest.approx(
        (-0.6 + 0.075 * 0.3 * 0.1) * 0.98, abs=0.01)
    assert cat['trust'] == pytest.approx(0.15 * 0.3, abs=0.01)


def test_relations_cool_toward_indifference(client):
    """The close tick: unfed sediment shrinks — fear lets go, love stays
    love, and neither crosses its sign."""
    char = _uid('cooling')
    _open_and_close(client, char, 'd1', [_encounter(1)])
    before = _relations(char)['entity:red_foxes']['trust']
    # A quiet day feeds nothing: the close decays the sediment a share.
    _open_and_close(client, char, 'd2', [
        {'type': 'travel', 'when': {'episode': 2, 'date': '1950-01-20'},
         'data': {}},
    ])
    after = _relations(char)['entity:red_foxes']['trust']
    assert 0 < after < before


def test_the_sediment_watches_its_subject(client):
    """A relation loved or feared keeps its subject noticed — the
    sediment IS attention."""
    char = _uid('watcher')
    _open_and_close(client, char, 'd1', [_encounter(1)])

    session = SessionLocal()
    mind = session.query(Mind).filter_by(character_id=char).one()
    from app.mind.boosts import effective_theme_weights
    weights = effective_theme_weights(session, mind)
    session.close()
    # trust .15 -> the foxes' tags gain attention from the relation.
    assert weights.get('entity:red_foxes', 0) > 0


def test_stanced_belief_leaves_a_conviction_memory(client):
    """The seed lands three ways (ADR 0017 · B): the written conviction
    (Belief), its numeric shadow (Relation), and the impression of
    having always held it — a conviction Memory that never rots and
    echoes its imprint back when evoked."""
    slug = _preset_with(beliefs=[
        {'kind': 'other', 'statement': 'I do not trust dwarves',
         'strength': 3, 'tags': [], 'boosts': {},
         'subject': ['tag:entity_type:dwarves'], 'stance': -0.6,
         'source': 'heard'},
    ])
    char = _uid('convict')
    _open(client, char, [{'type': 'travel', 'when': {'episode': 1},
                          'data': {}}], preset=slug)

    session = SessionLocal()
    mem = (
        session.query(Memory)
        .filter_by(character_id=char, kind='conviction')
        .one()
    )
    assert mem.desc == 'I do not trust dwarves'
    assert mem.depth == 'conviction'
    assert mem.mutable is True
    assert mem.consolidated is True
    assert mem.imprint == {'affection': -0.6}
    assert mem.subjects == ['tag:entity_type:dwarves']
    assert mem.feeling
    session.close()

    # Quiet episodes pass: the conviction is not a volatile impression —
    # forgetting never eats it.
    for ep in (2, 3, 4, 5):
        _open_and_close(client, char, f'd{ep}', [
            {'type': 'travel',
             'when': {'episode': ep, 'date': f'1950-01-{18 + ep:02d}'},
             'data': {}},
        ])
    session = SessionLocal()
    still = (
        session.query(Memory)
        .filter_by(character_id=char, kind='conviction')
        .one()
    )
    assert still.strength == 1.0
    session.close()


def test_evocation_refeeds_the_relation(client):
    """The loop closes: meeting the foxes again stirs yesterday's
    memory, and its imprint lands on the Relation a second time —
    smaller (EVOKE_SHARE), through the same sediment rule."""
    char = _uid('echo')
    _open_and_close(client, char, 'd1', [_encounter(1)])
    day1 = _relations(char)['entity:red_foxes']['trust']
    _open_and_close(client, char, 'd2', [_encounter(2)])
    day2 = _relations(char)['entity:red_foxes']['trust']
    # Without the echo: (day1 + .15) * .98 ≈ .29. With it, the evoked
    # imprint (.15 x .3 = .045) feeds again -> ~.33.
    assert day2 > day1 + 0.15
    assert day2 == pytest.approx(
        (day1 / 0.98 + 0.15 + 0.15 * 0.3) * 0.98, abs=0.02)


def test_sighted_far_barely_touches(client):
    """A city glimpsed from afar is a sighting, not contact — its
    Relation accretes a sighting's share, not a visit's."""
    char = _uid('far')
    _open_and_close(client, char, 'd1', [{
        'type': 'place',
        'when': {'phase': 'morning'},
        'where': {'region': 'Rhovanion'},
        'data': {'place': 'esgaroth', 'kind': 'town', 'sighted_far': True,
                 'tags': ['settlement']},
    }])
    rel = _relation(char, 'tag:place:esgaroth')
    assert rel is not None
    assert rel['familiarity'] < 0.05  # a glimpse, not an entry
