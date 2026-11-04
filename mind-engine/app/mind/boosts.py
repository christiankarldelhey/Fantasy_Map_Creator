# ============================================================================
# Belief boosts (B6) — lived conviction bends what stands out
# ----------------------------------------------------------------------------
# `beliefs.boosts` is data, not wiring: {tag: magnitude} edited per row
# (SQLAdmin), declared on preset starter beliefs, or written by reflection.
# While a belief stays active AND strong enough
# (`belief_boost_min_strength`), its boosts add to the mind's
# theme_weights — "the weather weighs more because she believes X". The
# divergence lives in inspectable rows, not in mutated config; when the
# belief weakens or dies, the weight simply falls away.
# ============================================================================
from app.mind.attitudes import attention_weights
from app.mind.provisioning import DEFAULT_WIRING
from app.mind.tables import Belief


def effective_theme_weights(session, mind):
    """theme_weights + boosts of active, strong-enough beliefs."""
    weights = dict(mind.theme_weights or {})
    w = {**DEFAULT_WIRING, **(mind.wiring or {})}
    floor = float(w.get('belief_boost_min_strength', 3.0))
    beliefs = (
        session.query(Belief)
        .filter_by(character_id=mind.character_id, status='active')
        .all()
    )
    for belief in beliefs:
        if (belief.strength or 0) < floor:
            continue
        for tag, amount in (belief.boosts or {}).items():
            try:
                weights[tag] = weights.get(tag, 0.0) + float(amount)
            except (TypeError, ValueError):
                continue
    # Attitudes watch what they love or loathe (CONTEXT.md · Stance).
    for tag, amount in attention_weights(beliefs, w).items():
        weights[tag] = weights.get(tag, 0.0) + amount
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
