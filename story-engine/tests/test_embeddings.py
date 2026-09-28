# ============================================================================
# B8 smoke — embeddings in retrieval
# ----------------------------------------------------------------------------
# pgvector is unavailable on this Postgres, so vectors live in the
# existing JSONB column and cosine runs in Python via a deterministic
# hashing embedder. score += delta_embedding * cosine(episode, memory);
# a semantically close memory can stir with ZERO tag overlap.
# ============================================================================
import uuid

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.db import SessionLocal
from app.mind.embeddings import cosine, embed
from app.mind.tables import BrainMold, Memory, MoldWiring


@pytest.fixture()
def client():
    return TestClient(main_module.app)


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def _mold(**wiring):
    session = SessionLocal()
    slug = _uid('mold')
    mold = BrainMold(game_id='middle_earth', slug=slug, name='Wired')
    session.add(mold)
    session.flush()
    for key, value in wiring.items():
        session.add(MoldWiring(mold_id=mold.id, key=key, value=value))
    session.commit()
    session.close()
    return slug


def _seed_memory(character_id, desc, importance=0.2, created_episode=1):
    session = SessionLocal()
    session.add(Memory(
        game_id='middle_earth', character_id=character_id,
        episode_ids=[], kind='episodic', tags=[], desc=desc,
        valence=0.0, importance=importance, strength=importance,
        evocations=0, consolidated=True, origin='experience',
        created_episode=created_episode, embedding=embed(desc),
    ))
    session.commit()
    session.close()


def _rain_note(ep=2):
    return {
        'type': 'note',
        'when': {'episode': ep, 'date': '1950-01-20'},
        'data': {'note': 'rain drizzled on the road, soaking'},
    }


def _open(client, char, events, ref='d2', brain_profile=None):
    character = {'id': char}
    if brain_profile:
        character['brain_profile'] = brain_profile
    r = client.post('/episodes', json={
        'game_id': 'middle_earth', 'character': character,
        'episode_ref': ref, 'events': events,
    })
    assert r.status_code == 200, r.text
    return r.json()


def test_embedder_is_deterministic_and_semantic():
    assert embed('cold rain') == embed('cold rain')
    assert embed('') is None
    close = cosine(embed('rain soaked the cloak'),
                   embed('more rain, still soaking'))
    far = cosine(embed('rain soaked the cloak'),
                 embed('lembas bread at dawn'))
    assert close > 0.2 > far


def test_memory_stored_with_embedding(client):
    char = _uid('mem')
    ep = _open(client, char, [{
        'type': 'meal',
        'when': {'episode': 1, 'date': '1950-01-19'},
        'data': {'food': 'lembas', 'valence': 0.4},
    }], ref='d1')
    client.post(f"/episodes/{ep['episode_id']}/close", json={})
    session = SessionLocal()
    mems = session.query(Memory).filter_by(character_id=char).all()
    session.close()
    assert mems and all(len(m.embedding or []) == 256 for m in mems)


def test_semantic_recall_without_tag_overlap(client):
    """A memory with no shared tags still stirs when the day's readings
    are semantically close — if delta_embedding is strong enough."""
    desc = 'the rain soaked every stitch of wool'

    tuned = _uid('tuned')
    _seed_memory(tuned, desc)
    slug = _mold(delta_embedding=0.6)
    opened = _open(client, tuned, [_rain_note()], brain_profile=slug)
    assert desc in opened['psyche_packet']['lens_block']

    # Same memory, default wiring: base score ~0.46 < min_score → silent.
    plain = _uid('plain')
    _seed_memory(plain, desc)
    opened2 = _open(client, plain, [_rain_note()])
    assert desc not in opened2['psyche_packet']['lens_block']
