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
from app.mind.tables import Facet, NlBand, NlPhraseList, NlThreshold

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


def band_phrase(session, game_id, table, value, rng=random.random):
    """First band whose threshold the value falls under (or reaches, for
    'above_m' bands), or None for missing data."""
    if value is None:
        return None
    for band in _pack(session, game_id)['bands'].get(table, []):
        if band['above_m'] is not None:
            matched = value >= band['above_m']
        else:
            matched = band['below'] is None or value < band['below']
        if matched:
            if band['phrases']:
                return band['phrases'][int(rng() * len(band['phrases']))]
            return band['phrase']
    return None


def threshold(session, game_id, key, default=None):
    return _pack(session, game_id)['thresholds'].get(key, default)


def phrases(session, game_id, key):
    return _pack(session, game_id)['phrases'].get(key, [])


def facets(session, game_id):
    return _pack(session, game_id)['facets']


def resolve_event_reading(session, game_id, event):
    """One-line natural-language reading of an event's data — what the mind
    would say it noticed. Climate uses the band tables; everything else falls
    back to a generic field listing."""
    data = (event or {}).get('data') or {}
    etype = (event or {}).get('type')

    if etype == 'climate':
        parts = [
            band_phrase(session, game_id, 'temperature', data.get('temperature_2m')),
            band_phrase(session, game_id, 'cloud_cover', data.get('cloud_cover')),
        ]
        wind = data.get('wind_speed_10m')
        if isinstance(wind, (int, float)) and wind > threshold(
            session, game_id, 'climate.windy_speed_min', 18
        ):
            parts.append('windy')
        prec = data.get('precipitation')
        if isinstance(prec, (int, float)):
            if prec > threshold(session, game_id, 'climate.wet_precipitation_min', 0.2):
                parts.append('wet')
            elif prec > 0:
                parts.append('a passing shower')
        return ', '.join(p for p in parts if p) or None

    if not data:
        return None
    return ', '.join(f'{k}: {v}' for k, v in sorted(data.items()) if v is not None)
