# ============================================================================
# Narrate a day
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/narrator/narrateDay.js. The single
# entry point for turning a resolved day into prose: assembles the prompt and
# calls the LLM.
#
# Difference from the Node original: narrateDay.js calls tripHistory.js
# itself (DB reads) to get previousDay/recentDayClimates. This service has
# no DB access, so Node resolves those values first (tripHistory.js,
# unchanged) and sends them in the payload. resolve_climate_state
# (multi-day climate) is computed here from recent_day_climates, exactly
# as narrateDay.js does with resolveClimateState.
# ============================================================================
import random

from app.ai import generate_narrative, translate_text
from app.evals.eval_runner import run_narrative_evals
from app.natural_language import resolve_climate_state
from app.prompt.builder import build_day_prompt

INNER_LANGUAGE = 'english'


def narrate_day(
    day,
    trip=None,
    character=None,
    language='english',
    character_state=None,
    equipment_state=None,
    fate=None,
    previous_day=None,
    recent_day_climates=None,
    mind_block='',
    impressions=None,
    memory_beats=None,
    nl=None,
):
    trip = trip or {}
    character = character or {}
    recent_day_climates = recent_day_climates or []

    rng = day.get('rng') or random.random

    climate_state = resolve_climate_state(recent_day_climates, rng, nl)
    climate_state_block = climate_state['narrative']

    # ADR 0003: the narration is always written in the inner language
    # (English); another reader language is a translation of the finished
    # text, never a second way of narrating.
    prompt = build_day_prompt(
        day=day,
        trip=trip,
        character=character,
        language=INNER_LANGUAGE,
        previous_day=previous_day,
        character_state=character_state,
        equipment_state=equipment_state,
        fate=fate,
        climate_state_block=climate_state_block,
        mind_block=mind_block,
        memory_beats=memory_beats,
        nl=nl,
    )

    generation = generate_narrative(prompt, day.get('day_number'))
    inner_text = generation.get('text')

    run_narrative_evals(
        narrative=inner_text,
        day=day,
        character_name=character.get('name') or 'Aranath',
        impressions=impressions,
    )

    # `text` is what the reader gets; `inner_text` is what the Mind
    # measures (Resonated). A failed translation still delivers the
    # inner-language chapter rather than nothing.
    generation = {**generation, 'inner_text': inner_text, 'language': INNER_LANGUAGE}
    if inner_text and language and language.lower() != INNER_LANGUAGE:
        translated = translate_text(inner_text, language)
        if translated:
            generation.update(text=translated, language=language.lower())

    return {'prompt': prompt, 'generation': generation}
