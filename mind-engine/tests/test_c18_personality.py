# ============================================================================
# C18 — personality as seed beliefs, invoked when the day touches them
# ----------------------------------------------------------------------------
# Character traits moved out of the prompt's static text into preset starter
# beliefs (origin='seed'). C35: a belief reaches the Lens only when the
# Episode puts it at stake (focus.build_brief) — a belief about people
# speaks on people-days and stays silent on empty moorland.
# ============================================================================
import uuid

from app.db import SessionLocal
from app.mind.provisioning import get_or_create_mind
from app.mind.tables import Belief, MindPreset, PresetStarterBelief


def test_starter_beliefs_seed_the_brain_on_first_open():
    """A preset's starter beliefs clone into the fresh mind as origin='seed'
    content — the person's nature, not lived evidence."""
    session = SessionLocal()
    game_id = 'middle_earth'
    slug = f'persona-{uuid.uuid4().hex[:8]}'
    preset = MindPreset(game_id=game_id, slug=slug, name='Test persona')
    session.add(preset)
    session.flush()
    session.add(PresetStarterBelief(
        preset_id=preset.id, kind='self', strength=4.5,
        statement='She means to be the last witness.',
        tags=[], boosts=None,
    ))
    session.flush()

    mind = get_or_create_mind(
        session, game_id, f'persona-char-{uuid.uuid4().hex[:8]}', slug
    )
    session.flush()
    seeds = (
        session.query(Belief)
        .filter_by(character_id=mind.character_id, origin='seed')
        .all()
    )
    assert len(seeds) == 1
    assert seeds[0].statement == 'She means to be the last witness.'
    assert seeds[0].status == 'active'
    session.rollback()
    session.close()
