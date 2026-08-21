import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runNarrativeEvals } from '../evalRunner.js';

const day = {
  day_number: 1,
  prompt: 'Aranath. Tall and silent. === AVOID THESE PHRASES === la foresta, se cernia. === MORNING === Weather: mild, heavy cloud cover and a passing shower. The way an encounter resolves must differ from how recent encounters resolved.',
  encounters: [
    { entity: { name: 'Chap-beech' } },
    { entity: { name: 'Loth-nu-Fuin (Glorious Lichen)' } },
  ],
};

const narrative = 'Aranath caminaba en silencio, sus pasos marcando el ritmo. La foresta parecía estar muriendo. No había pájaros, no había insectos, no había viento.';

test('narrativeChecks catch opening, banned phrases, scenery inventory and missing encounters', () => {
  const { ok, failed } = runNarrativeEvals({
    narrative,
    day,
    bannedPhrases: ['la foresta', 'se cernia'],
  });
  const failedNames = new Set(failed.map(f => f.name));
  console.log('TEST FAILED CHECKS:', [...failedNames]);
  assert.equal(ok, false);
  assert.ok(failedNames.has('opening_no_aranath_walking'));
  assert.ok(failedNames.has('banned_phrases'));
  assert.ok(failedNames.has('scenery_inventory'));
  assert.ok(failedNames.has('encounters_presented'));
  assert.ok(!failedNames.has('prompt_quote'));
});
