# ============================================================================
# Lens + mood — the packet's inner voice
# ----------------------------------------------------------------------------
# The lens is a plain-text template rendered ONCE at episode open from
# already-generated material (memory descs, belief statements, NL mood
# bands) — it never invents words. Stored on the episode so re-open replays
# the same snapshot of the mind.
#
# Mood: importance-weighted mean valence of the perceived events, arousal
# from severity; the dominant label resolves through the editable NL table
# nl_bands(table='mood'). The episode's mood blends into the brain's
# running mood (half-life of one episode).
# ============================================================================
from app.mind.nl_resolver import band_phrase
from app.mind.provisioning import DEFAULT_WIRING

MOOD_TABLE = 'mood'
MOOD_BLEND = 0.5
LENS_BELIEF_TOP = 3
LENS_IMPRESSION_TOP = 5


def _weighted_mean(items, key):
    total_w = sum(i.get('salience') or 0.0 for i in items)
    if total_w <= 0:
        return 0.0
    return (
        sum((i.get(key) or 0.0) * (i.get('salience') or 0.0) for i in items)
        / total_w
    )


def episode_mood(session, game_id, perceived_day, brain=None, needs=None):
    """What this episode felt like: weighted by how much each event
    mattered (salience), then weighed down by open needs — the body's
    own voice, urgency-scaled. dominant via the editable 'mood' band."""
    items = perceived_day or []
    valence = _weighted_mean(items, 'valence')
    arousal = _weighted_mean(items, 'severity')
    pressure = 0.0
    if needs:
        w = {**DEFAULT_WIRING, **((brain.wiring if brain else None) or {})}
        scale = w.get('need_affect_scale', 0.3)
        cap = w.get('need_affect_cap', 0.4)
        pressure = min(cap, sum((n.urgency or 0.0) * scale for n in needs))
        valence = max(-1.0, valence - pressure)
    dominant = band_phrase(
        session, game_id, MOOD_TABLE, valence, brain=brain
    ) or 'neutral'
    return {
        'valence': round(valence, 3),
        'arousal': round(arousal, 3),
        'dominant': dominant,
        'need_pressure': round(pressure, 3),
    }


def update_brain_mood(session, game_id, brain, ep_mood):
    """The running mood absorbs the episode's mood; dominant re-resolves
    on the blended valence."""
    prior = brain.mood or {}
    valence = (
        (prior.get('valence') or 0.0) * (1 - MOOD_BLEND)
        + ep_mood['valence'] * MOOD_BLEND
    )
    arousal = (
        (prior.get('arousal') or 0.0) * (1 - MOOD_BLEND)
        + ep_mood['arousal'] * MOOD_BLEND
    )
    dominant = band_phrase(
        session, game_id, MOOD_TABLE, valence, brain=brain
    ) or 'neutral'
    brain.mood = {
        'valence': round(valence, 3),
        'arousal': round(arousal, 3),
        'dominant': dominant,
    }
    return brain.mood


LENS_NEED_TOP = 3


def render_lens(character_name, mood, beliefs, evoked_memories, needs=None):
    """THE MIND OF {name}: mood, loudest beliefs, stirring memories, open
    needs as intentions (B2) — descriptions arrive already worded, the
    lens never invents."""
    lines = [
        f'=== THE MIND OF {character_name} ===',
        f"Mood: {mood.get('dominant', 'neutral')}",
    ]
    top_beliefs = sorted(
        beliefs, key=lambda b: b.confidence or 0.0, reverse=True
    )[:LENS_BELIEF_TOP]
    if top_beliefs:
        lines.append('Beliefs:')
        lines.extend(f'- {b.statement}' for b in top_beliefs)
    if evoked_memories:
        lines.append('Impressions:')
        lines.extend(
            f'- {m.desc}' for m in evoked_memories[:LENS_IMPRESSION_TOP]
        )
    top_needs = (needs or [])[:LENS_NEED_TOP]
    if top_needs:
        lines.append('Needs:')
        lines.extend(f'- {n["description"]}' for n in top_needs)
    else:
        lines.append('Needs: —')
    return '\n'.join(lines)
