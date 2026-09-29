# ============================================================================
# Mind section — the episode's inner life inside the narrator prompt
# ----------------------------------------------------------------------------
# The lens_block arrives already rendered by the Mind Engine (A8) and is
# injected verbatim; below it, the readings of what this episode stirred
# (the salient perceptions only — the mind notices plenty, the narrator
# hears what matters).
# ============================================================================

READING_MIN_SALIENCE = 0.3
READING_MAX_LINES = 5


def mind_section(lens_block, perceived_day=None):
    """THE MIND OF X (verbatim) + the day's salient readings. Empty when
    the episode carries no mind content."""
    parts = []
    if lens_block:
        parts.append(lens_block)
    # 'need' items carry the same description the lens' Needs section
    # already prints — including them here would voice the body twice.
    readings = sorted(
        (
            (p.get('salience') or 0.0, p.get('reading') or '')
            for p in (perceived_day or [])
            if p.get('type') != 'need'
        ),
        reverse=True,
    )
    lines = [r for s, r in readings if r and s >= READING_MIN_SALIENCE]
    if lines:
        parts.append(
            'What today stirs in their mind:\n'
            + '\n'.join(f'- {r}' for r in lines[:READING_MAX_LINES])
        )
    return ('\n\n'.join(parts) + '\n\n') if parts else ''
