# ============================================================================
# The wake — '(stays with them)' on beats that outlive their scene
# ----------------------------------------------------------------------------
# A meeting that hits hard enough (authored intensity 3+) does not close
# when its scene ends: the beat carries the mark, the chapter's rules say
# what the mark asks, and the closing moves inside what the day left.
# ============================================================================
from app.prompt.builder import build_day_prompt
from app.prompt.sections.anti_repetition import (
    STAYS_CLOSING, closing_instruction)
from app.prompt.sections.encounters import _describe_encounter


def _encounter(intensity=None, outcome=None):
    return {
        'phase': 'afternoon',
        'entity': {'name': 'Orcs'},
        'interaction': {
            'form': 'attacks',
            'intensity': intensity,
            'outcome': outcome,
            'dialogue_content': {'traveller_stance': 'Stands and fights'},
        },
    }


def test_intense_encounter_carries_the_mark():
    text = _describe_encounter(_encounter(intensity=4, outcome='wounded'))
    assert '(stays with them)' in text


def test_quiet_encounter_carries_no_mark():
    text = _describe_encounter(_encounter(intensity=1))
    assert '(stays with them)' not in text
    text = _describe_encounter(_encounter(intensity=None))
    assert '(stays with them)' not in text


def test_the_wake_rule_lands_only_when_a_beat_stays():
    day = {'day_number': 5, 'date': '1950-01-19',
           'encounters': [_encounter(intensity=4, outcome='wounded')]}
    user = build_day_prompt(day=day, character={'name': 'C'})['user']
    assert 'does not close when its scene ends' in user
    assert STAYS_CLOSING in user

    day['encounters'] = [_encounter(intensity=1)]
    user = build_day_prompt(day=day, character={'name': 'C'})['user']
    assert 'does not close when its scene ends' not in user
    assert STAYS_CLOSING not in user


def test_closing_rotation_untouched_without_stays():
    assert closing_instruction(1) != STAYS_CLOSING
    assert closing_instruction(1, has_stays=True) == STAYS_CLOSING
