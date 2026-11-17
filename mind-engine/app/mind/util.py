# ============================================================================
# Shared small helpers — one copy, one import
# ----------------------------------------------------------------------------
import operator

OPS = {
    '>=': operator.ge,
    '<=': operator.le,
    '>': operator.gt,
    '<': operator.lt,
    '==': operator.eq,
    '!=': operator.ne,
}


def num(v):
    """The numeric value of a field, or None — booleans are not numbers."""
    return v if isinstance(v, (int, float)) and not isinstance(v, bool) else None


def tag_matches(tag, pattern):
    """A declared tag pattern: exact tag, or 'prefix:*' wildcard matching
    every tag with that prefix."""
    if pattern.endswith(':*'):
        return tag.startswith(pattern[:-1])
    return tag == pattern


def best_tag_weight(tags, weights, prefix=''):
    """The strongest declared value for these tags: exact keys
    '<prefix><tag>' and wildcard keys '<prefix><p>:*'. Scored by |value|
    so a signed affect and an unsigned floor share the rule."""
    best = 0.0
    for tag in tags:
        v = num(weights.get(f'{prefix}{tag}'))
        if v is not None and abs(v) > abs(best):
            best = v
    for key, v in weights.items():
        if not key.startswith(prefix) or not key.endswith(':*'):
            continue
        p = key[len(prefix):-1]
        if any(t.startswith(p) for t in tags):
            n = num(v)
            if n is not None and abs(n) > abs(best):
                best = n
    return best
