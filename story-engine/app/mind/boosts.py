# ============================================================================
# Belief boosts (B6) — lived conviction bends what stands out
# ----------------------------------------------------------------------------
# `beliefs.boosts` is data, not wiring: {tag: magnitude} edited per row
# (SQLAdmin), declared on mold starter beliefs, or written by reflection.
# While a belief stays active AND confident enough
# (`belief_boost_min_confidence`), its boosts add to the brain's
# theme_weights — "the weather weighs more because she believes X". The
# divergence lives in inspectable rows, not in mutated config; when the
# belief weakens or dies, the weight simply falls away.
# ============================================================================
from app.mind.provisioning import DEFAULT_WIRING
from app.mind.tables import Belief


def effective_theme_weights(session, brain):
    """theme_weights + boosts of active, confident-enough beliefs."""
    weights = dict(brain.theme_weights or {})
    w = {**DEFAULT_WIRING, **(brain.wiring or {})}
    floor = float(w.get('belief_boost_min_confidence', 0.6))
    beliefs = (
        session.query(Belief)
        .filter_by(character_id=brain.character_id, status='active')
        .all()
    )
    for belief in beliefs:
        if (belief.confidence or 0) < floor:
            continue
        for tag, amount in (belief.boosts or {}).items():
            try:
                weights[tag] = weights.get(tag, 0.0) + float(amount)
            except (TypeError, ValueError):
                continue
    return weights


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
