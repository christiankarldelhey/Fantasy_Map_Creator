# ============================================================================
# C18 — personality as seed beliefs, invoked when the day touches them
# ----------------------------------------------------------------------------
# Character traits moved out of the prompt's static text into mold starter
# beliefs (origin='seed'). C35: a belief reaches the Lens only when the
# Episode puts it at stake (focus.build_brief) — a belief about people
# speaks on people-days and stays silent on empty moorland.
# ============================================================================
import uuid

from app.db import SessionLocal
from app.mind.provisioning import get_or_create_brain
from app.mind.tables import Belief, BrainMold, MoldStarterBelief


def test_starter_beliefs_seed_the_brain_on_first_open():
    """A mold's starter beliefs clone into the fresh brain as origin='seed'
    content — the person's nature, not lived evidence."""
    session = SessionLocal()
    game_id = 'middle_earth'
    slug = f'persona-{uuid.uuid4().hex[:8]}'
    mold = BrainMold(game_id=game_id, slug=slug, name='Test persona')
    session.add(mold)
    session.flush()
    session.add(MoldStarterBelief(
        mold_id=mold.id, kind='self', confidence=0.9,
        statement='She means to be the last witness.',
        tags=[], boosts=None,
    ))
    session.flush()

    brain = get_or_create_brain(
        session, game_id, f'persona-char-{uuid.uuid4().hex[:8]}', slug
    )
    session.flush()
    seeds = (
        session.query(Belief)
        .filter_by(character_id=brain.character_id, origin='seed')
        .all()
    )
    assert len(seeds) == 1
    assert seeds[0].statement == 'She means to be the last witness.'
    assert seeds[0].status == 'active'
    session.rollback()
    session.close()
