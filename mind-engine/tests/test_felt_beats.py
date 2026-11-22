# ============================================================================
# Felt beats — the world's immediate touch on the mood, said where it happened
# ----------------------------------------------------------------------------
# Each perceived item whose mood_pull landed earns one phase-routed line —
# 'Losrandír left them watchful' — so the narrator sees WHY an event bent
# the mood, not only where the mood ended. Silent for pulls too weak to
# matter, for items the mind already voiced (needs, streaks), and for the
# pull the arc already spoke as a shade or the turn's cause.
# ============================================================================
from types import SimpleNamespace

from app.db import SessionLocal
from app.mind.routes import _felt_beats, _merged_beats


def _item(**kw):
    return {
        'when': {'phase': 'afternoon'},
        'source': 'world',
        'subject': 'entity:losrandir',
        'reading': 'a herd at the waterhole',
        'mood_pull': [{'word': 'watchful', 'gain': 0.3,
                       'target': {'valence': 0.1, 'arousal': 0.34}}],
        **kw,
    }


def _ep(perceived, mood=None):
    return SimpleNamespace(
        perceived_day=perceived,
        mood=mood or {},
        brief={},
        game_id='middle_earth',
        character_id='felt-tester',
        episode_idx=1,
    )


def _db():
    return SessionLocal()


def test_a_landed_pull_speaks_its_word_where_it_happened():
    db = _db()
    try:
        beats = _felt_beats(db, _ep([_item()]))
    finally:
        db.close()
    [line] = beats['afternoon']
    assert line['line'] == 'losrandir left them watchful'
    # The display rides as subject so the line can echo inside its own
    # encounter's block.
    assert line['subject'] == 'losrandir'


def test_a_pull_too_weak_to_matter_stays_silent():
    db = _db()
    try:
        beats = _felt_beats(db, _ep([_item(
            mood_pull=[{'word': 'listless', 'gain': 0.01,
                        'target': {}}])]))
    finally:
        db.close()
    assert beats == {}


def test_items_without_a_subject_anchor_on_their_reading():
    db = _db()
    try:
        beats = _felt_beats(db, _ep([_item(
            subject=None,
            reading='cold, sun and moving cloud and a steady rain',
            mood_pull=[{'word': 'listless', 'gain': 0.2, 'target': {}}],
        )]))
    finally:
        db.close()
    assert beats['afternoon'][0]['line'] == 'cold left them listless'


def test_the_pull_the_arc_already_spoke_stays_single():
    """A shade or the turn's cause is the same pull once — the felt beat
    doesn't repeat what the arc's line already says."""
    item = _item()
    mood = {'shades': [{'phase': 'afternoon',
                        'reading': 'a herd at the waterhole'}]}
    db = _db()
    try:
        assert _felt_beats(db, _ep([item], mood)) == {}
        assert _felt_beats(db, _ep(
            [item], {'turn': {'cause': 'a herd at the waterhole'}})) == {}
    finally:
        db.close()


def test_mind_voiced_items_dont_speak_twice():
    db = _db()
    try:
        beats = _felt_beats(db, _ep([_item(source='mind')]))
    finally:
        db.close()
    assert beats == {}


def test_felt_beats_merge_into_the_phase_channel():
    db = _db()
    try:
        beats = _merged_beats(db, _ep([_item()]), None)
    finally:
        db.close()
    assert any(
        'left them watchful' in b['line'] for b in beats['afternoon'])
