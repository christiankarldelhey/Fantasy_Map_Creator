# ============================================================================
# Text helpers shared by every natural-language module
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/naturalLanguage/text.js. Deliberately
# tiny and dependency-free.
# ============================================================================
import random
import re


def pick(arr, rng=random.random):
    """Pick one element from a list using the supplied rng (seedable for tests)."""
    return arr[int(rng() * len(arr))]


def join_list(arr):
    """Join a list in prose: "a", "a and b", "a, b and c". Blanks are dropped."""
    xs = [x for x in (arr or []) if x]
    if len(xs) == 0:
        return ''
    if len(xs) == 1:
        return xs[0]
    if len(xs) == 2:
        return f'{xs[0]} and {xs[1]}'
    return f"{', '.join(xs[:-1])} and {xs[-1]}"


def capitalize(text):
    """Uppercase the first character, leaving the rest untouched."""
    if not text:
        return ''
    return text[0].upper() + text[1:]


def description_suffix(description):
    """Trimmed " — description" suffix, or '' when there is nothing to append."""
    if description and description.strip():
        return f' — {description.strip()}'
    return ''


def readable_type(type_):
    """Turn a snake_case type into a readable label ("fortified_town" -> "fortified town")."""
    return re.sub(r'_', ' ', type_) if type_ else ''


def region_names_of(regions):
    """Region objects or bare strings -> plain region names."""
    return [r if isinstance(r, str) else r.get('name') for r in (regions or [])]
