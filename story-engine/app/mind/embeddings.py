# ============================================================================
# Embeddings (B8) — semantic similarity for retrieval
# ----------------------------------------------------------------------------
# The plan called for pgvector; the deployed Postgres has no `vector`
# extension available, so vectors live in the existing `memories.embedding`
# JSONB column and cosine runs in Python — at the corpus sizes involved
# (hundreds of rows per character) the math is trivially fast and the
# schema needs no change. If pgvector ever lands, only the similarity
# query inside retrieval.py moves to SQL.
#
# The provider is a deterministic hashing embedder: word tokens, char
# trigrams and word bigrams are blake2b-hashed (salted-safe, stable across
# processes) into a fixed-dim L2-normalized vector. Offline, reproducible,
# zero deps — "rain soaked the cloak" and "more rain on the road" overlap
# on 'rain', on '-rai-', '-ain-' trigrams, etc.
# ============================================================================
import hashlib
import math
import os
import re

EMBEDDING_DIM = int(os.environ.get('MIND_EMBEDDING_DIM', '256'))

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _add(vec, term, weight):
    digest = hashlib.blake2b(term.encode('utf-8'), digest_size=9).digest()
    index = int.from_bytes(digest[:8], 'little') % len(vec)
    vec[index] += weight if digest[8] & 1 else -weight


def embed(text, dim=None):
    """Deterministic embedding of a short text. Returns None for empty
    input so callers can skip similarity entirely."""
    tokens = _TOKEN_RE.findall((text or '').lower())
    if not tokens:
        return None
    vec = [0.0] * (dim or EMBEDDING_DIM)
    for tok in tokens:
        _add(vec, tok, 1.0)
        for i in range(len(tok) - 2):
            _add(vec, tok[i:i + 3], 0.4)
    for a, b in zip(tokens, tokens[1:]):
        _add(vec, f'{a} {b}', 0.6)
    norm = math.sqrt(sum(v * v for v in vec))
    return [round(v / norm, 6) for v in vec] if norm else None


def cosine(a, b):
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


def ensure_embedding(memory):
    """Lazily embed a memory's desc — backfills rows encoded before B8."""
    if memory.embedding is None and memory.desc:
        memory.embedding = embed(memory.desc)
    return memory.embedding


def episode_embedding(perceived_day):
    """One vector for the episode's perceived readings — what the day
    'was about' in the mind's own words. Unnoticed items have no reading
    and contribute nothing."""
    text = ' '.join(
        item.get('reading') or ''
        for item in (perceived_day or [])
        if item.get('perception') != 'unnoticed'
    )
    return embed(text)
