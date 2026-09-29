# ============================================================================
# Narrate a day
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/narrator/narrateDay.js. The single
# entry point for turning a resolved day into prose: assembles the prompt and
# calls the LLM.
#
# Difference from the Node original: narrateDay.js calls tripHistory.js
# itself (DB reads) to get previousDay/bannedPhrases/recentDayClimates/
# previousOpenings. This service has no DB access, so Node resolves those
# four values first (tripHistory.js, unchanged) and sends them in the payload.
# resolve_climate_state (multi-day climate) is computed here from
# recent_day_climates, exactly as narrateDay.js does with resolveClimateState.
# ============================================================================
import random

from app.ai import generate_narrative
from app.evals.eval_runner import run_narrative_evals
from app.natural_language import resolve_climate_state
from app.prompt.builder import build_day_prompt


def narrate_day(
    day,
    trip=None,
    character=None,
    language='english',
    character_state=None,
    equipment_state=None,
    fate=None,
    previous_day=None,
    banned_phrases=None,
    recent_day_climates=None,
    previous_openings=None,
    mind_block='',
    impressions=None,
    nl=None,
):
    trip = trip or {}
    character = character or {}
    banned_phrases = banned_phrases or []
    recent_day_climates = recent_day_climates or []
    previous_openings = previous_openings or []

    rng = day.get('rng') or random.random

    climate_state = resolve_climate_state(recent_day_climates, rng, nl)
    climate_state_block = climate_state['narrative']

    prompt = build_day_prompt(
        day=day,
        trip=trip,
        character=character,
        language=language,
        previous_day=previous_day,
        character_state=character_state,
        equipment_state=equipment_state,
        fate=fate,
        climate_state_block=climate_state_block,
        banned_phrases=banned_phrases,
        previous_openings=previous_openings,
        mind_block=mind_block,
        nl=nl,
    )

    generation = generate_narrative(prompt, day.get('day_number'))

    run_narrative_evals(
        narrative=generation.get('text'),
        day=day,
        banned_phrases=banned_phrases,
        character_name=character.get('name') or 'Aranath',
        impressions=impressions,
    )

    return {'prompt': prompt, 'generation': generation}
