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
import re

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
    on the blended valence. Under real need pressure the present weighs
    more (C24): a starving body does not blend away into 'steady' —
    the day's need IS the mood."""
    pressure = ep_mood.get('need_pressure') or 0.0
    blend = min(0.9, MOOD_BLEND + pressure)
    prior = brain.mood or {}
    valence = (
        (prior.get('valence') or 0.0) * (1 - blend)
        + ep_mood['valence'] * blend
    )
    arousal = (
        (prior.get('arousal') or 0.0) * (1 - blend)
        + ep_mood['arousal'] * blend
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


def _age_phrase(mem, episode_idx):
    """How long ago the memory happened — the lens marks the past as past
    (C20): 'yesterday — the ranger asked...' reads as recollection, not
    as today's events. Anchored on when it was lived (created_episode)."""
    if episode_idx is None or mem.created_episode is None:
        return ''
    delta = episode_idx - mem.created_episode
    if delta <= 0:
        return ''
    if delta == 1:
        return 'Yesterday — '
    if delta < 14:
        return f'{delta} days ago — '
    return 'A long while ago — '


def render_lens(character_name, mood, beliefs, evoked_memories, needs=None,
                perceived_day=None, episode_idx=None, anchors=None,
                inline_ids=None, yesterday=None):
    """The mind's current state as it lands inside NARRATOR'S LENS (C17 —
    no standalone 'THE MIND OF' block): mood, loudest beliefs, what stirs
    today — evoked impressions and the day's salient readings, one list —
    and open needs as intentions (B2). Descriptions arrive already worded;
    the lens never invents.

    `anchors` maps memory id → the perceived item that stirred it.
    `inline_ids`: memories anchored to a phase render INSIDE that phase
    block instead (a memory bleeds where it stirs, not from a list);
    unanchored ones — semantic resonance with nothing concrete to hang
    on — are the exception that stays here."""
    lines = [f"{character_name} today — mood: {mood.get('dominant', 'neutral')}."]
    # `beliefs` arrive already ranked (rank_beliefs, C18): confidence ×
    # relevance to the day — the lens just reads the top of that order.
    top_beliefs = list(beliefs)[:LENS_BELIEF_TOP]
    if top_beliefs:
        lines.append('What they hold true:')
        lines.extend(f'- {b.statement}' for b in top_beliefs)
    # Continuity is mind-authored (C22): what the character RETAINED of
    # yesterday — memories encoded that day — replaces the host's
    # 'In Chapter N' summary. Nothing retained = no recap: silence is
    # signal too.
    if yesterday:
        lines.append('Yesterday, as they remember it:')
        lines.extend(f'- {d}' for d in yesterday)
    # Copies of the same memory read once (C16) — three rows of
    # 'day upon day of wet cold' were one impression, not three. Dedupe
    # keys on the raw desc: an evoked memory and today's identical
    # reading ('a ration of road-bread…') are the same line.
    stir = []
    seen = set()

    def add_stir(line, cap, key=None):
        k = (key if key is not None else line or '').strip().lower()
        if not k or k in seen or len(stir) >= cap:
            return
        seen.add(k)
        stir.append(line)

    for m in (evoked_memories or []):
        mem_id = getattr(m, 'id', None)
        if inline_ids and mem_id in inline_ids:
            continue  # renders inline at its anchor, not in this list
        age = _age_phrase(m, episode_idx)
        anchor = (anchors or {}).get(mem_id)
        anchor_note = f' — the {anchor} calls it back' if anchor else ''
        add_stir(
            f'{age}{m.desc}{anchor_note}', LENS_IMPRESSION_TOP, key=m.desc
        )
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
            add_stir(r, LENS_STIR_TOP, key=r)
    if stir:
        lines.append('Stirring today:')
        lines.extend(f'- {d}' for d in stir[:LENS_STIR_TOP])
    top_needs = (needs or [])[:LENS_NEED_TOP]
    if top_needs:
        lines.append('The body asks for:')
        lines.extend(f'- {n["description"]}' for n in top_needs)
    # Without a usage cue the narrator treated age-marked lines as
    # scenery and they never reached the prose (~6% bleed, replay A/B).
    if any(
        re.match(r'^(Yesterday|\d+ days ago|A long while ago) —', d)
        for d in stir[:LENS_STIR_TOP]
    ):
        lines.append(
            'The lines marked "ago" are memories surfacing — let them '
            'color the day as recollection or comparison, never as '
            'events happening now.'
        )
    return '\n'.join(lines)
