# ============================================================================
# NL equivalence suite (A4)
# ----------------------------------------------------------------------------
# The DB-seeded pack must produce byte-identical output to the module
# constants for every input. If this fails, a seed edit or resolver bug
# changed narrator behaviour. Requires a reachable DB with the middle_earth
# pack seeded (scripts/seed_nl_pack.py) — skipped otherwise.
# ============================================================================
import pytest

pytestmark = pytest.mark.skipif(
    __import__('os').environ.get('SKIP_DB_TESTS'), reason='DB tests disabled'
)


@pytest.fixture(scope='module')
def nl():
    from app.db import SessionLocal, db_health
    from app.mind.nl_resolver import NlPack
    from scripts.seed_nl_pack import seed_nl_pack

    if db_health() != 'ok':
        pytest.skip('database unavailable')
    session = SessionLocal()
    seed_nl_pack(session, 'middle_earth')  # restore pristine defaults
    yield NlPack(session, 'middle_earth')
    session.close()


def rng0():
    return lambda: 0.0  # deterministic pick: always index 0


def sample(temp=None, cloud=None, wind=None, prec=None, phase='morning'):
    data = {}
    for k, v in (('temperature_2m', temp), ('cloud_cover', cloud),
                 ('wind_speed_10m', wind), ('precipitation', prec)):
        if v is not None:
            data[k] = v
    return {'climate': data, 'phase': phase}


# ---------------------------------------------------------------------------
# summarise_weather: full grid of values, both sides of every band edge
# ---------------------------------------------------------------------------

@pytest.mark.parametrize('temp', [None, -15, 0, 2, 8, 15, 22, 29, 40])
@pytest.mark.parametrize('cloud', [None, 0, 25, 60, 90, 100])
@pytest.mark.parametrize('wind', [None, 0, 17.9, 18, 40])
@pytest.mark.parametrize('prec', [None, 0, 0.1, 0.2, 0.5, 3.0])
def test_summarise_weather_equivalence(nl, temp, cloud, wind, prec):
    from app.natural_language.climate_notes import summarise_weather
    records = [sample(temp, cloud, wind, prec)['climate']]
    assert summarise_weather(records) == summarise_weather(records, nl)


def test_collect_climate_notes_by_phase_equivalence(nl):
    from app.natural_language.climate_notes import collect_climate_notes_by_phase
    climates = [
        sample(temp=3, cloud=10, wind=5, prec=0, phase='morning'),
        sample(temp=12, cloud=50, wind=20, prec=0.05, phase='afternoon'),
        sample(temp=-2, cloud=20, wind=2, prec=0, phase='night'),
    ]
    for moon in (None, {'phase': 'full_moon'}, {'phase': 'new_moon'},
                 {'phase': 'first_quarter'}):
        for cloud in climates:
            pass
        assert collect_climate_notes_by_phase(climates, moon) == \
            collect_climate_notes_by_phase(climates, moon, nl)
    # heavy night cloud hides a full moon identically on both paths
    cloudy = [sample(temp=0, cloud=95, wind=5, phase='night')]
    assert collect_climate_notes_by_phase(cloudy, {'phase': 'full_moon'}) == \
        collect_climate_notes_by_phase(cloudy, {'phase': 'full_moon'}, nl)


# ---------------------------------------------------------------------------
# Multi-day climate states: build streaks that trigger each state
# ---------------------------------------------------------------------------

def day(temp, wind, prec, phase='morning'):
    return {'climate': [sample(temp=temp, wind=wind, prec=prec, phase=phase)]}


@pytest.mark.parametrize('days,expected', [
    ([day(0, 5, 0.3), day(0, 5, 0.3)], ['snowbound']),                      # snow streak
    ([day(10, 5, 0.6), day(10, 5, 0.6)], ['drenched']),                     # rain streak
    ([day(10, 30, 0), day(10, 30, 0)], ['storm_lashed']),                   # wind streak
    ([day(-12, 5, 0), day(-12, 5, 0)], ['frozen']),                         # cold streak
    ([day(35, 5, 0), day(35, 5, 0)], ['scorched']),                         # heat streak
    ([day(10, 5, 0.1), day(10, 5, 0.1)], []),                               # mild, no state
    ([day(0, 5, 0.3), day(10, 5, 0)], []),                                  # streak broken
])
def test_resolve_climate_state_equivalence(nl, days, expected):
    from app.natural_language.climate_notes import resolve_climate_state
    plain = resolve_climate_state(days, rng0())
    packed = resolve_climate_state(days, rng0(), nl)
    assert plain == packed
    assert plain['active'] == expected


def test_moon_phrase_equivalence(nl):
    from app.natural_language.climate_notes import format_moon_night_phrase
    for moon in (None, {}, {'phase': 'new_moon'}, {'phase': 'full_moon'},
                 {'phase': 'waxing_gibbous'}, {'phase': 'last_quarter'}):
        for cloud in (None, 10, 70, 95):
            assert format_moon_night_phrase(moon, cloud) == \
                format_moon_night_phrase(moon, cloud, nl)


# ---------------------------------------------------------------------------
# End-to-end at the prompt level: same day -> byte-identical user prompt
# ---------------------------------------------------------------------------

def test_build_day_prompt_equivalence(nl):
    from app.prompt.builder import build_day_prompt
    day = {
        'day_number': 3,
        'date': '1950-01-19',
        'rng': rng0(),
        'climate': [
            sample(temp=6, cloud=30, wind=10, prec=0, phase='morning'),
            sample(temp=14, cloud=55, wind=22, prec=0.3, phase='afternoon'),
            sample(temp=1, cloud=15, wind=4, prec=0, phase='night'),
        ],
        'moon_phase': {'phase': 'full_moon'},
        'regions': [{'name': 'Eriador', 'description_summary': 'old lands'}],
        'road_types': {'road': 12.5},
    }
    plain = build_day_prompt(day=day)
    packed = build_day_prompt(day=day, nl=nl)
    assert plain['user'] == packed['user']
    assert plain['system'] == packed['system']


# ---------------------------------------------------------------------------
# The point of the whole layer: editing a row changes the output
# ---------------------------------------------------------------------------

def test_edited_band_changes_output(nl):
    from app.mind.nl_resolver import invalidate
    from app.mind.tables import NlBand
    from app.natural_language.climate_notes import summarise_weather

    records = [sample(temp=4)['climate']]  # falls in the 'cold' band
    before = summarise_weather(records, nl)

    band = nl._session.query(NlBand).filter_by(
        game_id='middle_earth', table_name='temperature', ordinal=1
    ).one()
    original = band.phrase
    try:
        band.phrase = 'glacial'
        nl._session.commit()
        invalidate('middle_earth')
        after = summarise_weather(records, nl)
        assert after != before
        assert 'glacial' in after
    finally:
        band.phrase = original
        nl._session.commit()
        invalidate('middle_earth')
        assert summarise_weather(records, nl) == before
