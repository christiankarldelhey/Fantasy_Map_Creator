# ============================================================================
# Attitudes — the prehistory every encounter carries (CONTEXT.md · Attitude)
# ----------------------------------------------------------------------------
# A Belief with Subject + Stance: it colours how an encounter feels
# (attitude_affect_gain), adds attention to the subject's tags
# (attitude_attention_gain), and at close its stance drifts by how the
# encounter went IN THE WORLD — slowly for ordinary days, a big step for
# marked ones. Narrowest subject wins (entity > family > type) and the
# stance never crosses zero on drift: turning a prejudice is the
# reflection's work.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.db import SessionLocal
from app.mind.attitudes import attitude_for, is_attitude
from app.mind.boosts import effective_theme_weights
from app.mind.reflection import _apply_ops
from app.mind.tables import (
    Belief, Brain, BrainMold, Episode, MoldStarterBelief,
)


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _open(client, char, events, ref='d1', brain_profile=None):
    character = {'id': char}
    if brain_profile:
        character['brain_profile'] = brain_profile
    r = client.post('/episodes', json={
        'game_id': 'middle_earth', 'character': character,
        'episode_ref': ref, 'events': events, 'day': {},
    })
    assert r.status_code == 200, r.text
    return r.json()


def _open_and_close(client, char, ref, events, brain_profile=None):
    opened = _open(client, char, events, ref, brain_profile)
    c = client.post(f"/episodes/{opened['episode_id']}/close", json={})
    assert c.status_code == 200, c.text
    return opened, c.json()


def _encounter(ep, entity='foxes', family='foxes', etype='carnivores',
               form='reacts_withdraws', outcome=None, danger=None):
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


def _brain(char):
    session = SessionLocal()
    brain = session.query(Brain).filter_by(character_id=char).one()
    session.expunge(brain)
    session.close()
    return brain


def _beliefs(char):
    session = SessionLocal()
    rows = (
        session.query(Belief).filter_by(character_id=char)
        .order_by(Belief.statement).all()
    )
    for r in rows:
        session.expunge(r)
    session.close()
    return rows


def _add_attitude(char, subject, stance, statement='A feeling', **facets):
    session = SessionLocal()
    b = Belief(
        game_id='middle_earth', character_id=char, kind='world',
        statement=statement, confidence=0.6, tags=[], boosts={},
        evidence=[], origin='seed', status='active',
        subject=list(subject), stance=stance,
        source=facets.pop('source', 'lived'), **facets,
    )
    session.add(b)
    session.commit()
    bid = b.id
    session.close()
    return bid


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


def _new_brain(char):
    session = SessionLocal()
    session.add(Brain(
        game_id='middle_earth', character_id=char, mold_slug='x',
        theme_weights={}, wiring={}, mood={}, counters={},
    ))
    session.commit()
    session.close()


def test_provisioning_clones_every_facet(client):
    """A mold's starter belief carries subject/stance/source/pull/habit
    into the brain's copy — a belief without them stays a plain thought."""
    session = SessionLocal()
    slug = _uid('faceted')
    mold = BrainMold(game_id='middle_earth', slug=slug, name='Faceted')
    session.add(mold)
    session.flush()
    session.add(MoldStarterBelief(
        mold_id=mold.id, kind='world', statement='Foxes are kin',
        confidence=0.6, tags=[], boosts={},
        subject=['tag:family:foxes'], stance=0.6, source='lived',
        pull={'field': 'shadow', 'direction': 'up'},
        habit={'resource': 'pipe-weed'},
    ))
    session.add(MoldStarterBelief(
        mold_id=mold.id, kind='self', statement='I keep my own counsel',
        confidence=0.6, tags=['context:solitude'], boosts={},
    ))
    session.commit()
    session.close()

    char = _uid('clone')
    _open(client, char, [_encounter(1)], brain_profile=slug)
    faceted, plain = _beliefs(char)

    assert faceted.subject == ['tag:family:foxes']
    assert faceted.stance == 0.6
    assert faceted.source == 'lived'
    assert faceted.pull == {'field': 'shadow', 'direction': 'up'}
    assert faceted.habit == {'resource': 'pipe-weed'}
    assert is_attitude(faceted)

    assert plain.subject is None and plain.stance is None
    assert not is_attitude(plain)


def test_narrowest_subject_speaks_for_the_encounter():
    """entity > family > type: Celebrian loves horses, and the horses of
    Mordor are not that."""
    class _B:
        def __init__(self, subject, stance):
            self.subject, self.stance = subject, stance
            self.tags, self.confidence = [], 0.6
    broad = _B(['tag:entity_type:riding_animals'], 0.2)
    family = _B(['tag:family:horses'], 0.7)
    exact = _B(['entity:horses_of_mordor'], -0.8)

    tags = ['entity:horses_of_mordor', 'tag:family:horses',
            'tag:entity_type:riding_animals']
    assert attitude_for(tags, [broad, family, exact]) is exact
    assert attitude_for(tags, [broad, family]) is family
    assert attitude_for(['entity:wild_horses', 'tag:family:horses',
                         'tag:entity_type:riding_animals'],
                        [broad, family, exact]) is family
    # No touch — no attitude.
    assert attitude_for(['entity:orcs', 'tag:entity_type:orcs'],
                        [family]) is None


def test_stance_colours_how_the_encounter_feels(client):
    """reacts_withdraws reads +0.1 in the world; a mind that loves foxes
    feels it at 0.1 + 0.6*0.5 = +0.4."""
    char = _uid('foxlove')
    _new_brain(char)
    bid = _add_attitude(char, ['tag:family:foxes'], 0.6, 'Foxes are kin')
    _open_and_close(client, char, 'd1', [_encounter(1)])

    item = _perceived(char)
    assert item['world_valence'] == pytest.approx(0.1)
    assert item['valence'] == pytest.approx(0.4)
    assert item['attitude'] == bid


def test_host_valence_leaves_the_attitude_out(client):
    """A host-declared valence owns the feeling entirely — no lean, no
    recorded prehistory to move."""
    char = _uid('hostvox')
    _new_brain(char)
    _add_attitude(char, ['tag:family:foxes'], 0.6)
    event = _encounter(1)
    event['data']['valence'] = -0.9
    _open_and_close(client, char, 'd1', [event])

    item = _perceived(char)
    assert item['valence'] == -0.9
    assert 'attitude' not in item


def test_attitudes_watch_what_they_love_or_loathe():
    """|stance| adds attention to the subject's tags — love and loathing
    both keep their eyes open."""
    char = _uid('watcher')
    session = SessionLocal()
    session.add(Brain(
        game_id='middle_earth', character_id=char, mold_slug='x',
        theme_weights={'tag:family:foxes': 0.1}, wiring={}, mood={},
        counters={},
    ))
    session.flush()
    brain = session.query(Brain).filter_by(character_id=char).one()
    session.add(Belief(
        game_id='middle_earth', character_id=char, kind='world',
        statement='Foxes are kin', confidence=0.6, tags=[], boosts={},
        evidence=[], origin='seed', status='active',
        subject=['tag:family:foxes'], stance=0.6,
    ))
    session.add(Belief(
        game_id='middle_earth', character_id=char, kind='world',
        statement='Wargs took the coin', confidence=0.6, tags=[],
        boosts={}, evidence=[], origin='seed', status='active',
        subject=['tag:family:wargs'], stance=-0.8,
    ))
    session.commit()
    weights = effective_theme_weights(session, brain)
    session.close()

    assert weights['tag:family:foxes'] == pytest.approx(0.1 + 0.6 * 0.3)
    assert weights['tag:family:wargs'] == pytest.approx(0.8 * 0.3)


def test_ordinary_encounter_nudges_the_stance(client):
    """A kind exchange with foxes (world +0.2) walks the love up one
    small step — not a rewrite."""
    char = _uid('nudge')
    _new_brain(char)
    bid = _add_attitude(char, ['tag:family:foxes'], 0.6, 'Foxes are kin')
    _, summary = _open_and_close(client, char, 'd1', [
        _encounter(1, form='aid_or_trade'),
    ])

    assert summary['attitudes_moved'] == [
        {'belief_id': bid, 'from': 0.6, 'to': 0.65},
    ]
    assert _beliefs(char)[0].stance == pytest.approx(0.65)


def test_marked_encounter_moves_the_stance_hard(client):
    """Wounded by the thing you loved (world −0.8): the stance takes the
    marked step down."""
    char = _uid('marked')
    _new_brain(char)
    bid = _add_attitude(char, ['tag:family:foxes'], 0.6, 'Foxes are kin')
    _, summary = _open_and_close(client, char, 'd1', [
        _encounter(1, form='attacks', outcome='wounded', danger=3),
    ])

    assert summary['attitudes_moved'] == [
        {'belief_id': bid, 'from': 0.6, 'to': 0.35},
    ]


def test_the_stance_never_crosses_zero_on_drift(client):
    """A marked kindness can wear a prejudice down to almost nothing —
    turning it is the reflection's work, not one good day."""
    char = _uid('floor')
    _new_brain(char)
    bid = _add_attitude(char, ['tag:entity_type:dwarves'], -0.1,
                      'I keep my distance')
    _, summary = _open_and_close(client, char, 'd1', [
        _encounter(1, entity='dwarves_of_erebor', family=None,
                   etype='dwarves', form='aid_or_trade',
                   outcome='unscathed', danger=0),
    ])

    moved = summary['attitudes_moved']
    assert moved[0]['belief_id'] == bid
    # world +0.3 (aid_or_trade 0.2 + unscathed 0.1) → not marked; a small
    # step up that still must not cross zero.
    assert moved[0]['to'] == pytest.approx(-0.05)
    assert _beliefs(char)[0].stance == pytest.approx(-0.05)


def test_stance_stays_inside_its_bounds(client):
    """Love cannot grow past +1 no matter how good the encounters."""
    char = _uid('bounded')
    _new_brain(char)
    bid = _add_attitude(char, ['tag:family:foxes'], 0.9, 'Foxes are kin')
    _open_and_close(client, char, 'd1', [
        _encounter(1, form='aid_or_trade', outcome='unscathed'),
        _encounter(1, entity='red_foxes', form='aid_or_trade'),
    ])

    assert _beliefs(char)[0].stance == pytest.approx(1.0)
    assert bid == bid  # (the row is the same belief — it moved, not grew)


def test_a_quiet_sighting_moves_nothing(client):
    """'watches' carries no affect — being seen by foxes is not yet an
    experience of foxes."""
    char = _uid('quiet')
    _new_brain(char)
    _add_attitude(char, ['tag:family:foxes'], 0.6)
    _, summary = _open_and_close(client, char, 'd1', [
        _encounter(1, form='watches', danger=0),
    ])

    assert summary['attitudes_moved'] == []
    assert _beliefs(char)[0].stance == 0.6


def test_only_the_narrowest_attitude_line_speaks(client):
    """In the Lens, the horses-of-Mordor attitude answers a Mordor-horse
    encounter; the general love of horses steps back."""
    char = _uid('narrow')
    _new_brain(char)
    _add_attitude(char, ['tag:family:horses'], 0.7,
                  'Horses are the last joy')
    _add_attitude(char, ['entity:horses_of_mordor'], -0.8,
                  'I pity those horses')
    opened = _open(client, char, [
        _encounter(1, entity='horses_of_mordor', family='horses',
                   etype='riding_animals', form='confronts', danger=4),
    ])

    brief = opened['psyche_packet']['brief']
    lines = [
        l for l in brief['carried'] + brief['day']
        if str(l.get('id', '')).startswith('belief:')
    ]
    texts = [l['text'] for l in lines]
    assert 'I pity those horses' in texts
    assert 'Horses are the last joy' not in texts


def test_inverted_belief_keeps_its_facets():
    """When reflection turns a prejudice, the grown belief still knows
    its subject — with the stance turned and 'lived' as its source."""
    char = _uid('turned')
    session = SessionLocal()
    session.add(Brain(
        game_id='middle_earth', character_id=char, mold_slug='x',
        theme_weights={}, wiring={}, mood={}, counters={},
    ))
    session.flush()
    brain = session.query(Brain).filter_by(character_id=char).one()
    old = Belief(
        game_id='middle_earth', character_id=char, kind='other',
        statement='I do not trust dwarves', confidence=0.6,
        tags=['tag:entity_type:dwarves', 'trauma'], boosts={},
        evidence=['m1'], origin='seed', status='active',
        subject=['tag:entity_type:dwarves'], stance=-0.3, source='heard',
        pull={'field': 'shadow', 'direction': 'up'},
    )
    session.add(old)
    session.flush()
    _apply_ops(session, brain, [{
        'op': 'invert', 'belief_id': old.id,
        'statement': 'The mountain folk kept their word when no one '
                     'else did', 'confidence': 0.5,
        'evidence': ['m1'], 'boosts': {},
    }], {old.id: old}, 5, {})
    session.commit()

    grown = (
        session.query(Belief)
        .filter_by(character_id=char, status='active')
        .filter(Belief.id != old.id).one()
    )
    assert grown.subject == ['tag:entity_type:dwarves']
    assert grown.stance == pytest.approx(0.3)
    assert grown.source == 'lived'
    assert grown.pull == {'field': 'shadow', 'direction': 'up'}
    assert grown.tags == ['tag:entity_type:dwarves']  # trauma dropped
    assert old.status == 'inverted'
    session.close()
