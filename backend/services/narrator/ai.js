import Groq from 'groq-sdk';

// ============================================================================
// AI Service (Groq only)
// ----------------------------------------------------------------------------
// Generates narrative text using Groq (Qwen 3.6 27B) as primary provider,
// with GROQ_API_KEY_2 as fallback if the first key hits rate limits.
// ============================================================================

let primaryClient = null;
let secondaryClient = null;

const GROQ_MODEL = 'qwen/qwen3.6-27b';
const PLACEHOLDER_KEY = 'your_groq_api_key_here';

// --- Sampling variation (anti-repetition) ---------------------------------
// Deterministic per-day temperature rotation: breaks the model's habitual
// phrasing bias without going fully random (reproducible if a day is regen'd).
const TEMP_ROTATION = [0.68, 0.74, 0.79, 0.71, 0.82, 0.66, 0.76];
// Penalties are constant for now, but returned/persisted per chapter so the
// System tab stays truthful and future tuning is reflected historically.
const FREQUENCY_PENALTY = 0.35; // Groq range 0–1
const PRESENCE_PENALTY = 0.15;
const TOP_P = 0.92;

function samplingParamsForDay(dayNumber) {
  const n = Number.isInteger(dayNumber) ? dayNumber : 0;
  return {
    temperature: TEMP_ROTATION[((n % TEMP_ROTATION.length) + TEMP_ROTATION.length) % TEMP_ROTATION.length],
    frequency_penalty: FREQUENCY_PENALTY,
    presence_penalty: PRESENCE_PENALTY,
    top_p: TOP_P,
  };
}

function isValidKey(key) {
  return key && key !== PLACEHOLDER_KEY;
}

function initializeGroqClient(apiKey) {
  if (!isValidKey(apiKey)) {
    console.warn('Groq AI not configured (missing GROQ_API_KEY)');
    return null;
  }

  return new Groq({ apiKey });
}

function getPrimaryClient() {
  if (primaryClient !== null) return primaryClient;

  const API_KEY = process.env.GROQ_API_KEY;
  console.log('AI Service: Initializing primary Groq client with GROQ_API_KEY present:', !!API_KEY);

  primaryClient = initializeGroqClient(API_KEY);
  if (primaryClient) {
    console.log('AI Service: Primary Groq client initialized successfully');
  }
  return primaryClient;
}

function getSecondaryClient() {
  if (secondaryClient !== null) return secondaryClient;

  const API_KEY_2 = process.env.GROQ_API_KEY_2;
  console.log('AI Service: Initializing secondary Groq client with GROQ_API_KEY_2 present:', !!API_KEY_2);

  secondaryClient = initializeGroqClient(API_KEY_2);
  if (secondaryClient) {
    console.log('AI Service: Secondary Groq client initialized successfully');
  }
  return secondaryClient;
}

function isRateLimitError(error) {
  return error?.status === 429 || error?.code === 'rate_limit_exceeded';
}

function parseMessages(prompt) {
  const messages = [];
  if (prompt && typeof prompt === 'object') {
    if (prompt.system) messages.push({ role: 'system', content: prompt.system });
    messages.push({ role: 'user', content: prompt.user || '' });
  } else {
    messages.push({ role: 'user', content: String(prompt || '') });
  }
  return messages;
}

async function tryGenerateGroq(client, messages, sampling) {
  const response = await client.chat.completions.create({
    model: GROQ_MODEL,
    messages,
    temperature: sampling.temperature,
    top_p: sampling.top_p,
    frequency_penalty: sampling.frequency_penalty,
    presence_penalty: sampling.presence_penalty,
    max_tokens: 4096,
    reasoning_effort: 'none', // Qwen 3.x: skip thinking entirely (no reasoning token cost)
  });

  let content = response.choices[0]?.message?.content || null;
  // Safety net: strip any residual <think> tags if the model emits them anyway.
  if (content) {
    content = content.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim();
  }
  console.log('✅ Narrative generated successfully with Groq, length:', content?.length || 0);
  return content;
}

/**
 * Build the ordered list of generation attempts.
 * Tries primary Groq key first, then secondary as fallback.
 * @returns {Array<{ provider: 'groq', getClient: Function, run: Function }>}
 */
function buildAttemptOrder() {
  return [
    { provider: 'groq', getClient: getPrimaryClient, run: tryGenerateGroq },
    { provider: 'groq', getClient: getSecondaryClient, run: tryGenerateGroq },
  ];
}

/**
 * Generate narrative text from a prompt, rotating provider and sampling params
 * per day to reduce repetition.
 * @param {string|{system?:string, user:string}} prompt - a plain user prompt,
 *        or an object with separate system and user messages.
 * @param {{ dayNumber?: number }} [options]
 * @returns {Promise<{ text: string|null, ia_provider: string|null,
 *   temperature: number, frequency_penalty: number, presence_penalty: number,
 *   top_p: number }>} The generated text plus the sampling metadata actually used.
 */
export async function generateNarrative(prompt, options = {}) {
  const { dayNumber } = options;
  const messages = parseMessages(prompt);
  const sampling = samplingParamsForDay(dayNumber);
  const meta = {
    ia_provider: null,
    temperature: sampling.temperature,
    frequency_penalty: sampling.frequency_penalty,
    presence_penalty: sampling.presence_penalty,
    top_p: sampling.top_p,
  };

  console.log('🤖 Attempting to generate narrative...');
  console.log('📝 Prompt length:', messages[messages.length - 1]?.content?.length || 0);
  console.log(`🎛️ Day ${dayNumber ?? '?'} sampling:`, sampling);

  const attempts = buildAttemptOrder(dayNumber);
  for (const attempt of attempts) {
    const client = attempt.getClient();
    if (!client) continue;
    try {
      const content = await attempt.run(client, messages, sampling);
      if (content) {
        return { ...meta, text: content, ia_provider: attempt.provider };
      }
    } catch (error) {
      console.warn(`⚠️ ${attempt.provider} client failed:`, error.message);
      if (isRateLimitError(error)) {
        console.log(`🔄 ${attempt.provider} rate limit hit, attempting next fallback...`);
      }
      // Non-rate-limit errors: still fall through to the next provider so a
      // transient failure on the lead model doesn't lose the chapter.
    }
  }

  console.error('❌ No narrative could be generated (all providers failed or unavailable)');
  return { ...meta, text: null };
}

/**
 * Check if AI is properly configured.
 * @returns {boolean}
 */
export function isAIConfigured() {
  const API_KEY = process.env.GROQ_API_KEY;
  const API_KEY_2 = process.env.GROQ_API_KEY_2;
  return isValidKey(API_KEY) || isValidKey(API_KEY_2);
}
