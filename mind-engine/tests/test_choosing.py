# Choosing (ADR-0019) — the Mind prefers among feasible Interactions.
# Needs pull, Relations lean, the Personality coupling tempers the draw.
import random
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.db import SessionLocal
from app.mind.choosing import choose, _act_relation_bias, _temperature
from app.mind.tables import Mind, Need, Relation


GAME = 'choose_test'


def _uid():
    return f'c-{uuid.uuid4().hex[:8]}'


def _mind(char_id, variability=None):
    personality = {} if variability is None else {'choice_variability': variability}
    return Mind(game_id=GAME, character_id=char_id,
                preset_slug='test', personality=personality)


def _need(char_id, key, urgency):
    return Need(game_id=GAME, character_id=char_id, key=key,
                type='physiological', description=key, urgency=urgency)


def _opt(iid, act=None, tags=None, p=None):
    o = {'interaction_id': iid, 'act': act, 'need_tags': tags or []}
    if p is not None:
        o['p_success'] = p
    return o


def _sit(opts, subject='npc:hallas'):
    return {'situation_id': 'cnt:x:sit', 'subject': subject, 'options': opts}


def test_single_option_is_picked():
    s = SessionLocal()
    char = _uid()
    out = choose(s, _mind(char), GAME, char, [_sit([_opt('a:rest', 'rest')])])
    assert out['choices'][0]['interaction_id'] == 'a:rest'


def test_open_need_pulls_matching_tag():
    s = SessionLocal()
    char = _uid()
    s.add(_need(char, 'exhaustion', 0.9))
    s.commit()
    out = choose(
        s, _mind(char, variability=0.0), GAME, char,
        [_sit([_opt('x:walk', 'avoid'), _opt('x:stay', 'rest', ['need:exhaustion'])])],
        rng=random.Random(1),
    )
    pick = out['choices'][0]
    assert pick['interaction_id'] == 'x:stay'
    assert pick['parts']['need'] > 0


def test_fear_biases_away_acts():
    s = SessionLocal()
    char = _uid()
    s.add(Relation(game_id=GAME, character_id=char, subject='npc:hallas',
                   affection=-0.2, trust=-0.4, fear=0.9, familiarity=0.1))
    s.commit()
    out = choose(
        s, _mind(char, variability=0.0), GAME, char,
        [_sit([_opt('x:talk', 'talk'), _opt('x:walk', 'avoid')])],
        rng=random.Random(1),
    )
    assert out['choices'][0]['interaction_id'] == 'x:walk'


def test_warmth_biases_toward_acts():
    s = SessionLocal()
    char = _uid()
    s.add(Relation(game_id=GAME, character_id=char, subject='npc:hallas',
                   affection=0.8, trust=0.7, fear=0.0, familiarity=0.6))
    s.commit()
    out = choose(
        s, _mind(char, variability=0.0), GAME, char,
        [_sit([_opt('x:talk', 'talk'), _opt('x:walk', 'avoid')])],
        rng=random.Random(1),
    )
    assert out['choices'][0]['interaction_id'] == 'x:talk'


def test_variability_zero_is_argmax():
    s = SessionLocal()
    char = _uid()
    s.add(_need(char, 'exhaustion', 0.9))
    s.commit()
    rng = random.Random(7)
    picks = set()
    for _ in range(30):
        out = choose(
            s, _mind(char, variability=0.0), GAME, char,
            [_sit([_opt('x:a', 'rest', ['need:exhaustion']), _opt('x:b', 'avoid')])],
            rng=rng,
        )
        picks.add(out['choices'][0]['interaction_id'])
    assert picks == {'x:a'}  # higher score wins every draw


def test_variability_one_flattens_the_draw():
    s = SessionLocal()
    char = _uid()
    s.add(_need(char, 'exhaustion', 0.9))
    s.commit()
    rng = random.Random(7)
    picks = set()
    for _ in range(60):
        out = choose(
            s, _mind(char, variability=1.0), GAME, char,
            [_sit([_opt('x:a', 'rest', ['need:exhaustion']), _opt('x:b', 'avoid')])],
            rng=rng,
        )
        picks.add(out['choices'][0]['interaction_id'])
    assert picks == {'x:a', 'x:b'}  # the flat draw lets the loser through


def test_p_success_dampens():
    s = SessionLocal()
    char = _uid()
    s.add(_need(char, 'exhaustion', 0.9))
    s.commit()
    out = choose(
        s, _mind(char, variability=0.0), GAME, char,
        [_sit([
            _opt('x:risky', 'rest', ['need:exhaustion'], p=0.05),
            _opt('x:safe', 'rest', ['need:exhaustion'], p=1.0),
        ])],
        rng=random.Random(1),
    )
    assert out['choices'][0]['interaction_id'] == 'x:safe'


def test_mindless_still_chooses():
    s = SessionLocal()
    char = _uid()
    out = choose(s, None, GAME, char,
                 [_sit([_opt('a:x', 'rest'), _opt('a:y', 'avoid')]),
                  _sit([], subject=None)])
    assert out['choices'][0]['interaction_id'] in ('a:x', 'a:y')
    assert out['choices'][1]['interaction_id'] is None


def test_temperature_reads_the_coupling():
    assert _temperature(_mind('c', variability=0.0)) < _temperature(_mind('c', variability=1.0))
    assert _temperature(_mind('c')) == _temperature(_mind('c', variability=0.5))


def test_act_relation_bias():
    class Warm:
        affection = trust = 1.0
        fear = 0.0

    class Feared:
        affection = trust = 0.0
        fear = 1.0

    assert _act_relation_bias('talk', Warm()) > 0
    assert _act_relation_bias('rest', Warm()) == 0
    assert _act_relation_bias('talk', Feared()) < 0
    assert _act_relation_bias('avoid', Feared()) > 0
    assert _act_relation_bias('talk', None) == 0


# ---------------------------------------------------------------------------
# POST /mind/minds/{character_id}/choose — the wire
# ---------------------------------------------------------------------------

@pytest.fixture()
def client():
    return TestClient(main_module.app)


def test_choose_route_picks_one_per_situation(client):
    char = _uid()
    res = client.post(
        f'/mind/minds/{char}/choose',
        json={
            'game_id': GAME,
            'choices': [{
                'situation_id': 'cnt:x:sit',
                'subject': 'npc:hallas',
                'options': [
                    {'interaction_id': 'cnt:x:sit:stay', 'act': 'rest',
                     'need_tags': ['need:exhaustion']},
                    {'interaction_id': 'cnt:x:sit:walk', 'act': 'avoid'},
                ],
            }],
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert 0 < body['temperature'] <= 2.0
    pick = body['choices'][0]
    assert pick['interaction_id'] in ('cnt:x:sit:stay', 'cnt:x:sit:walk')
    assert {w['interaction_id'] for w in pick['weights']} == {
        'cnt:x:sit:stay', 'cnt:x:sit:walk'}


def test_choose_route_empty_options_reports_reason(client):
    res = client.post(
        f'/mind/minds/{_uid()}/choose',
        json={'game_id': GAME,
              'choices': [{'situation_id': 's:empty', 'options': []}]},
    )
    assert res.status_code == 200
    pick = res.json()['choices'][0]
    assert pick['interaction_id'] is None
    assert pick['reason'] == 'no feasible options'


def test_choose_route_unknown_mind_still_answers(client):
    res = client.post(
        '/mind/minds/no-such-character/choose',
        json={'game_id': GAME,
              'choices': [{'situation_id': 's:1', 'options': [
                  {'interaction_id': 'i:1'}]}]},
    )
    assert res.status_code == 200
    assert res.json()['choices'][0]['interaction_id'] == 'i:1'
