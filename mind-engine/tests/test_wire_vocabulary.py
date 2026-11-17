"""The wire's declared vocabulary must all have declared meaning.

`toEvents.js` emits a fixed set of `form`/`outcome`/`weather:*`/marker
values (the audit of interactionResolver + climateNotes + lodging).
Every one needs a semantic row — a word the pack does not know is an
event that lands emotionally empty. Adding a new value host-side and
forgetting its meaning here fails this test; that is the point.
"""
from app.mind.semantics import DEFAULT_SEMANTICS
from app.mind.util import tag_matches

# interactionResolver forms (entities_narration kind='form' + fallbacks)
WIRE_FORMS = [
    'attacks', 'sudden_peril', 'confronts', 'stalks', 'hinders_passage',
    'aid_or_trade', 'harvest_shelter', 'brief_exchange',
    'reacts_withdraws', 'drifts_closer', 'watches', 'observed_activity',
    'sign_only', 'glimpsed_far', 'sound_only', 'presence_felt',
    'scenery', 'passed_by', 'mistaken_for_object', 'topic',
]

# rollResistance outcomes
WIRE_OUTCOMES = ['unscathed', 'wounded', 'badly wounded', 'slain']

# climateNotes weatherTags
WIRE_WEATHER = [
    'snow', 'deep_cold', 'scorching', 'storm', 'freezing',
    'wet', 'windy', 'overcast',
]

# toEvents marker tags that carry meaning (lodging, place contact,
# region entry). 'given'/'decision'/'changed' are salience markers,
# not meaning — deliberately absent.
WIRE_MARKERS = [
    'settlement', 'hostile', 'sighted_far', 'sighted', 'visited',
    'entered', 'region_entered', 'lodging:paid', 'lodging:charity',
    'lodging:turned_away', 'rest:indoor', 'rest:open_sky', 'rest:poor',
    'rest:good', 'given',
]

# The 'land' umbrella's subtypes — every land-contact shape has its
# light familiarity share.
WIRE_LAND_SUBTYPES = ['place', 'terrain', 'region', 'water']


def _covered(tag):
    return any(
        tag_matches(tag, key) for key in DEFAULT_SEMANTICS
    )


def test_every_wire_form_has_meaning():
    missing = [f for f in WIRE_FORMS
               if not _covered(f'tag:form:{f}')]
    assert not missing, f'forms without semantic row: {missing}'


def test_every_wire_outcome_has_meaning():
    missing = [o for o in WIRE_OUTCOMES
               if not _covered(f'tag:outcome:{o}')]
    assert not missing, f'outcomes without semantic row: {missing}'


def test_every_wire_weather_tier_has_meaning():
    missing = [wt for wt in WIRE_WEATHER
               if not _covered(f'tag:weather:{wt}')]
    assert not missing, f'weather tiers without row: {missing}'


def test_every_wire_marker_has_meaning():
    missing = [m for m in WIRE_MARKERS if not _covered(f'tag:{m}')]
    assert not missing, f'markers without semantic row: {missing}'


def test_every_land_subtype_has_meaning():
    missing = [s for s in WIRE_LAND_SUBTYPES
               if not _covered(f'tag:subtype:{s}')]
    assert not missing, f'land subtypes without row: {missing}'
