# ============================================================================
# Kind Registry (#167) — the declared contract of event types
# ----------------------------------------------------------------------------
# The registry ('mind.kinds' pack key over built-in defaults) declares
# each event type's role (frame|moment|voice), source
# (world|ambient|mind|decision), reading strategy and flags. New kinds
# are data: the engine reads the registry, never branches on type names.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.db import SessionLocal
from app.mind.focus import build_brief
from app.mind.kinds import (
    KINDS_KEY, kind_of, kinds, is_mind_item,
)
from app.mind.needs import need_items
from app.mind.tables import PackEntry
from app.mind.voice import invalidate_entries, resolve_event_reading


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _event(reading, salience, phase=None, tags=(), type_='encounter'):
    return {
        'type': type_, 'reading': reading, 'salience': salience,
        'when': {'phase': phase} if phase else {}, 'tags': list(tags),
        'perception': 'noticed',
    }


class _Pack:
    """A 'mind.kinds' row for a throwaway game — cleaned up on exit."""

    def __init__(self, entry):
        self.game = _uid('kinds-game')
        self.session = SessionLocal()
        self.session.add(PackEntry(
            game_id=self.game, key=KINDS_KEY, value=entry, enabled=True))
        self.session.commit()
        invalidate_entries(self.game)

    def close(self):
        self.session.query(PackEntry).filter_by(game_id=self.game).delete()
        self.session.commit()
        invalidate_entries(self.game)
        self.session.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()


# ---------------------------------------------------------------------------
# The registry itself
# ---------------------------------------------------------------------------

def test_undeclared_kinds_are_worldly_moments():
    """The contract's open door: a kind nobody declared is a worldly
    moment whose words are the host's reading or the subject's name."""
    entry = kind_of(None, None, 'zorglub')
    assert entry['role'] == 'moment'
    assert entry['source'] == 'world'
    assert entry['reading'] == 'declared'


def test_moment_is_ambience_now():
    """#158 renamed the world's voice 'moment' → 'ambience'; perceived
    items and hosts still sending 'moment' resolve to the same entry."""
    assert kind_of(None, None, 'moment') == kind_of(None, None, 'ambience')
    assert 'moment' not in kinds()


def test_pack_overrides_merge_per_key():
    """A 'mind.kinds' row declares only what it changes: 'meal' made a
    frame kind keeps its reading strategy — entries merge, not replace."""
    with _Pack({'meal': {'role': 'frame'},
                'omen': {'role': 'frame', 'source': 'ambient',
                         'reading': 'declared'}}) as pack:
        meal = kind_of(pack.session, pack.game, 'meal')
        assert meal['role'] == 'frame'          # the declared override
        assert meal['reading'] == 'meal'         # the inherited default
        omen = kind_of(pack.session, pack.game, 'omen')
        assert omen['role'] == 'frame'
        assert omen['source'] == 'ambient'
        # Other games see the untouched built-ins.
        assert kind_of(None, None, 'meal')['role'] == 'moment'


# ---------------------------------------------------------------------------
# source — items stop pretending to be the world
# ---------------------------------------------------------------------------

def test_source_is_stamped_on_the_perceived_day(client):
    """Every perceived item carries its registry source: the world's
    happenings say 'world', its backdrop says 'ambient'."""
    char = _uid('kind-src')
    r = client.post('/episodes', json={
        'game_id': 'middle_earth', 'character': {'id': char},
        'episode_ref': 'd1',
        'events': [
            {'type': 'climate',
             'when': {'episode': 1},
             'data': {'reading': 'cold drizzle', 'tags': ['weather:wet']}},
            {'type': 'encounter',
             'when': {'episode': 1},
             'data': {'reading': 'a trader shares the fire',
                      'tags': ['entity_type:humans']}},
        ],
    })
    assert r.status_code == 200, r.text
    day = r.json()['psyche_packet']['perceived_day']
    by_type = {i['type']: i for i in day}
    assert by_type['climate']['source'] == 'ambient'
    assert by_type['encounter']['source'] == 'world'


def test_the_minds_own_items_say_so():
    """Needs and recurrence are 'mind' source — bookkeeping that speaks
    but is never world-evidence (no streaks, no reflection spikes)."""
    assert is_mind_item({'type': 'need'})
    assert is_mind_item({'type': 'recurrence'})
    assert is_mind_item({'type': 'omen', 'source': 'mind'})
    assert not is_mind_item({'type': 'encounter', 'source': 'world'})
    assert not is_mind_item(None)
    # Stamped at creation too — no registry lookup needed downstream.
    needs = [type('N', (), {
        'type': 'physiological', 'key': 'hunger', 'urgency': 0.7,
        'description': 'the hunger',
    })()]
    item = need_items(needs)[0]
    assert item['source'] == 'mind'
    assert item['mood_cause'] is False


def test_a_registry_declared_frame_never_takes_the_focus():
    """Focus eligibility is a declaration, not an engine branch: an
    'omen' kind the pack frames keeps its reading but earns no moment."""
    with _Pack({'omen': {'role': 'frame', 'source': 'ambient'}}) as pack:
        day = [
            _event('a black bird circles the camp thrice', 0.9,
                   'afternoon', type_='omen'),
            _event('a warm meal at the inn', 0.6, 'night',
                   ['type:meal', 'tag:food:stew'], type_='meal'),
        ]
        brief = build_brief(day, [], [], [], {}, episode_idx=0,
                            session=pack.session, game_id=pack.game)
        focus = brief.get('focus') or {}
        assert 'bird' not in (focus.get('text') or '')
        day_texts = [
            l.get('text', '') for lines in brief.get('day', {}).values()
            for l in lines
        ] if isinstance(brief.get('day'), dict) else []
        assert not any('bird' in t for t in day_texts)


def test_undeclared_kinds_still_speak_their_subject():
    """Before the registry, undeclared kinds already fell back to the
    subject's name — the contract is unchanged, now it is declared."""
    assert resolve_event_reading(
        {'type': 'zorglub', 'data': {'name': 'Zorglub Pass'}},
    ) == 'Zorglub Pass'


def test_a_pack_kind_can_be_silent():
    """'reading': 'silent' — the kind speaks through other channels, the
    same way mileage does. Still data, still no engine branch."""
    with _Pack({'omen': {'reading': 'silent'}}) as pack:
        assert resolve_event_reading(
            {'type': 'omen', 'data': {'name': 'a black bird'}},
            session=pack.session, game_id=pack.game,
        ) is None
        # A host-declared reading always wins, even over 'silent'.
        assert resolve_event_reading(
            {'type': 'omen',
             'data': {'name': 'a black bird', 'reading': 'an ill omen'}},
            session=pack.session, game_id=pack.game,
        ) == 'an ill omen'


# ---------------------------------------------------------------------------
# needs keep their own voice out of the day's cause
# ---------------------------------------------------------------------------

def test_the_hunger_is_not_the_days_cause():
    """mood_cause honors the registry flag: a starving need outranks any
    event yet 'the hunger' is the lens's own voice, not the day's cause."""
    from app.mind.lens import mood_cause
    perceived = [
        {'type': 'need', 'source': 'mind', 'mood_cause': False,
         'reading': 'the hunger gnaws', 'valence': -0.9, 'salience': 0.9},
        {'type': 'encounter', 'source': 'world',
         'reading': 'orc boots, a pursuit gait',
         'valence': -0.5, 'salience': 0.5},
    ]
    cause = mood_cause(perceived)
    assert cause['reading'] == 'orc boots, a pursuit gait'


# ---------------------------------------------------------------------------
# kinds() returns the merged registry
# ---------------------------------------------------------------------------

def test_the_registry_lists_every_known_kind():
    registry = kinds()
    for expected in ('climate', 'terrain', 'land', 'water', 'travel',
                     'body', 'encounter', 'contact', 'meal', 'rest',
                     'note', 'place', 'ambience', 'need', 'recurrence'):
        assert expected in registry, expected
        entry = registry[expected]
        assert entry['role'] in ('frame', 'moment', 'voice')
        assert entry['source'] in ('world', 'ambient', 'mind', 'decision')
