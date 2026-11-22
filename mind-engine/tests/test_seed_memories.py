# ============================================================================
# Seed memories — the lived prehistory a preset carries (preset_memories)
# ----------------------------------------------------------------------------
# Clone-and-own like the rest of the pack: get_or_create_mind lands them
# as consolidated episodic Memories (origin='seed') with lived_date as
# the calendar created_date — a four-hundred-year-old memory is born
# old, fixed, and speaking only when the day's tags brush it.
# ============================================================================
import uuid
from datetime import date

from app.db import SessionLocal
from app.mind.provisioning import get_or_create_mind
from app.mind.seed_packs import CELEBRIAN_MEMORIES, MEMORY_PACKS
from app.mind.tables import (
    Memory, MindPreset, PresetMemory,
)


def test_pack_is_well_formed():
    descs = [m['desc'] for m in CELEBRIAN_MEMORIES]
    assert len(descs) == len(set(descs))
    assert len(descs) >= 30
    for m in CELEBRIAN_MEMORIES:
        assert m['desc'] and m['tags']
        # The spine: a spread across centuries, none younger than now.
        assert date(1400, 1, 1) <= m['lived_date'] <= date(1950, 12, 31)


def test_preset_memories_clone_into_consolidated_episodic_seeds():
    session = SessionLocal()
    game_id = 'middle_earth'
    slug = f'cel-mem-{uuid.uuid4().hex[:8]}'
    preset = MindPreset(game_id=game_id, slug=slug, name='prehistory')
    session.add(preset)
    session.flush()
    for m in CELEBRIAN_MEMORIES:
        session.add(PresetMemory(
            preset_id=preset.id, desc=m['desc'], tags=m['tags'],
            subjects=m['subjects'], valence=m['valence'],
            importance=m['importance'], imprint=m['imprint'],
            region=m['region'], lived_date=m['lived_date'],
        ))
    session.flush()

    mind = get_or_create_mind(
        session, game_id, f'cel-{uuid.uuid4().hex[:8]}', slug
    )
    session.flush()
    rows = (
        session.query(Memory)
        .filter_by(character_id=mind.character_id, origin='seed',
                   kind='episodic')
        .all()
    )
    assert len(rows) == len(CELEBRIAN_MEMORIES)
    by_desc = {m['desc']: m for m in CELEBRIAN_MEMORIES}
    for row in rows:
        src = by_desc[row.desc]
        assert row.consolidated is True
        assert row.strength == 1.0
        assert row.created_date == src['lived_date']
        assert row.valence == src['valence']
        assert row.importance == src['importance']
        assert row.region == src['region']
        assert set(src['tags']) <= set(row.tags)
    session.rollback()
    session.close()


def test_pack_map_covers_celebrian():
    assert MEMORY_PACKS['celebrian'] is CELEBRIAN_MEMORIES
