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


def test_a_meal_feeds_the_food_itself(client):
    """The mushrooms are a subject: the day's comfort lands on THEM
    (primary), the land only hears the splash — 'she came to love the
    mushrooms', not 'she came to love Rhovanion's mushrooms'."""
    char = _uid('mushroom')
    _open_and_close(client, char, 'd1', [{
        'type': 'meal',
        'when': {'episode': 1, 'date': '1950-01-19'},
        'where': {'region': 'Rhovanion'},
        'data': {'food': 'mushrooms', 'drink': 'ale',
                 'reading': 'mushrooms fried in butter'},
    }])
    rels = _relations(char)
    assert 'tag:food:mushrooms' in rels
    # type:meal {aff .15} x .4 + tag:food:* {aff .1} x .3 = .09 on the
    # food (primary); drink and land hear only the splash, in equal
    # share.
    food = rels['tag:food:mushrooms']['affection']
    assert food > rels['tag:drink:ale']['affection']
    assert food > rels['region:Rhovanion']['affection']


def test_monotony_sours_the_daily_bread(client):
    """The same bread every day wears on the bread itself: the streak's
    pressure sediments negative affection on the food's Relation. A
    bread that comforted early on resists (the standing Relation dams
    the wear through the same contradiction mechanism as any evidence),
    but the curve turns — 'the fruit-bread again' starts becoming
    'the fruit-bread, ugh'."""
    char = _uid('soured')
    curve = []
    for ep in range(1, 7):
        _open_and_close(client, char, f'd{ep}', [{
            'type': 'meal',
            'when': {'episode': ep, 'date': f'1950-01-{18 + ep:02d}'},
            'data': {'food': 'fruit-bread',
                     'reading': 'fruit-bread again'},
        }])
        curve.append(
            _relation(char, 'tag:food:fruit-bread')['affection'])
    # Growth while the bread is still a comfort (days 1-3), then the
    # streak's sediment eats the climb back — the wear wins the trend.
    assert curve[2] > curve[0]
    assert curve[5] < curve[3]


def test_the_place_accretes_its_own_relation(client):
    """Esgaroth is a subject apart from Rhovanion: seeing it and
    sleeping there feed 'tag:place:esgaroth' — the town, not the land."""
    char = _uid('esgaroth')
    _open_and_close(client, char, 'd1', [{
        'type': 'land',
        'when': {'phase': 'morning'},
        'where': {'region': 'Rhovanion'},
        'data': {'subtype': 'place', 'place': 'esgaroth', 'kind': 'town',
                 'tags': ['settlement', 'sighted'],
                 'reading': 'Esgaroth on the lake'},
    }])
    rel = _relation(char, 'tag:place:esgaroth')
    assert rel is not None
    assert rel['familiarity'] > 0
    # The kind accretes too — 'towns' as a category (a lower shelf).
    kind = _relation(char, 'tag:kind:town')
    assert kind is not None
    assert kind['familiarity'] < rel['familiarity']


def test_the_standing_self_speaks_in_scene(client, monkeypatch):
    """A mind that has met orcs carries them — and the fear SPEAKS where
    the world touches it: the narrated prompt's afternoon block carries
    the disposition, the lens header does not. Nothing floats."""
    import app.narrate_day as narrate_module
    monkeypatch.setattr(
        narrate_module, 'generate_narrative',
        lambda *a, **k: {
            'text': 'narrated', 'ia_provider': 'test',
            'temperature': 0.7, 'frequency_penalty': 0.0,
            'presence_penalty': 0.0, 'top_p': 1.0,
        },
    )
    char = _uid('inscene')
    _open_and_close(client, char, 'd1', [{
        'type': 'encounter',
        'when': {'phase': 'afternoon'},
        'data': {'entity': 'orcs', 'entity_type': 'orcs',
                 'form': 'attacks', 'danger': 3,
                 'reading': 'orcs — attacked without warning'},
    }])
    r = client.post('/episodes', json={
        'game_id': 'middle_earth', 'character': {'id': char},
        'episode_ref': 'd2',
        'episode': {'index': 2, 'at': '1950-01-21'},
        'events': [{
            'type': 'encounter',
            'when': {'phase': 'afternoon'},
            'data': {'entity': 'orcs', 'entity_type': 'orcs',
                     'form': 'drifts_closer',
                     'reading': 'orc-sign in the mud by the water'},
        }],
    })
    assert r.status_code == 200, r.text
    ep_id = r.json()['episode_id']
    r = client.post(f"/episodes/{ep_id}/narrate", json={})
    assert r.status_code == 200, r.text
    user = r.json()['prompt']['user']
    assert 'What the world has made of them' not in user
    assert user.index('feared, and hated for it') > user.index('drifts_closer'), user


def test_an_untouched_disposition_waits_for_the_quietest_hour(client):
    """The fear no event touches is not dropped: it speaks in the day's
    emptiest hour — the camp night, where reflection lives."""
    from app.mind.lens import disposition_beats
    disps = [{'subject': 'entity:orcs',
              'line': 'orcs tighten their chest before they mean to'}]
    items = [
        {'when': {'phase': 'morning'}, 'subjects': ['tag:food:bread']},
        {'when': {'phase': 'afternoon'},
         'subjects': ['tag:place:old_ford', 'region:rhovanion']},
    ]
    beats = disposition_beats(disps, items)
    assert list(beats) == ['night']


def test_the_day_turns_at_the_ford(client):
    """A kind morning and a grim afternoon: the arc carries both — the
    day is not one number — and the turn names the afternoon and what
    darkened it."""
    char = _uid('turn')
    opened, _ = _open_and_close(client, char, 'd1', [
        {
            'type': 'meal',
            'when': {'phase': 'morning'},
            'data': {'food': 'mushrooms',
                     'reading': 'mushrooms fried in butter'},
        },
        {
            'type': 'encounter',
            'when': {'phase': 'afternoon'},
            'where': {'region': 'Rhovanion', 'place': 'old_ford'},
            'data': {'entity': 'orcs', 'entity_type': 'orcs',
                     'form': 'attacks', 'danger': 3,
                     'reading': 'orcs — attacked without warning'},
        },
    ])
    mood = _episode_mood(char)
    arc = mood.get('arc') or []
    assert [p['phase'] for p in arc] == ['morning', 'afternoon']
    assert arc[0]['valence'] > 0 > arc[1]['valence']
    turn = mood.get('turn')
    assert turn is not None
    assert turn['phase'] == 'afternoon'
    assert turn['cause'] == 'orcs — attacked without warning'
    # And it ships: the packet's day_mood carries the plot to the
    # narrator ('mood' stays the running mood — how she stands now).
    day_mood = opened['psyche_packet']['day_mood']
    assert day_mood['turn']['phase'] == 'afternoon'
    assert len(day_mood['arc']) == 2


def test_what_happened_at_a_place_marks_the_place(client):
    """The orcs attacked AT the ford: 'where.place' makes the ford a
    secondary subject — it hears a splash of the meeting's fear, not
    the full share the orcs get. You do not hate the ford like the
    orcs, but you cross it warier."""
    char = _uid('fordmark')
    _open_and_close(client, char, 'd1', [{
        'type': 'encounter',
        'when': {'phase': 'afternoon'},
        'where': {'region': 'Rhovanion', 'place': 'old_ford'},
        'data': {'entity': 'orcs', 'entity_type': 'orcs',
                 'form': 'attacks', 'danger': 3,
                 'reading': 'orcs — attacked without warning'},
    }])
    orcs = _relation(char, 'entity:orcs')
    ford = _relation(char, 'tag:place:old_ford')
    assert orcs['fear'] > 0.3
    assert 0 < ford['fear'] < orcs['fear']
    # The splash is a share, not a copy — the place is marked, not blamed.
    assert ford['fear'] == pytest.approx(orcs['fear'] * 0.3, abs=0.05)


def test_sighted_far_barely_touches(client):
    """A city glimpsed from afar is a sighting, not contact — its
    Relation accretes a sighting's share, not a visit's."""
    char = _uid('far')
    _open_and_close(client, char, 'd1', [{
        'type': 'land',
        'when': {'phase': 'morning'},
        'where': {'region': 'Rhovanion'},
        'data': {'subtype': 'place', 'place': 'esgaroth', 'kind': 'town',
                 'sighted_far': True, 'tags': ['settlement']},
    }])
    rel = _relation(char, 'tag:place:esgaroth')
    assert rel is not None
    assert rel['familiarity'] < 0.05  # a glimpse, not an entry


def _session_with_relations(char, *rels):
    session = SessionLocal()
    for r in rels:
        session.add(Relation(
            game_id='middle_earth', character_id=char, **r))
    session.flush()
    return session


def test_the_fresh_fear_outranks_the_saturated_gear():
    """The weight of the experience: a fear the road fed yesterday
    speaks ahead of a fondness that sedimented long ago — the daily
    waterskin should not outrank the troll."""
    from types import SimpleNamespace

    from app.mind.lens import inner_lines
    char = _uid('weight')
    session = _session_with_relations(
        char,
        {'subject': 'tag:drink:waterskin', 'feeling': 'fondness',
         'affection': 0.98, 'last_fed_episode': 3},
        {'subject': 'entity:cave_trolls', 'feeling': 'fear',
         'fear': 0.53, 'last_fed_episode': 9},
    )
    lines = inner_lines(
        session, SimpleNamespace(character_id=char), as_of_episode=10)
    assert lines[0]['subject'] == 'entity:cave_trolls'
    session.rollback()
    session.close()


def test_what_already_spoke_rests_a_few_days():
    """A disposition the prompt already voiced is damped — the same
    warmth does not narrate every chapter."""
    from types import SimpleNamespace

    from app.mind.lens import inner_lines
    char = _uid('said')
    session = _session_with_relations(
        char,
        {'subject': 'tag:food:road_bread', 'feeling': 'fondness',
         'affection': 0.9, 'last_surfaced_episode': 9},
        {'subject': 'tag:drink:good_ale', 'feeling': 'fondness',
         'affection': 0.6},
    )
    lines = inner_lines(
        session, SimpleNamespace(character_id=char), as_of_episode=10)
    assert lines[0]['subject'] == 'tag:drink:good_ale'
    session.rollback()
    session.close()


def test_the_prompt_marks_what_it_voiced():
    """_merged_beats records last_surfaced_episode on every disposition
    it handed the narrator — feeding the rest above. Idempotent under
    re-narration of the same episode."""
    from types import SimpleNamespace

    from app.mind.routes import _merged_beats
    char = _uid('surfaced')
    session = _session_with_relations(
        char,
        {'subject': 'tag:drink:waterskin', 'feeling': 'fondness',
         'affection': 0.9},
    )
    episode = SimpleNamespace(
        brief=None, perceived_day=[], episode_idx=10)
    _merged_beats(session, episode, SimpleNamespace(character_id=char))
    rel = session.query(Relation).filter_by(
        character_id=char, subject='tag:drink:waterskin').one()
    assert rel.last_surfaced_episode == 10
    session.rollback()
    session.close()
