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

async function tryGenerateGemini(client, messages) {
  const systemMessage = messages.find(m => m.role === 'system');
  const userMessage = messages.find(m => m.role === 'user') || { content: '' };

  const model = client.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: systemMessage?.content,
  });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userMessage.content }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  });

  const content = result.response?.text?.() || null;
  console.log('✅ Narrative generated successfully with Gemini, length:', content?.length || 0);
  return content;
}

async function tryGenerateGroq(client, messages) {
  const response = await client.chat.completions.create({
    model: GROQ_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 2048,
  });

  const content = response.choices[0]?.message?.content || null;
  console.log('✅ Narrative generated successfully with Groq, length:', content?.length || 0);
  return content;
}

/**
 * Generate narrative text from a prompt using Gemini as primary provider.
 * @param {string|{system?:string, user:string}} prompt - a plain user prompt,
 *        or an object with separate system and user messages.
 * @returns {Promise<string|null>} The generated text, or null if AI is not configured
 */
export async function generateNarrative(prompt) {
  const messages = parseMessages(prompt);
  console.log('🤖 Attempting to generate narrative...');
  console.log('📝 Prompt length:', messages[messages.length - 1]?.content?.length || 0);

  // Try Gemini first
  const gemini = getGeminiClient();
  if (gemini) {
    try {
      const content = await tryGenerateGemini(gemini, messages);
      if (content) return content;
    } catch (error) {
      console.warn('⚠️ Gemini client failed:', error.message);
      if (isRateLimitError(error)) {
        console.log('� Gemini rate limit hit, attempting fallback to Groq...');
      } else {
        return null;
      }
    }
  }

  // Fallback to primary Groq client
  const primary = getPrimaryClient();
  if (primary) {
    try {
      const content = await tryGenerateGroq(primary, messages);
      if (content) return content;
    } catch (error) {
      console.warn('⚠️ Primary Groq client failed:', error.message);
      if (isRateLimitError(error)) {
        console.log('🔄 Groq rate limit hit, attempting fallback to secondary API key...');
      } else {
        return null;
      }
    }
  }

  // Fallback to secondary Groq client
  const secondary = getSecondaryClient();
  if (secondary) {
    try {
      const content = await tryGenerateGroq(secondary, messages);
      if (content) {
        console.log('✅ Narrative generated successfully using secondary Groq API key');
        return content;
      }
    } catch (error) {
      console.error('❌ Secondary Groq client also failed:', error.message);
    }
  }

  console.error('❌ No narrative could be generated (all providers failed or unavailable)');
  return null;
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
