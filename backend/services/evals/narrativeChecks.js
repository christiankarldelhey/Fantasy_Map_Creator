const OPENING_WINDOW = 200;
const MOVEMENT_PREFIXES = ['camin', 'avanz', 'muev', 'despert', 'levant', 'sigu', 'continu', 'march', 'and', 'part', 'recorr', 'cruzu', 'desplaz'];

function normalize(text = '') {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function startsWithAranathMovement(narrative, characterName = 'Aranath') {
  const norm = normalize(narrative);
  const firstSentence = norm.split('.', 1)[0] || '';
  const name = normalize(characterName);
  const words = firstSentence.trim().split(' ').filter(Boolean);
  const startsWithName = words[0] === name;
  const hasWalkingVerb = words.some(w => MOVEMENT_PREFIXES.some(p => w.startsWith(p)));
  return { startsWithName, hasWalkingVerb, firstSentence: firstSentence.trim() };
}

export function checkOpening(narrative, characterName = 'Aranath') {
  console.log('[check:opening] checking opening against', characterName);
  const { startsWithName, hasWalkingVerb, firstSentence } = startsWithAranathMovement(narrative, characterName);
  const ok = !startsWithName && !hasWalkingVerb;
  const result = { name: 'opening_no_aranath_walking', ok, details: { firstSentence } };
  if (!ok) {
    result.reason = startsWithName
      ? 'the first sentence starts with the character name'
      : 'the first words contain a movement/waking verb';
  }
  console.log('[check:opening]', ok ? 'PASS' : 'FAIL');
  return result;
}

export function checkBannedPhrases(narrative, bannedPhrases = []) {
  console.log('[check:banned] checking', bannedPhrases.length, 'banned phrases');
  const text = normalize(narrative);
  const found = [];
  for (const phrase of bannedPhrases) {
    const p = normalize(phrase);
    if (p && text.includes(p)) {
      found.push(phrase);
    }
  }
  const ok = found.length === 0;
  const result = { name: 'banned_phrases', ok, details: { found } };
  if (!ok) result.reason = 'found banned phrase(s): ' + found.join('; ');
  console.log('[check:banned]', ok ? 'PASS' : 'FAIL', found);
  return result;
}

export function checkPromptQuotes(narrative, promptText = '') {
  console.log('[check:prompt_quote] scanning for copied prompt phrases');
  const text = normalize(narrative);
  const normPrompt = normalize(promptText);
  const candidates = normPrompt
    .split('.')
    .map(s => s.trim())
    .filter(s => s.length >= 40);
  const found = [];
  for (const phrase of candidates) {
    if (text.includes(phrase)) {
      found.push(phrase.slice(0, 80));
    }
  }
  const ok = found.length === 0;
  const result = { name: 'prompt_quote', ok, details: { found } };
  if (!ok) result.reason = 'narrative copies ' + found.length + ' prompt phrase(s)';
  console.log('[check:prompt_quote]', ok ? 'PASS' : 'FAIL');
  return result;
}

export function checkEncountersPresented(narrative, encounters = []) {
  console.log('[check:encounters] checking', encounters.length, 'encounters');
  const text = normalize(narrative);
  const missing = [];
  for (const encounter of encounters) {
    const name = encounter?.entity?.name;
    if (!name) continue;
    const tokens = name
      .split('(')[0]
      .trim()
      .toLowerCase()
      .split(' ')
      .flatMap(t => t.split('-'))
      .filter(t => t.length > 2);
    const present = tokens.some(t => text.includes(t));
    if (!present) missing.push(name);
  }
  const ok = missing.length === 0;
  const result = { name: 'encounters_presented', ok, details: { missing } };
  if (!ok) result.reason = 'missing encounter(s): ' + missing.join(', ');
  console.log('[check:encounters]', ok ? 'PASS' : 'FAIL', missing);
  return result;
}

export function checkSceneryInventory(narrative) {
  console.log('[check:scenery_inventory] checking first 500 chars for inventory lists');
  const firstChunk = narrative.slice(0, 500).toLowerCase();
  let count = 0;
  let idx = firstChunk.indexOf('había');
  while (idx !== -1) { count++; idx = firstChunk.indexOf('había', idx + 1); }
  let noCount = 0;
  idx = firstChunk.indexOf('no había');
  while (idx !== -1) { noCount++; idx = firstChunk.indexOf('no había', idx + 1); }
  const total = count + noCount;
  const ok = total <= 2;
  const result = { name: 'scenery_inventory', ok, details: { habia_count: total } };
  if (!ok) result.reason = 'first paragraph uses ' + total + ' había/no había (inventory-style)';
  console.log('[check:scenery_inventory]', ok ? 'PASS' : 'FAIL', total);
  return result;
}
