# ============================================================================
# ADR-0016 — agnostic episode wire: canonical fields + legacy dual-read
# ----------------------------------------------------------------------------
# The canonical payload speaks episode/arc/condition/world_notes; the
# legacy day/trip_name/character_state/equipment_state fields are folded
# in by _fold_legacy so every consumer reads one shape. The narrator
# payload stores both forms; narrate back-fills the legacy `day` keys
# from the Episode frame.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
import app.narrate_day as narrate_module
from app.mind.models import OpenEpisodeRequest


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


TRAVEL_EVENT = {
    'type': 'travel',
    'when': {'episode': 3, 'date': '1950-01-21', 'phase': 'morning'},
    'data': {'distance_km': 12.0},
}


def test_fold_legacy_fills_canonical_fields():
    """A legacy payload lands already translated: episode frame, arc,
    merged condition and lifted world_notes."""
    req = OpenEpisodeRequest(
        game_id='middle_earth',
        character={'id': 'c1'},
        day={
            'day_number': 4, 'date': '3018-03-15', 'is_last_day': True,
            'world_notes': {'climate_state': 'third day of rain'},
        },
        trip_name='The Long Road North',
        character_state={'energy': 35, 'shadow': 19},
        equipment_state={'rations': 2},
    )
    assert req.episode is not None
    assert req.episode.index == 4
    assert req.episode.at == '3018-03-15'
    assert req.episode.terminal is True
    assert req.arc == 'The Long Road North'
    assert req.condition == {'energy': 35, 'shadow': 19, 'rations': 2}
    assert req.world_notes == {'climate_state': 'third day of rain'}


def test_fold_legacy_explicit_canonical_wins():
    """Canonical fields the caller set are never overwritten by legacy."""
    req = OpenEpisodeRequest(
        game_id='middle_earth',
        character={'id': 'c1'},
        episode={'index': 9, 'at': 'now', 'terminal': False},
        arc='Victorian scandal',
        condition={'reputation': 12},
        world_notes={'weather': 'a parlour, gaslit'},
        day={'day_number': 4, 'date': '3018-03-15'},
        trip_name='ignored',
        character_state={'reputation': 99, 'laudanum_doses': 3},
    )
    assert req.episode.index == 9
    assert req.arc == 'Victorian scandal'
    # explicit condition key wins; the legacy-only key still folds in
    assert req.condition == {'reputation': 12, 'laudanum_doses': 3}
    assert req.world_notes == {'weather': 'a parlour, gaslit'}


def test_open_accepts_v2_without_day(client):
    """The canonical payload needs no `day`: episode/arc/condition carry
    the frame, the arc name and the live body."""
    char = _uid('v2')
    r = client.post('/episodes', json={
        'game_id': 'middle_earth',
        'character': {'id': char, 'name': 'Tester'},
        'episode_ref': 'v2-d1',
        'language': 'english',
        'episode': {'index': 1, 'at': '3018-03-15', 'terminal': False},
        'arc': 'The Long Road North',
        'condition': {'energy': 80, 'rations': 2},
        'world_notes': {'climate_state': 'a clear cold morning'},
        'events': [TRAVEL_EVENT],
        'fate': 'living',
    })
    assert r.status_code == 200, r.text
    ep = r.json()
    assert ep['episode_id']
    assert ep['psyche_packet']['perceived_day']


def test_open_v2_narrate_uses_episode_frame(client, monkeypatch):
    """A v2 episode narrates: the guard accepts episode.at and the prompt
    back-fills the legacy day keys from the frame."""
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
        'episode': {'index': 3, 'at': '3018-03-15', 'terminal': False},
        'arc': 'The Long Road North',
        'condition': {'energy': 60},
        'world_notes': {'climate_state': 'a clear cold morning'},
        'events': [TRAVEL_EVENT],
    })
    assert r.status_code == 200, r.text
    rn = client.post(f"/episodes/{r.json()['episode_id']}/narrate", json={})
    assert rn.status_code == 200, rn.text
    body = rn.json()
    assert body['generation']['text'] == fake['text']


def test_open_legacy_still_works(client):
    """The dual-read window: a payload speaking only `day`/`trip_name`
    opens and folds into the canonical fields untouched."""
    char = _uid('legacy')
    r = client.post('/episodes', json={
        'game_id': 'middle_earth',
        'character': {'id': char, 'name': 'Tester'},
        'episode_ref': 'leg-d1',
        'events': [TRAVEL_EVENT],
        'day': {'day_number': 1, 'date': '1950-01-21'},
        'trip_name': 'Old Shape',
        'character_state': {'energy': 70},
    })
    assert r.status_code == 200, r.text
    assert r.json()['episode_id']


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


def test_moment_event_perceives_with_provenance_tags(client):
    """A resolved ambient situation rides as a 'moment' event (ADR-0016):
    the mind perceives its authored reading and derives the record /
    situation provenance tags — 'the same voice again' can connect."""
    char = _uid('moment')
    r = client.post('/episodes', json={
        'game_id': 'middle_earth',
        'character': {'id': char, 'name': 'Tester'},
        'episode_ref': 'mom-d1',
        'episode': {'index': 1, 'at': '3018-03-15'},
        'events': [{
            'type': 'moment',
            'when': {'episode': 1, 'date': '3018-03-15'},
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
    item = r.json()['psyche_packet']['perceived_day'][0]
    assert item['type'] == 'moment'
    assert item['reading'] == 'the fire lights three paces; the wall makes noise'
    assert 'tag:record:M-A4' in item['tags']
    assert 'tag:situation:night-1' in item['tags']
    assert 'type:moment' in item['tags']
