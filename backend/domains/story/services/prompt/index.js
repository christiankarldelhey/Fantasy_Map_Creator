// ============================================================================
// Prompt barrel
// ----------------------------------------------------------------------------
// Prompt assembly (the former buildDayPrompt and its ./sections) moved to the
// story-engine Python service — see story-engine/app/prompt/builder.py.
// Node keeps only SYSTEM_PROMPT, which the frontend's System tab still reads
// straight from code via GET /api/trips/meta/system-prompt
// (domains/game/routes/trips.js), through domains/game/adapters/storyClient.js.
// ============================================================================

export { SYSTEM_PROMPT } from './systemPrompt.js';
