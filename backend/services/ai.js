import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

// ============================================================================
// AI Service (Gemini + Groq fallback)
// ----------------------------------------------------------------------------
// Generates narrative text using Gemini 2.0 Flash as primary provider.
// Falls back to Groq (llama-3.3-70b-versatile) if Gemini hits rate limits,
// first with GROQ_API_KEY and then with GROQ_API_KEY_2.
// ============================================================================

let geminiClient = null;
let primaryClient = null;
let secondaryClient = null;

const GEMINI_MODEL = 'gemini-2.0-flash';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const PLACEHOLDER_KEY = 'your_groq_api_key_here';

// --- Sampling variation (anti-repetition) ---------------------------------
// Deterministic per-day temperature rotation: breaks the model's habitual
// phrasing bias without going fully random (reproducible if a day is regen'd).
const TEMP_ROTATION = [0.68, 0.74, 0.79, 0.71, 0.82, 0.66, 0.76];
// Penalties are constant for now, but returned/persisted per chapter so the
// System tab stays truthful and future tuning is reflected historically.
const FREQUENCY_PENALTY = 0.35; // Groq range 0–1; also valid for Gemini
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

function getGeminiClient() {
  if (geminiClient !== null) return geminiClient;

  const apiKey = process.env.GEMINI_API_KEY;
  console.log('AI Service: Initializing Gemini client with GEMINI_API_KEY present:', !!apiKey);

  if (!isValidKey(apiKey)) {
    console.warn('Gemini AI not configured (missing GEMINI_API_KEY)');
    geminiClient = null;
  } else {
    geminiClient = new GoogleGenerativeAI(apiKey);
    console.log('AI Service: Gemini client initialized successfully');
  }
  return geminiClient;
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

async function tryGenerateGemini(client, messages, sampling) {
  const systemMessage = messages.find(m => m.role === 'system');
  const userMessage = messages.find(m => m.role === 'user') || { content: '' };

  const model = client.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: systemMessage?.content,
  });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userMessage.content }] }],
    generationConfig: {
      temperature: sampling.temperature,
      topP: sampling.top_p,
      frequencyPenalty: sampling.frequency_penalty,
      presencePenalty: sampling.presence_penalty,
      maxOutputTokens: 2048,
    },
  });

  const content = result.response?.text?.() || null;
  console.log('✅ Narrative generated successfully with Gemini, length:', content?.length || 0);
  return content;
}

async function tryGenerateGroq(client, messages, sampling) {
  const response = await client.chat.completions.create({
    model: GROQ_MODEL,
    messages,
    temperature: sampling.temperature,
    top_p: sampling.top_p,
    frequency_penalty: sampling.frequency_penalty,
    presence_penalty: sampling.presence_penalty,
    max_tokens: 2048,
  });

  const content = response.choices[0]?.message?.content || null;
  console.log('✅ Narrative generated successfully with Groq, length:', content?.length || 0);
  return content;
}

/**
 * Build the ordered list of generation attempts for a given day.
 * Provider rotation: even days try Gemini first, odd days try Groq first.
 * The other provider (and the secondary Groq key) always remain as fallbacks,
 * so resilience is preserved while the lead voice alternates per chapter.
 * @param {number} dayNumber
 * @returns {Array<{ provider: 'gemini'|'groq', getClient: Function, run: Function }>}
 */
function buildAttemptOrder(dayNumber) {
  const geminiAttempt = {
    provider: 'gemini',
    getClient: getGeminiClient,
    run: tryGenerateGemini,
  };
  const groqPrimaryAttempt = {
    provider: 'groq',
    getClient: getPrimaryClient,
    run: tryGenerateGroq,
  };
  const groqSecondaryAttempt = {
    provider: 'groq',
    getClient: getSecondaryClient,
    run: tryGenerateGroq,
  };

  const n = Number.isInteger(dayNumber) ? dayNumber : 0;
  const groqLeads = ((n % 2) + 2) % 2 === 1; // odd day -> Groq leads
  return groqLeads
    ? [groqPrimaryAttempt, geminiAttempt, groqSecondaryAttempt]
    : [geminiAttempt, groqPrimaryAttempt, groqSecondaryAttempt];
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
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const API_KEY = process.env.GROQ_API_KEY;
  const API_KEY_2 = process.env.GROQ_API_KEY_2;
  return isValidKey(GEMINI_API_KEY) ||
         isValidKey(API_KEY) ||
         isValidKey(API_KEY_2);
}
