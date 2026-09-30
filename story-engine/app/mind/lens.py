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
# The day's salient readings join the mind's stirring, same list as the
# evoked impressions (C17): the lens shows one merged "what is on their
# mind", not a taxonomy of where each line came from.
LENS_READING_MIN_SALIENCE = 0.3
LENS_READING_TOP = 5
LENS_STIR_TOP = 7


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


def render_lens(character_name, mood, beliefs, evoked_memories, needs=None,
                perceived_day=None):
    """The mind's current state as it lands inside NARRATOR'S LENS (C17 —
    no standalone 'THE MIND OF' block): mood, loudest beliefs, what stirs
    today — evoked impressions and the day's salient readings, one list —
    and open needs as intentions (B2). Descriptions arrive already worded;
    the lens never invents."""
    lines = [f"{character_name} today — mood: {mood.get('dominant', 'neutral')}."]
    # `beliefs` arrive already ranked (rank_beliefs, C18): confidence ×
    # relevance to the day — the lens just reads the top of that order.
    top_beliefs = list(beliefs)[:LENS_BELIEF_TOP]
    if top_beliefs:
        lines.append('What they hold true:')
        lines.extend(f'- {b.statement}' for b in top_beliefs)
    # Copies of the same memory read once (C16) — three rows of
    # 'day upon day of wet cold' were one impression, not three.
    stir = []
    seen = set()

    def add_stir(desc, cap):
        key = (desc or '').strip().lower()
        if not key or key in seen or len(stir) >= cap:
            return
        seen.add(key)
        stir.append(desc)

    for m in (evoked_memories or []):
        add_stir(m.desc, LENS_IMPRESSION_TOP)
    # The day's own weight joins the same list — 'need' items already
    # speak below in the body's voice, so they do not read twice.
    readings = sorted(
        (
            (p.get('salience') or 0.0, p.get('reading') or '')
            for p in (perceived_day or [])
            if p.get('type') != 'need'
        ),
        reverse=True,
    )
    for s, r in readings[:LENS_READING_TOP]:
        if s >= LENS_READING_MIN_SALIENCE:
            add_stir(r, LENS_STIR_TOP)
    if stir:
        lines.append('Stirring today:')
        lines.extend(f'- {d}' for d in stir[:LENS_STIR_TOP])
    top_needs = (needs or [])[:LENS_NEED_TOP]
    if top_needs:
        lines.append('The body asks for:')
        lines.extend(f'- {n["description"]}' for n in top_needs)
    return '\n'.join(lines)
