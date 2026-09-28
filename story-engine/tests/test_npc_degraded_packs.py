# ============================================================================
# B10 smoke — NPC degraded mode + pack versioning
# ----------------------------------------------------------------------------
# Degraded brains (wiring 'degraded': true — the NPC tier) still perceive
# and encode memories but never call the reflection LLM and defer
# decay/pattern consolidation to POST /maintenance/consolidate.
#
# Pack versioning (PRD §9.2): clone copies the live pack into a draft
# namespace ('<game>@draft-N') for safe experimentation; promote archives
# the outgoing live content as a frozen snapshot and swaps the draft's
# rows in atomically. Episodes record the active version at open.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.db import SessionLocal
from app.mind.tables import Brain, Episode, Memory, NlThreshold, PackVersion

GAME = 'middle_earth'
TEST_PACK = 'pack-lab'


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _open(client, char, events, ref, game=GAME):
    r = client.post('/episodes', json={
        'game_id': game, 'character': {'id': char},
        'episode_ref': ref, 'events': events,
    })
    assert r.status_code == 200, r.text
    return r.json()


def _close(client, episode_id):
    r = client.post(f'/episodes/{episode_id}/close', json={})
    assert r.status_code == 200, r.text
    return r.json()


def _food_event(ep):
    return {
        'type': 'meal',
        'when': {'episode': ep, 'date': f'1950-01-{18 + ep:02d}'},
        'data': {
            'entity': 'lembas',
            'tags': ['food:lembas'],
            'severity': 0.9,       # high salience → it encodes
        },
    }


def _degrade(char):
    session = SessionLocal()
    brain = session.query(Brain).filter_by(
        game_id=GAME, character_id=char
    ).one()
    brain.wiring = {**(brain.wiring or {}), 'degraded': True}
    session.commit()
    session.close()
    return brain.id


def test_degraded_close_encodes_but_never_reflects(client):
    char = _uid('npc')
    _open(client, char, [_food_event(1)], 'd1')
    _degrade(char)
    opened = _open(client, char, [_food_event(2)], 'd2')
    closed = _close(client, opened['episode_id'])
    assert closed['degraded'] is True
    assert closed['encoded'] >= 1           # NPCs still remember
    assert closed['reflection'] == {
        'reflected': False, 'reason': 'degraded_brain',
    }
    # ...but no decay/pattern pass ran inline.
    assert closed['forgotten'] == 0
    assert closed['patterns'] == 0


def test_degraded_patterns_wait_for_batch(client):
    char = _uid('npc')
    _open(client, char, [_food_event(1)], 'd1')
    brain_id = _degrade(char)
    for ep in (2, 3, 4):
        opened = _open(client, char, [_food_event(ep)], f'd{ep}')
        _close(client, opened['episode_id'])

    session = SessionLocal()
    patterns = session.query(Memory).filter_by(
        character_id=char, kind='pattern'
    ).count()
    session.close()
    assert patterns == 0  # deferred — no inline pattern detection

    r = client.post('/maintenance/consolidate',
                    json={'brain_ids': [brain_id]})
    assert r.status_code == 200, r.text
    result = next(
        b for b in r.json()['results'] if b['brain_id'] == brain_id
    )
    assert result['patterns'] >= 1

    session = SessionLocal()
    patterns = session.query(Memory).filter_by(
        character_id=char, kind='pattern'
    ).count()
    session.close()
    assert patterns >= 1  # the batch pass formed it


def test_normal_brains_untouched_by_degraded_gate(client):
    """Sanity: a normal brain's close still decays and may reflect."""
    char = _uid('hero')
    opened = _open(client, char, [_food_event(1)], 'd1')
    closed = _close(client, opened['episode_id'])
    assert closed['degraded'] is False


def test_clone_and_promote_pack(client):
    session = SessionLocal()
    session.query(NlThreshold).filter(
        NlThreshold.game_id.like(f'{TEST_PACK}%')
    ).delete(synchronize_session=False)
    session.query(PackVersion).filter_by(game_id=TEST_PACK).delete(
        synchronize_session=False
    )
    session.add(NlThreshold(
        game_id=TEST_PACK, key='climate.windy_speed_min', value=18.0
    ))
    session.commit()
    session.close()

    # Clone → draft v2 in its own namespace, live untouched.
    r = client.post(f'/packs/{TEST_PACK}/clone',
                    json={'note': 'windier shire'})
    assert r.status_code == 200, r.text
    draft = r.json()
    assert draft['version'] == 2
    assert draft['status'] == 'draft'
    ns = draft['namespace']
    assert ns == f'{TEST_PACK}@draft-2'

    # Experiment on the draft namespace — live pack unchanged.
    session = SessionLocal()
    row = session.query(NlThreshold).filter_by(
        game_id=ns, key='climate.windy_speed_min'
    ).one()
    row.value = 4.0
    session.commit()
    session.close()

    # Promote → draft rows become the live pack; v1 archived w/ snapshot.
    r = client.post(f'/packs/{TEST_PACK}/promote', json={'version': 2})
    assert r.status_code == 200, r.text
    promoted = r.json()
    assert promoted['status'] == 'active'
    assert promoted['archived_version'] == 1

    session = SessionLocal()
    live = session.query(NlThreshold).filter_by(
        game_id=TEST_PACK, key='climate.windy_speed_min'
    ).one()
    assert live.value == 4.0
    archived = session.query(PackVersion).filter_by(
        game_id=TEST_PACK, version=1, status='archived'
    ).one()
    assert any(
        r['value'] == 18.0
        for r in archived.snapshot['nl_thresholds']
        if r['key'] == 'climate.windy_speed_min'
    )
    session.close()

    # Ledger reports the active version.
    r = client.get(f'/packs/{TEST_PACK}/versions')
    assert r.status_code == 200
    body = r.json()
    assert body['active_version'] == 2
    assert {v['status'] for v in body['versions']} == {'active', 'archived'}


def test_episode_snapshot_records_pack_version(client):
    r = client.post(f'/packs/{TEST_PACK}/clone', json={})
    version = r.json()['version']
    client.post(f'/packs/{TEST_PACK}/promote', json={'version': version})

    opened = _open(client, _uid('v'), [_food_event(1)], 'd1', game=TEST_PACK)
    session = SessionLocal()
    episode = session.get(Episode, opened['episode_id'])
    assert episode.config_snapshot['pack_version'] == version
    assert episode.config_snapshot['nl_pack'] == TEST_PACK
    session.close()


def test_promote_unknown_draft_is_404(client):
    r = client.post(f'/packs/{TEST_PACK}/promote', json={'version': 999})
    assert r.status_code == 404
