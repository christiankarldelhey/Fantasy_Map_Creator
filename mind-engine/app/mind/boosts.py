# ============================================================================
# Belief boosts (B6) — validation only now
# ----------------------------------------------------------------------------
# `beliefs.boosts` {tag: magnitude} is still written by reflection and
# declared on preset starter beliefs, but its one consumer — bending the
# attention weights — died with theme_weights (#165): attention is the
# Relations' job alone (ADR 0017). The field stays stored but inert until
# the Belief fold (#168) decides its fate.
# ============================================================================


def clean_boosts(raw):
    """Validate a boosts payload from reflection/admin input:
    {tag: number} or it does not exist."""
    if not isinstance(raw, dict):
        return {}
    out = {}
    for tag, amount in raw.items():
        try:
            out[str(tag)] = float(amount)
        except (TypeError, ValueError):
            continue
    return out
