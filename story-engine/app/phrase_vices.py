# ============================================================================
# Phrase-vice detection (anti-repetition)
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/phraseVices.js.
# Reads the narratives already written for a trip and finds the multi-word
# phrases (n-grams) the model keeps reaching for. These are fed back into the
# next chapter's prompt as an explicit "do not reuse" list.
# ============================================================================
import re

STOPWORDS = {
    # English function words
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
    # Spanish function words
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'u', 'e',
    'pero', 'si', 'de', 'del', 'al', 'ante', 'con', 'sin', 'sobre',
    'tras', 'por', 'para', 'en', 'entre', 'hacia', 'hasta', 'desde', 'que',
    'como', 'cuando', 'donde', 'quien', 'cual', 'cuyo', 'es', 'era', 'son',
    'fue', 'ser', 'estar', 'esta', 'este', 'esto', 'ese', 'esa', 'eso', 'aquel',
    'su', 'sus', 'mi', 'mis', 'tu', 'tus', 'lo', 'le', 'les', 'te', 'se',
    'nos', 'yo', 'ella', 'ellos', 'ellas', 'muy', 'mas', 'más', 'ya',
    'aun', 'aún', 'tan', 'todo', 'toda', 'todos', 'todas', 'algun', 'alguna',
    'ha', 'han', 'habia', 'había', 'fueron', 'eran',
}

MIN_N = 2
MAX_N = 4
MIN_OCCURRENCES = 3   # total times across the whole corpus
MIN_CHAPTERS = 2       # OR appears in at least this many chapters
MAX_PHRASES = 15       # cap so we never over-constrain the prose

_TOKEN_RE = re.compile(r"[a-zà-öø-ÿñ]+(?:'[a-zà-öø-ÿñ]+)?", re.IGNORECASE)


def tokenize(text):
    """Split a narrative into lowercase word tokens (letters incl. accents + apostrophes)."""
    if not text or not isinstance(text, str):
        return []
    return _TOKEN_RE.findall(text.lower())


def _is_all_stopwords(words):
    """True when every word in the phrase is a stopword."""
    return all(w in STOPWORDS for w in words)


def extract_repeated_phrases(prior_narratives, max_phrases=None):
    """Extract the repeated distinctive phrases from a set of prior narratives.

    Returns phrases to ban, longest/most-frequent first.
    """
    max_phrases = max_phrases if max_phrases is not None else MAX_PHRASES
    texts = [t for t in (prior_narratives or []) if isinstance(t, str) and t.strip()]
    if len(texts) == 0:
        return []

    # phrase -> { total, chapters:set }
    stats = {}

    for chapter_idx, text in enumerate(texts):
        words = tokenize(text)
        for n in range(MIN_N, MAX_N + 1):
            for i in range(0, len(words) - n + 1):
                slice_ = words[i:i + n]
                if _is_all_stopwords(slice_):
                    continue
                phrase = ' '.join(slice_)
                entry = stats.setdefault(phrase, {'total': 0, 'chapters': set()})
                entry['total'] += 1
                entry['chapters'].add(chapter_idx)

    candidates = []
    for phrase, stat in stats.items():
        if stat['total'] >= MIN_OCCURRENCES or len(stat['chapters']) >= MIN_CHAPTERS:
            candidates.append({
                'phrase': phrase,
                'total': stat['total'],
                'chapters': len(stat['chapters']),
                'words': len(phrase.split(' ')),
            })

    # Rank: broader spread across chapters first, then raw frequency, then longer.
    candidates.sort(key=lambda c: (-c['chapters'], -c['total'], -c['words']))

    # Collapse overlaps: drop a phrase if a longer, already-kept phrase contains it.
    kept = []
    for cand in candidates:
        subsumed = any(k['words'] > cand['words'] and cand['phrase'] in k['phrase'] for k in kept)
        if subsumed:
            continue
        kept.append(cand)
        if len(kept) >= max_phrases:
            break

    return [k['phrase'] for k in kept]
