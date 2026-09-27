#!/usr/bin/env python
"""Seed the default NL pack into mind.* for a game.

Usage: .venv/bin/python scripts/seed_nl_pack.py [game_id]   (default: middle_earth)

Idempotent: wipes the game's existing rows in the four nl tables and inserts
the defaults — re-running restores the pack to code defaults.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

load_dotenv()

from app.db import SessionLocal  # noqa: E402
from app.mind.nl_defaults import (  # noqa: E402
    DEFAULT_BANDS,
    DEFAULT_FACETS,
    DEFAULT_GAME_ID,
    DEFAULT_PHRASE_LISTS,
    DEFAULT_THRESHOLDS,
)
from app.mind.nl_resolver import invalidate  # noqa: E402
from app.mind.tables import Facet, NlBand, NlPhraseList, NlThreshold  # noqa: E402


def seed_nl_pack(session, game_id):
    for model in (NlBand, NlThreshold, NlPhraseList, Facet):
        session.query(model).filter_by(game_id=game_id).delete()

    for table_name, bands in DEFAULT_BANDS.items():
        for ordinal, band in enumerate(bands):
            session.add(NlBand(
                game_id=game_id, table_name=table_name, ordinal=ordinal,
                below=band.get('below'), phrase=band.get('phrase'),
                meta={k: v for k, v in band.items() if k not in ('below', 'phrase')} or None,
            ))
    for key, value in DEFAULT_THRESHOLDS.items():
        session.add(NlThreshold(game_id=game_id, key=key, value=value))
    for key, phrases in DEFAULT_PHRASE_LISTS.items():
        for ordinal, phrase in enumerate(phrases):
            session.add(NlPhraseList(game_id=game_id, key=key, ordinal=ordinal, phrase=phrase))
    for event_type, field_path, unit, description in DEFAULT_FACETS:
        session.add(Facet(game_id=game_id, event_type=event_type,
                          field_path=field_path, unit=unit, description=description))
    session.commit()
    invalidate(game_id)


def main():
    game_id = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_GAME_ID
    with SessionLocal() as session:
        seed_nl_pack(session, game_id)
    print(f'seeded nl pack for {game_id}')


if __name__ == '__main__':
    main()
