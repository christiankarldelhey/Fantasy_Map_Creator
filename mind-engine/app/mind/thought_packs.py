# ============================================================================
# Compatibility shim — the packs moved to app/mind/musings.py (#55)
# ----------------------------------------------------------------------------
# Alembic 0017 (thought packs) and 0018 (faceted beliefs) import this module
# and read the pre-musing shape: PACKS entries carry kind/confidence/boosts,
# which musings no longer have. This file only exists so old migrations can
# still run from scratch — nothing else should import it.
# ============================================================================
from app.mind.musings import (  # noqa: F401
    ATTITUDE_PACKS, LEGACY_REWRITES, MUSING_PACKS,
)

# What 0017 used to stamp on every pack row — voice lines masquerading as
# starter beliefs, before musings became their own table.
PACKS = {
    slug: [
        {
            'kind': 'self', 'statement': m['statement'], 'confidence': 0.6,
            'tags': m['tags'], 'boosts': {},
        }
        for m in pack
    ]
    for slug, pack in MUSING_PACKS.items()
}
