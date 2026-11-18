# ============================================================================
# Narrate a day
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/narrator/narrateDay.js. The single
# entry point for turning a resolved day into prose: assembles the prompt and
# calls the LLM.
#
# Difference from the Node original: narrateDay.js calls tripHistory.js
# itself (DB reads) to get previousDay/recentDayClimates, and verbalizes
# the whole day into day.world_notes (#52) — this service consumes the
# host's prose verbatim and never phrases world numbers itself.
# ============================================================================
from app.ai import generate_narrative, translate_text
from app.evals.eval_runner import run_narrative_evals
from app.prompt.builder import build_day_prompt

INNER_LANGUAGE = 'english'

# Hosts may send ISO codes ('es') or names ('spanish'); the translator
# needs a language name — 'Es' alone reads as Estonian to the model.
_LANGUAGE_NAMES = {
    'en': 'english', 'es': 'spanish', 'fr': 'french', 'de': 'german',
    'it': 'italian', 'pt': 'portuguese', 'nl': 'dutch', 'ca': 'catalan',
}


def _reader_language(language):
    lang = (language or INNER_LANGUAGE).lower()
    return _LANGUAGE_NAMES.get(lang, lang)


def narrate_day(
    day,
    trip=None,
    character=None,
    language='english',
    character_state=None,
    equipment_state=None,
    fate=None,
    previous_day=None,
    previous_rest=None,
    recent_day_climates=None,
    mind_block='',
    impressions=None,
    memory_beats=None,
    world_notes=None,
    events=None,
):
    day = day or {}
    trip = trip or {}
    character = character or {}

    # The world's voice reaches the prompt through two channels
    # (ADR-0016): `events` carry the per-phase lived prose (weather,
    # meals, terrain, places, water as data.reading); `world_notes` —
    # or the episode's narration_notes — carries what is no lived
    # event (climate continuity, the camp lead-in, lands, equipage,
    # end state, journey context). The stateless path sends only
    # world_notes; an episode narrates from its own events.
    world_notes = world_notes if world_notes is not None else (
        day.get('world_notes') or {}
    )
    climate_state_block = world_notes.get('climate_state') or ''

    # ADR 0003: the narration is always written in the inner language
    # (English); another reader language is a translation of the finished
    # text, never a second way of narrating.
    prompt = build_day_prompt(
        day=day,
        trip=trip,
        character=character,
        language=INNER_LANGUAGE,
        previous_day=previous_day,
        # ADR-0019: where last night was spent — the skeleton's first
        # fixed point. The episode path passes the previous episode's
        # rest reading; the stateless path may name it in previousDay.
        previous_rest=previous_rest or (
            (previous_day or {}).get('overnight')
            or (previous_day or {}).get('rest')
        ),
        character_state=character_state,
        equipment_state=equipment_state,
        fate=fate,
        climate_state_block=climate_state_block,
        mind_block=mind_block,
        memory_beats=memory_beats,
        world_notes=world_notes,
        events=events,
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
    reader_language = _reader_language(language)
    if inner_text and reader_language != INNER_LANGUAGE:
        translated = translate_text(inner_text, reader_language)
        if translated:
            generation.update(text=translated, language=reader_language)

    return {'prompt': prompt, 'generation': generation}
