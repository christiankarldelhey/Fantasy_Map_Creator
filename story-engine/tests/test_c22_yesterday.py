# ============================================================================
# C22 — continuity is mind-authored, inside the lens
# ----------------------------------------------------------------------------
# The host's 'In Chapter N (yesterday)…' summary duplicated the mind's job
# and arrived as a floating list the narrator ignored. With a mind driving:
#   1. The lens carries 'Yesterday, as they remember it' — the episodic
#      memories encoded in the previous episode, i.e. what the character
#      RETAINED, not what objectively happened.
#   2. JOURNEY CONTEXT keeps only the destination (world-truth); the
#      previous-day line is dropped so the day is not stated twice.
# ============================================================================
from types import SimpleNamespace

from app.mind.lens import render_lens
from app.prompt.builder import build_day_prompt


def _mood():
    return {'valence': 0.0, 'arousal': 0.0, 'dominant': 'steady'}


def _belief(stmt):
    return SimpleNamespace(statement=stmt)


def test_yesterday_recap_renders_in_lens():
    lens = render_lens(
        'Aranath', _mood(), [_belief('the old road waits')],
        evoked_memories=None,
        yesterday=['Foxes — a predator that chose to leave',
                   'a cold night under open sky'],
    )
    assert 'Yesterday, as they remember it:' in lens
    assert 'Foxes — a predator that chose to leave' in lens


def test_yesterday_recap_absent_when_nothing_retained():
    lens = render_lens('Aranath', _mood(), [], None, yesterday=[])
    assert 'Yesterday' not in lens


def test_journey_context_drops_host_summary_when_mind_drives():
    day = {
        'day_number': 3, 'date': '1950-10-01',
        'climate': [], 'encounters': [], 'meals': [],
        'locations': [], 'biomes': [], 'regions': [],
    }
    prev = {'day_number': 2, 'regions': ['Nan Anduin'],
            'locations': [], 'encounters': ['Foxes']}
    prompt = build_day_prompt(
        day, trip={'name': 'Bree to Dale'},
        character={'name': 'Aranath'},
        previous_day=prev, mind_block='lens line',
    )['user']
    assert 'Ultimate Destination' in prompt
    assert 'In Chapter' not in prompt
    assert 'Foxes' not in prompt  # the host's encounter name must not leak


def test_stateless_path_keeps_host_summary():
    day = {
        'day_number': 3, 'date': '1950-10-01',
        'climate': [], 'encounters': [], 'meals': [],
        'locations': [], 'biomes': [], 'regions': [],
    }
    prev = {'day_number': 2, 'regions': ['Nan Anduin'],
            'locations': [], 'encounters': ['Foxes']}
    prompt = build_day_prompt(
        day, trip={'name': 'Bree to Dale'},
        character={'name': 'Aranath'},
        previous_day=prev,
    )['user']
    assert 'In Chapter' in prompt
    assert 'Foxes' in prompt
