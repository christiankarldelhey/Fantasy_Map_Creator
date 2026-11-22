# ============================================================================
# ADR-0016 — agnostic episode wire: canonical fields only
# ----------------------------------------------------------------------------
# The payload speaks episode/arc/condition/events/fate; the legacy
# day/trip_name/character_state/equipment_state fields are gone — and so
# is narration_notes: the world reaches the episode only as events.
# /narrate-day keeps its own contract for the mindless path. The narrator
# payload stores the canonical channels; narrate rebuilds the day's
# per-phase world material from episode.events.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
import app.narrate_day as narrate_module
from app.mind.models import OpenEpisodeRequest
from conftest import open_state


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


TRAVEL_EVENT = {
    'type': 'travel',
    'when': {'phase': 'morning'},
    'data': {'distance_km': 12.0},
}


def test_open_rejects_legacy_fields():
    """The dual-read window is closed: day/trip_name/character_state and
    friends now 422 like any unknown field."""
    import pydantic
    for legacy in ('day', 'trip_name', 'character_state',
                   'equipment_state', 'previous_day', 'recent_day_climates',
                   'world_notes', 'narration_notes'):
        with pytest.raises(pydantic.ValidationError):
            OpenEpisodeRequest(
                game_id='middle_earth',
                character={'id': 'c1'},
                **{legacy: {} if legacy != 'trip_name' else 'x'},
            )


def test_open_accepts_v2_without_day(client):
    """The canonical payload needs no `day`: episode/arc/condition carry
    the frame, the arc name and the live body."""
    char = _uid('v2')
    r = client.post('/episodes', json={
        'game_id': 'middle_earth',
        'character': {'id': char, 'name': 'Tester'},
        'episode_ref': 'v2-d1',
        'language': 'english',
        'episode': {'index': 1, 'at': '3018-03-15'},
        'arc': 'The Long Road North',
        'condition': {'energy': 80, 'rations': 2},
        'events': [TRAVEL_EVENT],
        'fate': 'living',
    })
    assert r.status_code == 200, r.text
    ep = r.json()
    assert ep['episode_id']
    assert open_state(client, ep)['perceived_day']


def test_open_v2_narrate_uses_episode_frame(client, monkeypatch):
    """A v2 episode narrates: the prompt back-fills the frame and reads
    the per-phase world prose from the episode's own events."""
    fake = {
        'text': 'The road went on, and he went with it.',
        'ia_provider': 'test', 'temperature': 0.7,
        'frequency_penalty': 0.0, 'presence_penalty': 0.0, 'top_p': 1.0,
    }
    monkeypatch.setattr(
        narrate_module, 'generate_narrative', lambda *a, **k: fake
    )
    char = _uid('v2n')
    r = client.post('/episodes', json={
        'game_id': 'middle_earth',
        'character': {'id': char, 'name': 'Tester'},
        'episode_ref': 'v2n-d3',
        'episode': {'index': 3, 'at': '3018-03-15'},
        'arc': 'The Long Road North',
        'condition': {'energy': 60},
        'events': [
            TRAVEL_EVENT,
            {
                'type': 'climate',
                'when': {'phase': 'morning'},
                'data': {
                    'reading': 'a thin cold rain, steady since dawn',
                    'tags': ['weather:wet'],
                },
            },
            {
                'type': 'meal',
                'when': {'phase': 'afternoon'},
                'data': {'reading': 'A halt in the lee: salt pork; water.'},
            },
        ],
    })
    assert r.status_code == 200, r.text
    rn = client.post(f"/episodes/{r.json()['episode_id']}/narrate", json={})
    assert rn.status_code == 200, rn.text
    body = rn.json()
    assert body['generation']['text'] == fake['text']
    # The events' readings reached the prompt as the phase's world prose.
    prompt_user = body['prompt']['user']
    assert 'A thin cold rain, steady since dawn.' in prompt_user
    assert 'A halt in the lee: salt pork; water.' in prompt_user


def test_studio_tag_registry_read_only_view(client, monkeypatch):
    """The shared Tag registry is consultable from the Studio API
    (ADR-0016): families with their consumers and values, read-only.
    Asserts on the registry's shape, not the seed's current contents."""
    monkeypatch.setenv('ADMIN_USER', 'u')
    monkeypatch.setenv('ADMIN_PASSWORD', 'p')
    r = client.get('/studio/api/tags', auth=('u', 'p'))
    assert r.status_code == 200, r.text
    families = {f['family']: f for f in r.json()['families']}
    assert families  # the table is seeded
    for fam in families.values():
        assert set(fam) == {
            'family', 'consumers', 'description', 'open', 'values',
        }
        assert isinstance(fam['values'], list)
    # A pattern family surfaces as open-valued; a closed one lists values.
    assert any(f['open'] for f in families.values())
    assert any(f['values'] for f in families.values())


def test_ambience_event_perceives_with_provenance_tags(client):
    """A resolved ambient situation rides as an 'ambience' event (#158):
    the mind perceives its authored reading and derives the record /
    situation provenance tags — 'the same voice again' can connect."""
    char = _uid('ambience')
    r = client.post('/episodes', json={
        'game_id': 'middle_earth',
        'character': {'id': char, 'name': 'Tester'},
        'episode_ref': 'mom-d1',
        'episode': {'index': 1, 'at': '3018-03-15'},
        'events': [{
            'type': 'ambience',
            'when': {},
            'where': {'region': 'Ettenmoors'},
            'data': {
                'record': 'M-A4',
                'situation': 'night-1',
                'name': 'The night',
                'reading': 'the fire lights three paces; the wall makes noise',
            },
        }],
    })
    assert r.status_code == 200, r.text
    item = open_state(client, r.json())['perceived_day'][0]
    assert item['type'] == 'ambience'
    assert item['reading'] == 'the fire lights three paces; the wall makes noise'
    assert 'tag:record:M-A4' in item['tags']
    assert 'tag:situation:night-1' in item['tags']
    assert 'type:ambience' in item['tags']
