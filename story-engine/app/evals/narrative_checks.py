# ============================================================================
# Narrative quality checks
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/evals/narrativeChecks.js.
# ============================================================================
import unicodedata

OPENING_WINDOW = 200
MOVEMENT_PREFIXES = ['camin', 'avanz', 'muev', 'despert', 'levant', 'sigu', 'continu', 'march', 'and', 'part', 'recorr', 'cruzu', 'desplaz']


def _normalize(text=''):
    text = text or ''
    normalized = unicodedata.normalize('NFD', text.lower())
    return ''.join(c for c in normalized if unicodedata.category(c) != 'Mn')


def _starts_with_aranath_movement(narrative, character_name='Aranath'):
    norm = _normalize(narrative)
    first_sentence = norm.split('.', 1)[0] if norm else ''
    name = _normalize(character_name)
    words = [w for w in first_sentence.strip().split(' ') if w]
    starts_with_name = bool(words) and words[0] == name
    has_walking_verb = any(any(w.startswith(p) for p in MOVEMENT_PREFIXES) for w in words)
    return starts_with_name, has_walking_verb, first_sentence.strip()


def check_opening(narrative, character_name='Aranath'):
    print('[check:opening] checking opening against', character_name)
    starts_with_name, has_walking_verb, first_sentence = _starts_with_aranath_movement(narrative, character_name)
    ok = not starts_with_name and not has_walking_verb
    result = {'name': 'opening_no_aranath_walking', 'ok': ok, 'details': {'firstSentence': first_sentence}}
    if not ok:
        result['reason'] = (
            'the first sentence starts with the character name' if starts_with_name
            else 'the first words contain a movement/waking verb'
        )
    print('[check:opening]', 'PASS' if ok else 'FAIL')
    return result


def check_prompt_quotes(narrative, prompt_text=''):
    print('[check:prompt_quote] scanning for copied prompt phrases')
    text = _normalize(narrative)
    norm_prompt = _normalize(prompt_text)
    candidates = [s.strip() for s in norm_prompt.split('.') if len(s.strip()) >= 40]
    found = []
    for phrase in candidates:
        if phrase in text:
            found.append(phrase[:80])
    ok = len(found) == 0
    result = {'name': 'prompt_quote', 'ok': ok, 'details': {'found': found}}
    if not ok:
        result['reason'] = f'narrative copies {len(found)} prompt phrase(s)'
    print('[check:prompt_quote]', 'PASS' if ok else 'FAIL')
    return result


def check_encounters_presented(narrative, encounters=None):
    encounters = encounters or []
    print('[check:encounters] checking', len(encounters), 'encounters')
    text = _normalize(narrative)
    missing = []
    for encounter in encounters:
        name = (encounter.get('entity') or {}).get('name')
        if not name:
            continue
        tokens = []
        for word in name.split('(')[0].strip().lower().split(' '):
            tokens.extend(word.split('-'))
        tokens = [t for t in tokens if len(t) > 2]
        present = any(t in text for t in tokens)
        if not present:
            missing.append(name)
    ok = len(missing) == 0
    result = {'name': 'encounters_presented', 'ok': ok, 'details': {'missing': missing}}
    if not ok:
        result['reason'] = 'missing encounter(s): ' + ', '.join(missing)
    print('[check:encounters]', 'PASS' if ok else 'FAIL', missing)
    return result


def check_scenery_inventory(narrative):
    print('[check:scenery_inventory] checking first 500 chars for inventory lists')
    first_chunk = (narrative or '')[:500].lower()

    def count_occurrences(needle):
        count = 0
        idx = first_chunk.find(needle)
        while idx != -1:
            count += 1
            idx = first_chunk.find(needle, idx + 1)
        return count

    count = count_occurrences('había')
    no_count = count_occurrences('no había')
    total = count + no_count
    ok = total <= 2
    result = {'name': 'scenery_inventory', 'ok': ok, 'details': {'habia_count': total}}
    if not ok:
        result['reason'] = f'first paragraph uses {total} había/no había (inventory-style)'
    print('[check:scenery_inventory]', 'PASS' if ok else 'FAIL', total)
    return result


# Words too common to count as a memory reference on their own.
_LENS_STOPWORDS = {
    'the', 'a', 'an', 'of', 'and', 'or', 'in', 'on', 'at', 'to', 'with',
    'cold', 'hot', 'wet', 'dry', 'wind', 'road', 'day', 'night', 'camp',
}


def check_lens_reference(narrative, impressions=None):
    """Did the narrative echo what the mind stirred? Passes when at least
    one evoked memory's desc contributes a distinctive token (>=4 chars,
    not a stopword) that appears in the text. With no impressions there is
    nothing to echo — skipped as ok."""
    impressions = [i for i in (impressions or []) if i]
    print('[check:lens_reference] checking', len(impressions), 'impressions')
    if not impressions:
        return {'name': 'lens_reference', 'ok': True, 'details': {'skipped': True}}
    text = _normalize(narrative)
    hits = []
    for desc in impressions:
        tokens = [
            t for t in _normalize(desc).replace(':', ' ').split()
            if len(t) >= 4 and t not in _LENS_STOPWORDS
        ]
        if any(t in text for t in tokens):
            hits.append(desc)
    ok = len(hits) > 0
    result = {'name': 'lens_reference', 'ok': ok, 'details': {'echoed': hits}}
    if not ok:
        result['reason'] = 'narrative never echoes any evoked memory'
    print('[check:lens_reference]', 'PASS' if ok else 'FAIL', hits)
    return result
