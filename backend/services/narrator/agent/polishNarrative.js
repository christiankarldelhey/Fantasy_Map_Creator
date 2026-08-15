import { generateNarrative } from '../ai.js';
import { buildDayPrompt } from '../../prompt/index.js';
import { runNarrativeEvals } from '../../evals/evalRunner.js';

export async function polishNarrative({ day, trip, character, ...opts }) {
  console.log('[polishNarrative] starting for day', day.day_number);
  const prompt = buildDayPrompt({ day, trip, character, ...opts });
  let result = await generateNarrative(prompt, { dayNumber: day.day_number });
  if (!result.text) {
    console.warn('[polishNarrative] no draft generated');
    return { ...result, ok: false, checks: [] };
  }
  let evals = runNarrativeEvals({
    narrative: result.text,
    day,
    bannedPhrases: opts.bannedPhrases,
    characterName: character?.name || 'Aranath',
  });
  if (!evals.ok) {
    console.log('[polishNarrative] rewriting due to', evals.failed.length, 'failing checks');
    const rewriteUser = `The following narrative has quality problems. Rewrite it fixing ONLY these issues: ${evals.failed.map(f => `- ${f.name}: ${f.reason}`).join('. ')}. Original prompt: ${prompt.user}. Narrative to fix: ${result.text}`;
    const rewrite = await generateNarrative({ system: prompt.system, user: rewriteUser }, { dayNumber: day.day_number });
    if (rewrite.text) {
      console.log('[polishNarrative] re-running evals on rewrite');
      const reEvals = runNarrativeEvals({
        narrative: rewrite.text,
        day,
        bannedPhrases: opts.bannedPhrases,
        characterName: character?.name || 'Aranath',
      });
      result.text = rewrite.text;
      evals = reEvals;
    }
  }
  return { ...result, ...evals };
}
