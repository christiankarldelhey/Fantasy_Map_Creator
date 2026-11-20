# ============================================================================
# Engine — the vector substrate's arithmetic (ADR 0017)
# ----------------------------------------------------------------------------
# Pure-math pins: the dwarf's prejudice, the feared orc, the felt/world
# split, decay toward indifference, regression to Temperament, and the
# feeling lexicon. If these hold, the numbers tell the story.
# ============================================================================
import pytest

from app.mind.engine import (
    acute_hit, apply_pull, decay, derive_feeling, mood_position,
    project_body, pull_affinity, pull_gain, pull_target, regress,
    sediment, standing_magnitude,
)


def test_favour_sediments_what_objectively_happened():
    """aid_or_trade worth {trust:+.3, affection:+.15}: the dwarf who
    despises elves (affection -0.6) still takes the help on the
    record — the Relation keeps the fact, not the grudge's reading."""
    delta = {'trust': 0.3, 'affection': 0.15}
    rel = {'affection': -0.6, 'trust': -0.2}
    sediment(rel, delta, resistance=0.5)
    assert rel['trust'] == pytest.approx(-0.2 + 0.3 * 0.5)
    assert rel['affection'] == pytest.approx(-0.6 + 0.15 * 0.5)


def test_pull_moves_toward_target_never_past():
    """A felt pull steps the mood a share of the way to the target —
    bounded by construction, a light tug gets closer but not there."""
    mood = {'valence': 0.8, 'arousal': 0.3, 'dominance': 0.0}
    target = {'valence': -0.4, 'arousal': -0.1}
    apply_pull(mood, target, 0.25)
    assert mood['valence'] == pytest.approx(0.8 - 1.2 * 0.25)
    assert mood['arousal'] == pytest.approx(0.3 - 0.4 * 0.25)
    # Even an impossible gain cannot overshoot the point.
    apply_pull(mood, target, 1.0)
    assert mood['valence'] == pytest.approx(-0.4)
    assert mood['arousal'] == pytest.approx(-0.1)


def test_pull_steady_decays_toward_the_origin():
    """felt:steady is the neutral pull — a quiet hearth undoes the
    day's charge, it does not push past calm."""
    mood = {'valence': -0.6, 'arousal': 0.5, 'dominance': 0.0}
    apply_pull(mood, {'valence': 0.0, 'arousal': 0.0}, 0.5)
    assert mood['valence'] == pytest.approx(-0.3)
    assert mood['arousal'] == pytest.approx(0.25)


def test_pull_target_refracts_through_the_standing():
    """The rain-lover's melancholy refracts toward what the rain
    already feels like; the stranger's lands as authored (#184)."""
    tag_point = {'valence': -0.35, 'arousal': -0.1}
    loved = {'affection': 0.8, 'trust': 0.3, 'familiarity': 0.7}
    rel_point = mood_position(loved)
    mag = standing_magnitude(loved)
    refracted = pull_target(tag_point, rel_point, mag)
    # Love pulls the landing up-valence from the raw word.
    assert refracted['valence'] > tag_point['valence']
    stranger = pull_target(tag_point, {'valence': 0.0, 'arousal': 0.0}, 0.0)
    assert stranger == tag_point


def test_pull_gain_weights_salience_bond_and_yield():
    """A stranger's tone still registers at PULL_BASE; the same event
    weighs more on a mind that yields and on a bond that holds."""
    base = pull_gain(0.5, 0.0, 0.3, 0.0)
    bonded = pull_gain(0.5, 0.6, 0.3, 0.0)
    moody = pull_gain(0.5, 0.6, 0.8, 0.0)
    assert 0.0 < base < bonded < moody <= 1.0
    # Affinity: a temperament aligned with the target yields more.
    assert pull_affinity(
        {'valence': -0.5, 'arousal': -0.2},
        {'valence': -0.6, 'arousal': -0.2}) > 0.9
    assert pull_affinity(
        {'valence': -0.5, 'arousal': -0.2},
        {'valence': 0.6, 'arousal': 0.3}) < 0.0


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


def test_mood_position_reads_a_relation_in_mood_space():
    """W_RM reads the standing vector as a mood-space point (#184):
    a feared thing sits high-arousal low-valence; a loved one warm
    and settled — the point the pull refracts toward."""
    feared = mood_position({'fear': 0.5})
    assert feared['arousal'] == pytest.approx(0.5 * 0.8)
    assert feared['valence'] == pytest.approx(0.5 * -0.6)
    loved = mood_position({'affection': 0.8, 'familiarity': 0.7})
    assert loved['valence'] == pytest.approx(0.8)
    assert loved['arousal'] < 0  # familiarity settles the bond


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
