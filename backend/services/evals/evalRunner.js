import {
  checkOpening,
  checkBannedPhrases,
  checkPromptQuotes,
  checkEncountersPresented,
  checkSceneryInventory,
} from './narrativeChecks.js';

export function runNarrativeEvals({ narrative, day, bannedPhrases = [], characterName = 'Aranath' }) {
  if (!narrative) {
    console.log('=== narrative eval skipped (no narrative generated) ===');
    return { ok: true, checks: [], failed: [] };
  }
  console.log('=== narrative eval start (day', day?.day_number, ') ===');
  const checks = [
    checkOpening(narrative, characterName),
    checkBannedPhrases(narrative, bannedPhrases),
    checkPromptQuotes(narrative, day?.prompt),
    checkEncountersPresented(narrative, day?.encounters),
    checkSceneryInventory(narrative),
  ];
  const failed = checks.filter(c => !c.ok);
  const ok = failed.length === 0;
  console.log('=== narrative eval end ===');
  console.log('overall:', ok ? 'PASS' : 'FAIL');
  console.log('passed:', checks.length - failed.length, '/', checks.length);
  if (failed.length > 0) {
    console.log('failed checks:');
    for (const f of failed) {
      console.log(' -', f.name, ':', f.reason);
    }
  }
  return { ok, checks, failed };
}
