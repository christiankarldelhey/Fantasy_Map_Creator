// ============================================================================
// Phrase-vice detection (anti-repetition)
// ----------------------------------------------------------------------------
// Reads the narratives already written for a trip and finds the multi-word
// phrases (n-grams) the model keeps reaching for. These are fed back into the
// next chapter's prompt as an explicit "do not reuse" list, so the generator
// is nudged off its habitual phrasing without us hand-curating a banlist.
//
// Guardrails so we never break natural language:
//   - only phrases of 2–4 words are considered;
//   - a phrase made up ONLY of stopwords/function words is discarded (banning
//     "of the" or "de la" would cripple the prose);
//   - a phrase must recur across the corpus (≥2 chapters, or ≥3 times total);
//   - overlapping phrases collapse to the longest variant;
//   - the final list is capped so the model keeps room to write.
// ============================================================================

const STOPWORDS = new Set([
  // English function words
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'than', 'as', 'of', 'to',
  'in', 'on', 'at', 'by', 'for', 'with', 'from', 'into', 'onto', 'over', 'under',
  'up', 'down', 'out', 'off', 'about', 'is', 'was', 'were', 'are', 'be', 'been',
  'being', 'am', 'it', 'its', 'he', 'she', 'they', 'them', 'his', 'her', 'their',
  'him', 'you', 'your', 'we', 'our', 'i', 'me', 'my', 'this', 'that', 'these',
  'those', 'there', 'here', 'had', 'has', 'have', 'do', 'did', 'does', 'not',
  'no', 'so', 'too', 'very', 'more', 'most', 'some', 'any', 'all', 'each',
  'which', 'who', 'whom', 'whose', 'what', 'when', 'where', 'why', 'how',
  'would', 'could', 'should', 'will', 'shall', 'may', 'might', 'must', 'can',
  'one', 'two', 'now', 'yet', 'still', 'again', 'once', 'upon',
  // Spanish function words
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'u', 'e',
  'pero', 'si', 'no', 'de', 'del', 'al', 'a', 'ante', 'con', 'sin', 'sobre',
  'tras', 'por', 'para', 'en', 'entre', 'hacia', 'hasta', 'desde', 'que',
  'como', 'cuando', 'donde', 'quien', 'cual', 'cuyo', 'es', 'era', 'son',
  'fue', 'ser', 'estar', 'esta', 'este', 'esto', 'ese', 'esa', 'eso', 'aquel',
  'su', 'sus', 'mi', 'mis', 'tu', 'tus', 'lo', 'le', 'les', 'me', 'te', 'se',
  'nos', 'yo', 'el', 'ella', 'ellos', 'ellas', 'muy', 'mas', 'más', 'ya',
  'aun', 'aún', 'tan', 'todo', 'toda', 'todos', 'todas', 'algun', 'alguna',
  'ha', 'han', 'habia', 'había', 'fueron', 'eran',
]);

const MIN_N = 2;
const MAX_N = 4;
const MIN_OCCURRENCES = 3;   // total times across the whole corpus
const MIN_CHAPTERS = 2;      // OR appears in at least this many chapters
const MAX_PHRASES = 15;      // cap so we never over-constrain the prose

/**
 * Split a narrative into lowercase word tokens (letters incl. accents + apostrophes).
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  const matches = text
    .toLowerCase()
    .match(/[a-zà-öø-ÿñ]+(?:'[a-zà-öø-ÿñ]+)?/gi);
  return matches || [];
}

/**
 * True when every word in the phrase is a stopword (so banning it would hurt
 * natural sentence flow rather than remove a distinctive vice).
 * @param {string[]} words
 * @returns {boolean}
 */
function isAllStopwords(words) {
  return words.every((w) => STOPWORDS.has(w));
}

/**
 * Extract the repeated distinctive phrases from a set of prior narratives.
 * @param {string[]} priorNarratives - narrative text of previous chapters
 * @param {{ maxPhrases?: number }} [options]
 * @returns {string[]} phrases to ban, longest/most-frequent first
 */
export function extractRepeatedPhrases(priorNarratives, options = {}) {
  const maxPhrases = options.maxPhrases ?? MAX_PHRASES;
  const texts = (priorNarratives || []).filter((t) => typeof t === 'string' && t.trim());
  if (texts.length === 0) return [];

  // phrase -> { total, chapters:Set<number> }
  const stats = new Map();

  texts.forEach((text, chapterIdx) => {
    const words = tokenize(text);
    for (let n = MIN_N; n <= MAX_N; n++) {
      for (let i = 0; i + n <= words.length; i++) {
        const slice = words.slice(i, i + n);
        if (isAllStopwords(slice)) continue;
        const phrase = slice.join(' ');
        let entry = stats.get(phrase);
        if (!entry) {
          entry = { total: 0, chapters: new Set() };
          stats.set(phrase, entry);
        }
        entry.total += 1;
        entry.chapters.add(chapterIdx);
      }
    }
  });

  // Keep phrases that recur meaningfully.
  const candidates = [];
  for (const [phrase, { total, chapters }] of stats.entries()) {
    if (total >= MIN_OCCURRENCES || chapters.size >= MIN_CHAPTERS) {
      candidates.push({ phrase, total, chapters: chapters.size, words: phrase.split(' ').length });
    }
  }

  // Rank: broader spread across chapters first, then raw frequency, then longer.
  candidates.sort((a, b) =>
    b.chapters - a.chapters || b.total - a.total || b.words - a.words
  );

  // Collapse overlaps: drop a phrase if a longer, already-kept phrase contains it.
  const kept = [];
  for (const cand of candidates) {
    const subsumed = kept.some(
      (k) => k.words > cand.words && k.phrase.includes(cand.phrase)
    );
    if (subsumed) continue;
    kept.push(cand);
    if (kept.length >= maxPhrases) break;
  }

  return kept.map((k) => k.phrase);
}
