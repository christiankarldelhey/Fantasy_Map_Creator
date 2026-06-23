import Groq from 'groq-sdk';

// ============================================================================
// AI Service (Groq)
// ----------------------------------------------------------------------------
// Generates narrative text using Llama 3.1 70B model via Groq.
// ============================================================================

let client = null;

function initializeClient() {
  if (client !== null) return client; // Already initialized
  
  const API_KEY = process.env.GROQ_API_KEY;
  
  console.log('AI Service: Initializing with GROQ_API_KEY present:', !!API_KEY);
  
  if (!API_KEY || API_KEY === 'your_groq_api_key_here') {
    console.warn('Groq AI not configured (missing GROQ_API_KEY)');
    return null;
  }
  
  client = new Groq({ apiKey: API_KEY });
  console.log('AI Service: Groq client initialized successfully');
  return client;
}

/**
 * Generate narrative text from a prompt using Groq.
 * @param {string|{system?:string, user:string}} prompt - a plain user prompt,
 *        or an object with separate system and user messages.
 * @returns {Promise<string|null>} The generated text, or null if AI is not configured
 */
export async function generateNarrative(prompt) {
  const groqClient = initializeClient();
  if (!groqClient) {
    console.warn('⚠️ AI client not initialized, skipping narrative generation');
    return null;
  }

  const messages = [];
  if (prompt && typeof prompt === 'object') {
    if (prompt.system) messages.push({ role: 'system', content: prompt.system });
    messages.push({ role: 'user', content: prompt.user || '' });
  } else {
    messages.push({ role: 'user', content: String(prompt || '') });
  }

  console.log('🤖 Attempting to generate narrative with Groq...');
  console.log('📝 Prompt length:', messages[0]?.content?.length || 0);

  try {
    const response = await groqClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    });

    const content = response.choices[0]?.message?.content || null;
    console.log('✅ Narrative generated successfully, length:', content?.length || 0);
    return content;
  } catch (error) {
    console.error('❌ Error generating narrative with Groq:', error.message);
    console.error('Error details:', error);
    return null;
  }
}

/**
 * Check if AI is properly configured.
 * @returns {boolean}
 */
export function isAIConfigured() {
  const API_KEY = process.env.GROQ_API_KEY;
  return API_KEY && API_KEY !== 'your_groq_api_key_here';
}
