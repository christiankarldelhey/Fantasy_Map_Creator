# ============================================================================
# AI Service (Groq only)
# ----------------------------------------------------------------------------
# Generates narrative text using Groq with a chain of fallback models so that
# a single model deprecation or rate-limit does not break narration.
# Primary key is tried across all models first, then secondary key.
# ============================================================================
import os
import re
from typing import Optional

from groq import Groq

_primary_client: Optional[Groq] = None
_primary_client_loaded = False
_secondary_client: Optional[Groq] = None
_secondary_client_loaded = False

# Ordered fallback chain: each model is tried in sequence. If one gets
# deprecated by Groq, the next picks up automatically.
# Primary is the model that was already producing good narratives; the rest
# are free-tier fallbacks ordered by TPM quota (highest first).
GROQ_MODELS = [
    'qwen/qwen3.8-27b',                            # original primary, good quality
    'meta-llama/llama-4-scout-17b-16e-instruct',  # 30 RPM, 30K TPM, 1K RPD (free)
    'llama-3.3-70b-versatile',                     # 30 RPM, 12K TPM, 1K RPD (free)
    'openai/gpt-oss-120b',                         # 30 RPM,  8K TPM, 1K RPD (free)
]

# Models that accept reasoning_effort (Qwen 3.x thinking toggle).
_REASONING_EFFORT_MODELS = {'qwen/qwen3-32b', 'qwen/qwen3.6-27b', 'qwen/qwen3.8-27b'}

PLACEHOLDER_KEY = 'your_groq_api_key_here'

# --- Sampling variation (anti-repetition) ---------------------------------
# Deterministic per-day temperature rotation: breaks the model's habitual
# phrasing bias without going fully random (reproducible if a day is regen'd).
TEMP_ROTATION = [0.68, 0.74, 0.79, 0.71, 0.82, 0.66, 0.76]
# Penalties are constant for now, but returned/persisted per chapter so the
# System tab stays truthful and future tuning is reflected historically.
FREQUENCY_PENALTY = 0.35  # Groq range 0-1
PRESENCE_PENALTY = 0.15
TOP_P = 0.92

_THINK_TAG_RE = re.compile(r'<think>[\s\S]*?</think>\s*')


def sampling_params_for_day(day_number):
    n = day_number if isinstance(day_number, int) else 0
    return {
        'temperature': TEMP_ROTATION[((n % len(TEMP_ROTATION)) + len(TEMP_ROTATION)) % len(TEMP_ROTATION)],
        'frequency_penalty': FREQUENCY_PENALTY,
        'presence_penalty': PRESENCE_PENALTY,
        'top_p': TOP_P,
    }


def _is_valid_key(key):
    return bool(key) and key != PLACEHOLDER_KEY


def _initialize_groq_client(api_key):
    if not _is_valid_key(api_key):
        print('Groq AI not configured (missing GROQ_API_KEY)')
        return None
    return Groq(api_key=api_key)


def _get_primary_client():
    global _primary_client, _primary_client_loaded
    if _primary_client_loaded:
        return _primary_client
    api_key = os.environ.get('GROQ_API_KEY')
    print('AI Service: Initializing primary Groq client with GROQ_API_KEY present:', bool(api_key))
    _primary_client = _initialize_groq_client(api_key)
    _primary_client_loaded = True
    if _primary_client:
        print('AI Service: Primary Groq client initialized successfully')
    return _primary_client


def _get_secondary_client():
    global _secondary_client, _secondary_client_loaded
    if _secondary_client_loaded:
        return _secondary_client
    api_key_2 = os.environ.get('GROQ_API_KEY_2')
    print('AI Service: Initializing secondary Groq client with GROQ_API_KEY_2 present:', bool(api_key_2))
    _secondary_client = _initialize_groq_client(api_key_2)
    _secondary_client_loaded = True
    if _secondary_client:
        print('AI Service: Secondary Groq client initialized successfully')
    return _secondary_client


def _is_rate_limit_error(error):
    status = getattr(error, 'status_code', None) or getattr(error, 'status', None)
    code = getattr(error, 'code', None)
    return status == 429 or code == 'rate_limit_exceeded'


def _parse_messages(prompt):
    messages = []
    if isinstance(prompt, dict):
        if prompt.get('system'):
            messages.append({'role': 'system', 'content': prompt['system']})
        messages.append({'role': 'user', 'content': prompt.get('user') or ''})
    else:
        messages.append({'role': 'user', 'content': str(prompt or '')})
    return messages


def _try_generate_groq(client, messages, sampling, model):
    kwargs = dict(
        model=model,
        messages=messages,
        temperature=sampling['temperature'],
        top_p=sampling['top_p'],
        frequency_penalty=sampling['frequency_penalty'],
        presence_penalty=sampling['presence_penalty'],
        max_tokens=4096,
    )
    # Qwen 3.x: skip thinking entirely (no reasoning token cost).
    if model in _REASONING_EFFORT_MODELS:
        kwargs['reasoning_effort'] = 'none'
    response = client.chat.completions.create(**kwargs)
    content = response.choices[0].message.content if response.choices else None
    # Safety net: strip any residual <think> tags if the model emits them anyway.
    if content:
        content = _THINK_TAG_RE.sub('', content).strip()
    print(f'✅ Narrative generated with Groq ({model}), length:', len(content) if content else 0)
    return content


def _build_attempt_order():
    """Try every model with the primary key first, then every model with the
    secondary key. A deprecated model is skipped quickly and the secondary
    key only kicks in when the primary is rate-limited."""
    attempts = []
    for get_client in (_get_primary_client, _get_secondary_client):
        for model in GROQ_MODELS:
            attempts.append({
                'provider': 'groq',
                'model': model,
                'get_client': get_client,
                'run': _try_generate_groq,
            })
    return attempts


def generate_narrative(prompt, day_number=None):
    """Generate narrative text from a prompt, rotating provider and sampling params
    per day to reduce repetition.

    prompt: a plain string, or a dict with 'system'/'user' keys.
    Returns { text, ia_provider, temperature, frequency_penalty, presence_penalty, top_p }.
    """
    messages = _parse_messages(prompt)
    sampling = sampling_params_for_day(day_number)
    meta = {
        'ia_provider': None,
        'temperature': sampling['temperature'],
        'frequency_penalty': sampling['frequency_penalty'],
        'presence_penalty': sampling['presence_penalty'],
        'top_p': sampling['top_p'],
    }

    print('🤖 Attempting to generate narrative...')
    print('📝 Prompt length:', len(messages[-1]['content']) if messages and messages[-1].get('content') else 0)
    print(f"🎛️ Day {day_number if day_number is not None else '?'} sampling:", sampling)

    attempts = _build_attempt_order()
    for attempt in attempts:
        client = attempt['get_client']()
        if not client:
            continue
        try:
            content = attempt['run'](client, messages, sampling, attempt['model'])
            if content:
                return {**meta, 'text': content, 'ia_provider': attempt['model']}
        except Exception as error:  # noqa: BLE001 - mirrors the JS catch-all
            print(f"⚠️ {attempt['model']} failed:", error)
            if _is_rate_limit_error(error):
                print(f"🔄 {attempt['model']} rate limit hit, attempting next fallback...")
            # Non-rate-limit errors: still fall through to the next model so a
            # transient failure or deprecation doesn't lose the chapter.

    print('❌ No narrative could be generated (all providers failed or unavailable)')
    return {**meta, 'text': None}


def is_ai_configured():
    api_key = os.environ.get('GROQ_API_KEY')
    api_key_2 = os.environ.get('GROQ_API_KEY_2')
    return _is_valid_key(api_key) or _is_valid_key(api_key_2)
