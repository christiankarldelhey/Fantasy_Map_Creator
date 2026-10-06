# ============================================================================
# C22 — continuity is mind-authored, inside the lens
# ----------------------------------------------------------------------------
# The host's 'In Chapter N (yesterday)…' summary duplicated the mind's job
# and arrived as a floating list the narrator ignored. With a mind driving:
#   1. C35 superseded the 'Yesterday, as they remember it' recap: a memory
#      reaches the Lens because it connects to the Episode, whatever its
#      age — being recent is not a reason on its own (CONTEXT.md · Memory).
#   2. JOURNEY CONTEXT keeps only the destination (world-truth); the
#      previous-day line is dropped so the day is not stated twice.
# ============================================================================
from app.prompt.builder import build_day_prompt


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
