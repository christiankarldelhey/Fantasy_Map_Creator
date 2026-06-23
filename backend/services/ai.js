import Groq from 'groq-sdk';

// ============================================================================
// AI Service (Groq)
// ----------------------------------------------------------------------------
// Generates narrative text using Llama 3.1 70B model via Groq.
// Supports fallback to a secondary API key if the primary hits rate limits.
// ============================================================================

let primaryClient = null;
let secondaryClient = null;

function initializeClient(apiKey) {
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    console.warn('Groq AI not configured (missing GROQ_API_KEY)');
    return null;
  }

  return new Groq({ apiKey });
}

function getPrimaryClient() {
  if (primaryClient !== null) return primaryClient;

  const API_KEY = process.env.GROQ_API_KEY;
  console.log('AI Service: Initializing primary client with GROQ_API_KEY present:', !!API_KEY);

  primaryClient = initializeClient(API_KEY);
  if (primaryClient) {
    console.log('AI Service: Primary Groq client initialized successfully');
  }
  return primaryClient;
}

function getSecondaryClient() {
  if (secondaryClient !== null) return secondaryClient;

  const API_KEY_2 = process.env.GROQ_API_KEY_2;
  console.log('AI Service: Initializing secondary client with GROQ_API_KEY_2 present:', !!API_KEY_2);

  secondaryClient = initializeClient(API_KEY_2);
  if (secondaryClient) {
    console.log('AI Service: Secondary Groq client initialized successfully');
  }
  return secondaryClient;
}

/**
 * Generate narrative text from a prompt using Groq.
 * @param {string|{system?:string, user:string}} prompt - a plain user prompt,
 *        or an object with separate system and user messages.
 * @returns {Promise<string|null>} The generated text, or null if AI is not configured
 */
export async function generateNarrative(prompt) {
  const messages = [];
  if (prompt && typeof prompt === 'object') {
    if (prompt.system) messages.push({ role: 'system', content: prompt.system });
    messages.push({ role: 'user', content: prompt.user || '' });
  } else {
    messages.push({ role: 'user', content: String(prompt || '') });
  }

  console.log('🤖 Attempting to generate narrative with Groq...');
  console.log('📝 Prompt length:', messages[0]?.content?.length || 0);

  // Try primary client first
  const primary = getPrimaryClient();
  if (primary) {
    try {
      const content = await tryGenerate(primary, messages);
      if (content) return content;
    } catch (error) {
      console.warn('⚠️ Primary Groq client failed:', error.message);
      // If it's a rate limit error, try secondary
      if (error.status === 429 || error.code === 'rate_limit_exceeded') {
        console.log('🔄 Rate limit hit, attempting fallback to secondary API key...');
      } else {
        // For other errors, return null immediately
        return null;
      }
    }
  }

  // Fallback to secondary client
  const secondary = getSecondaryClient();
  if (secondary) {
    try {
      const content = await tryGenerate(secondary, messages);
      if (content) {
        console.log('✅ Narrative generated successfully using secondary API key');
        return content;
      }
    } catch (error) {
      console.error('❌ Secondary Groq client also failed:', error.message);
    }
  }

  console.error('❌ No narrative could be generated (both clients failed or unavailable)');
  return null;
}

async function tryGenerate(client, messages) {
  const response = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    temperature: 0.7,
    max_tokens: 2048,
  });

  const content = response.choices[0]?.message?.content || null;
  console.log('✅ Narrative generated successfully, length:', content?.length || 0);
  return content;
}

/**
 * Check if AI is properly configured.
 * @returns {boolean}
 */
export function isAIConfigured() {
  const API_KEY = process.env.GROQ_API_KEY;
  const API_KEY_2 = process.env.GROQ_API_KEY_2;
  return (API_KEY && API_KEY !== 'your_groq_api_key_here') ||
         (API_KEY_2 && API_KEY_2 !== 'your_groq_api_key_here');
}
