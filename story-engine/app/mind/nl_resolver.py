# ============================================================================
# NL resolver — the single read path for natural-language configuration
# ----------------------------------------------------------------------------
# Loads a game's NL pack (bands, thresholds, phrase lists, facets) from the
# mind.* tables once per game_id, caches it briefly, and falls back to
# nl_defaults.DEFAULT_* when the DB is down or unseeded — the narrator can
# always produce words.
#
# Admin edits invalidate via invalidate(game_id) or the short TTL.
# ============================================================================
import logging
import random
import time

from app.mind.nl_defaults import (
    DEFAULT_BANDS,
    DEFAULT_FACETS,
    DEFAULT_PHRASE_LISTS,
    DEFAULT_THRESHOLDS,
)
from app.mind.tables import (
    BrainNlOverride, Facet, NlBand, NlPhraseList, NlThreshold,
)

log = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 30

_cache = {}


def _normalize_band(row):
    meta = row.get('meta') or {}
    return {
        'ordinal': row['ordinal'],
        'below': row.get('below'),
        'above_m': meta.get('above_m'),
        'phrase': row.get('phrase'),
        'phrases': meta.get('phrases'),
    }


def _load_defaults():
    return {
        'bands': {t: [_normalize_band({'ordinal': i, **b}) for i, b in enumerate(bands)]
                  for t, bands in DEFAULT_BANDS.items()},
        'thresholds': dict(DEFAULT_THRESHOLDS),
        'phrases': {k: list(v) for k, v in DEFAULT_PHRASE_LISTS.items()},
        'facets': [{'event_type': t, 'field_path': f, 'unit': u, 'description': d}
                   for t, f, u, d in DEFAULT_FACETS],
    }


def _load_pack(session, game_id):
    bands = {}
    for row in (
        session.query(NlBand)
        .filter_by(game_id=game_id)
        .order_by(NlBand.table_name, NlBand.ordinal)
    ):
        bands.setdefault(row.table_name, []).append(
            _normalize_band({'ordinal': row.ordinal, 'below': row.below,
                             'phrase': row.phrase, 'meta': row.meta})
        )
    thresholds = {
        r.key: r.value
        for r in session.query(NlThreshold).filter_by(game_id=game_id)
    }
    phrases = {}
    for row in (
        session.query(NlPhraseList)
        .filter_by(game_id=game_id)
        .order_by(NlPhraseList.key, NlPhraseList.ordinal)
    ):
        phrases.setdefault(row.key, []).append(row.phrase)
    facets = [
        {'event_type': r.event_type, 'field_path': r.field_path,
         'unit': r.unit, 'description': r.description}
        for r in session.query(Facet).filter_by(game_id=game_id)
    ]
    return {'bands': bands, 'thresholds': thresholds, 'phrases': phrases,
            'facets': facets}


def _pack(session, game_id):
    """The game's pack: DB rows when available, defaults otherwise. Merges
    key-by-key so a partially seeded pack still covers everything."""
    entry = _cache.get(game_id)
    if entry and time.monotonic() - entry['at'] < CACHE_TTL_SECONDS:
        return entry['pack']
    pack = _load_defaults()
    if session is not None:
        try:
            stored = _load_pack(session, game_id)
            pack['bands'].update(stored['bands'])
            pack['thresholds'].update(stored['thresholds'])
            pack['phrases'].update(stored['phrases'])
            if stored['facets']:
                pack['facets'] = stored['facets']
        except Exception as exc:  # DB down: narrate with defaults
            log.warning('nl pack load failed for %s: %s', game_id, exc)
    _cache[game_id] = {'at': time.monotonic(), 'pack': pack}
    return pack


def invalidate(game_id=None):
    """Drop cached packs — the admin calls this after saving edits."""
    if game_id is None:
        _cache.clear()
    else:
        _cache.pop(game_id, None)


# --- Per-brain overrides (B7) ----------------------------------------------
# A brain's own take on the NL config: a key with ANY override rows replaces
# its global content entirely — resolution is override → pack → default.
# Loaded live (no cache): rows are few and edits should apply at once.

def _overrides(session, brain, kind=None):
    if session is None or brain is None:
        return {}
    try:
        query = session.query(BrainNlOverride).filter_by(brain_id=brain.id)
        if kind:
            query = query.filter_by(kind=kind)
        rows = query.order_by(BrainNlOverride.key,
                              BrainNlOverride.ordinal).all()
    except Exception as exc:  # DB hiccup: fall back to the game pack
        log.warning('brain overrides load failed: %s', exc)
        return {}
    grouped = {}
    for row in rows:
        grouped.setdefault(row.key, []).append(row)
    return grouped


def band_phrase(session, game_id, table, value, rng=random.random, brain=None):
    """First band whose threshold the value falls under (or reaches, for
    'above_m' bands), or None for missing data."""
    if value is None:
        return None
    bands = _overrides(session, brain, 'band').get(table)
    if bands:
        rows = [{'ordinal': b.ordinal, 'below': b.below,
                 'phrase': b.phrase, 'phrases': None, 'above_m': None}
                for b in bands]
    else:
        rows = _pack(session, game_id)['bands'].get(table, [])
    for band in rows:
        if band['above_m'] is not None:
            matched = value >= band['above_m']
        else:
            matched = band['below'] is None or value < band['below']
        if matched:
            if band['phrases']:
                return band['phrases'][int(rng() * len(band['phrases']))]
            return band['phrase']
    return None


def threshold(session, game_id, key, default=None, brain=None):
    rows = _overrides(session, brain, 'threshold').get(key)
    if rows:
        return rows[0].value
    return _pack(session, game_id)['thresholds'].get(key, default)


def phrases(session, game_id, key, brain=None):
    rows = _overrides(session, brain, 'phrase_list').get(key)
    if rows:
        return [r.phrase for r in rows if r.phrase is not None]
    return _pack(session, game_id)['phrases'].get(key, [])


def facets(session, game_id):
    return _pack(session, game_id)['facets']


class NlPack:
    """Bound resolver: session + game_id in one object. This is what the
    natural_language modules accept as their optional `nl` argument — they
    fall back to module constants when it's None, so legacy callers never
    change behaviour."""

    def __init__(self, session, game_id, brain=None):
        self._session = session
        self.game_id = game_id
        self._brain = brain

    def band_phrase(self, table, value, rng=random.random):
        return band_phrase(
            self._session, self.game_id, table, value, rng,
            brain=self._brain,
        )

    def threshold(self, key, default=None):
        return threshold(
            self._session, self.game_id, key, default, brain=self._brain
        )

    def phrases(self, key):
        return phrases(self._session, self.game_id, key, brain=self._brain)

    def phrase(self, key, default=None):
        options = self.phrases(key)
        return options[0] if options else default


def _first_string(values):
    """First non-empty string in an arbitrarily nested list/dict — event
    payloads flatten differently across hosts; readings dig until prose."""
    for v in values or []:
        if isinstance(v, str) and v:
            return v
        if isinstance(v, dict):
            found = _first_string(v.values())
        elif isinstance(v, list):
            found = _first_string(v)
        else:
            continue
        if found:
            return found
    return None


def resolve_event_reading(session, game_id, event, brain=None):
    """One-line natural-language reading of an event's data — what the mind
    would say it noticed. Climate uses the band tables; everything else falls
    back to a generic field listing."""
    data = (event or {}).get('data') or {}
    etype = (event or {}).get('type')

    if etype == 'climate':
        parts = [
            band_phrase(session, game_id, 'temperature',
                        data.get('temperature_2m'), brain=brain),
            band_phrase(session, game_id, 'cloud_cover',
                        data.get('cloud_cover'), brain=brain),
        ]
        wind = data.get('wind_speed_10m')
        if isinstance(wind, (int, float)) and wind > threshold(
            session, game_id, 'climate.windy_speed_min', 18, brain=brain
        ):
            parts.append('windy')
        prec = data.get('precipitation')
        if isinstance(prec, (int, float)):
            if prec > threshold(session, game_id,
                                'climate.wet_precipitation_min', 0.2,
                                brain=brain):
                parts.append('wet')
            elif prec > 0:
                parts.append('a passing shower')
        return ', '.join(p for p in parts if p) or None

    if not data:
        return None
    # Readings are prose or nothing: raw fields are inputs to salience and
    # memory, never words. Known types get a composed line; anything else
    # reports only its subject. Host names outrank slugs.
    subject = (
        data.get('entity_name') or data.get('name') or data.get('title')
        or data.get('entity')
    )
    if etype == 'meal':
        return ', '.join(
            x for x in (data.get('food'), data.get('drink')) if x
        ) or None
    if etype == 'terrain':
        return _first_string(
            data.get('terrain_phrases') or data.get('biomes')
        )
    if etype == 'rest':
        place = data.get('place')
        return subject or (place if isinstance(place, str) else None)
    if etype in ('travel', 'body'):
        # Vitals and mileage speak through needs/mood, never a reading.
        return None
    return str(subject) if subject else None
