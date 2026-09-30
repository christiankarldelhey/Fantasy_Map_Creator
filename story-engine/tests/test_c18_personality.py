# ============================================================================
# C18 — personality as seed beliefs, invoked when the day touches them
# ----------------------------------------------------------------------------
# Character traits moved out of the prompt's static text into mold starter
# beliefs (origin='seed'). rank_beliefs orders them for the lens by
# confidence × tag-overlap with the perceived day — a belief about people
# surfaces on people-days and quiets on empty moorland.
# ============================================================================
import uuid

from types import SimpleNamespace

from app.db import SessionLocal
from app.mind.provisioning import get_or_create_brain
from app.mind.retrieval import rank_beliefs
from app.mind.tables import Belief, BrainMold, MoldStarterBelief


def _belief(statement, confidence, tags=None):
    return SimpleNamespace(
        statement=statement, confidence=confidence, tags=tags or []
    )


def test_rank_beliefs_untagged_keeps_confidence_order():
    beliefs = [
        _belief('quiet conviction', 0.6),
        _belief('loud conviction', 0.9),
    ]
    ranked = rank_beliefs(beliefs, [{'tags': ['tag:weather:wet']}])
    assert [b.statement for b in ranked] == ['loud conviction', 'quiet conviction']


def test_rank_beliefs_tagged_surfaces_when_the_day_touches_it():
    beliefs = [
        _belief('core identity', 0.9),
        _belief('trusts trees over people', 0.7, ['tag:entity_type:humans']),
        _belief('a quieter one', 0.8),
    ]
    empty_day = [{'tags': ['tag:weather:wet']}]
    people_day = [{'tags': ['tag:entity_type:humans', 'entity:42']}]
    assert [b.statement for b in rank_beliefs(beliefs, empty_day)] == [
        'core identity', 'a quieter one', 'trusts trees over people',
    ]
    # On a people-day the tagged belief doubles its weight: 0.7 × (1+1) = 1.4
    ranked = rank_beliefs(beliefs, people_day)
    assert ranked[0].statement == 'trusts trees over people'


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
