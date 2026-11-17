# ============================================================================
# Engine — the vector substrate's arithmetic (ADR 0017)
# ----------------------------------------------------------------------------
# Pure-math pins: the dwarf's prejudice, the feared orc, the felt/world
# split, decay toward indifference, regression to Temperament, and the
# feeling lexicon. If these hold, the numbers tell the story.
# ============================================================================
import pytest

from app.mind.engine import (
    acute_hit, couple_mood, decay, derive_feeling, felt_delta,
    project_body, regress, sediment,
)


def test_favour_on_a_hated_subject_lands_grudgingly():
    """aid_or_trade worth {trust:+.3, affection:+.15}: the dwarf who
    despises elves (affection -0.6) admits the help — barely."""
    delta = {'trust': 0.3, 'affection': 0.15}
    felt = felt_delta(delta, {'affection': -0.6, 'trust': -0.2})
    assert felt['affection'] == pytest.approx(0.15 * (1 + 0.5 * -0.6))
    assert felt['trust'] == pytest.approx(0.3 * (1 + 0.5 * -0.2))
    # ...but the world channel sediments what objectively happened.
    rel = {'affection': -0.6, 'trust': -0.2}
    sediment(rel, delta, resistance=0.5)
    assert rel['trust'] == pytest.approx(-0.2 + 0.3 * 0.5)
    assert rel['affection'] == pytest.approx(-0.6 + 0.15 * 0.5)


def test_fear_on_a_feared_subject_lands_harder():
    """Hating orcs makes each sighting weigh more — the standing dim
    amplifies the landing, not just favours."""
    felt = felt_delta({'fear': 0.4}, {'fear': 0.6})
    assert felt['fear'] == pytest.approx(0.4 * 1.3)


def test_sediment_confirms_whole_contradicts_resisted():
    """Asymmetric resistance: evidence confirming the stance enters at
    full weight; the same delta against it pays the resistance."""
    rel = {'affection': -0.6}
    sediment(rel, {'affection': -0.1}, resistance=0.5)  # confirms the hate
    assert rel['affection'] == pytest.approx(-0.7)
    sediment(rel, {'affection': +0.2}, resistance=0.5)  # contradicts it
    assert rel['affection'] == pytest.approx(-0.7 + 0.1)


def test_decay_cools_toward_indifference_never_past():
    """The fear lets go, the love stays love — dims shrink toward zero
    and never cross their sign."""
    rel = {'affection': -0.3, 'fear': 0.5}
    decay(rel, 0.5)
    assert rel['affection'] == pytest.approx(-0.15)
    assert rel['fear'] == pytest.approx(0.25)
    for _ in range(30):
        decay(rel, 0.5)
    assert rel['affection'] <= 0 and rel['fear'] >= 0


def test_mood_regresses_toward_the_temperament():
    """A kind afternoon fades: the quiet episodes carry the mood back
    to the resting point the personality set."""
    mood = {'valence': 0.4, 'arousal': 0.2, 'dominance': 0.0}
    temperament = {'valence': -0.2, 'arousal': -0.1, 'dominance': 0.1}
    regress(mood, temperament, 0.5)
    assert mood['valence'] == pytest.approx(0.1)
    assert mood['dominance'] == pytest.approx(0.05)


def test_mood_is_the_coupling_of_relation_movements():
    """W_RM: felt fear raises arousal and dims dominance/valence;
    felt affection warms valence."""
    mood = {}
    couple_mood(mood, [{'fear': 0.5}, {'affection': 0.2}])
    assert mood['arousal'] == pytest.approx(0.5 * 0.8)
    assert mood['dominance'] == pytest.approx(0.5 * -0.4)
    assert mood['valence'] == pytest.approx(0.5 * -0.6 + 0.2)


def test_derive_feeling_reads_the_state_as_a_word():
    assert derive_feeling(
        {'fear': 0.8, 'dominance': -0.5}
    ) == 'dread'
    assert derive_feeling(
        {'affection': 0.7, 'trust': 0.7, 'familiarity': 0.8}
    ) == 'deep friendship'
    assert derive_feeling({'affection': -0.7}) == 'hatred'
    assert derive_feeling({}) is None


def test_body_projects_from_condition_and_takes_acute_hits():
    """The declared field→dim map; a wound lands on top of it."""
    body = project_body(
        {'days_without_food': 3, 'fatigue': 0.5},
        {'hunger': {'field': 'days_without_food', 'scale': 5},
         'fatigue': {'field': 'fatigue'}},
    )
    assert body['hunger'] == pytest.approx(0.6)
    assert body['fatigue'] == pytest.approx(0.5)
    acute_hit(body, {'pain': 0.4})
    assert body['pain'] == pytest.approx(0.4)
    acute_hit(body, {'pain': 0.9})
    assert body['pain'] == 1.0  # clipped, never past the body
