# ============================================================================
# Traits — the Mind's six human-scale dials
# ----------------------------------------------------------------------------
# Each Trait is a 0..1 slider in plain language that writes several wiring
# knobs at once (CONTEXT.md: Trait). The mid pole (t=0.5) is the engine's
# default; the extremes are the two personalities of the dial. Reading a
# Trait back derives its value from the anchor knob, so raw wiring edits
# still show up on the slider — the Trait is a view, not a shadow copy.
# ============================================================================

TRAITS = {
    'memoria': {
        'label': 'Memoria',
        'low': 'olvida rápido',
        'high': 'no olvida nada',
        'help': 'cuánto tarda en apagarse lo que no vuelve a recordar',
        'anchor': 'decay',
        'knobs': {
            'decay': (0.65, 0.85, 0.97),
            'forget_threshold': (0.30, 0.20, 0.10),
            'fixed_threshold': (0.90, 0.80, 0.60),
            'evocations_to_fix': (5, 3, 1),
            'consolidated_decay': (0.90, 0.98, 0.995),
            'decay_sticky': (0.90, 0.95, 0.99),
        },
    },
    'atencion': {
        'label': 'Atención',
        'low': 'distraído',
        'high': 'todo lo nota',
        'help': 'qué tan fina es la percepción ante lo que pasa',
        'anchor': 'check_default_difficulty',
        'knobs': {
            'check_default_difficulty': (11.0, 8.0, 5.0),
            'gate_default_min': (0.15, 0.0, 0.0),
            'unnoticed_salience': (0.2, 0.5, 0.7),
            'w_perception': (0.05, 0.10, 0.20),
        },
    },
    'piel': {
        'label': 'Piel',
        'low': 'impasible',
        'high': 'todo le afecta',
        'help': 'cuánto pesa lo vivido en el ánimo',
        'anchor': 'w_emotional',
        'knobs': {
            'w_emotional': (0.05, 0.15, 0.35),
            'need_affect_scale': (0.10, 0.30, 0.50),
            'need_affect_cap': (0.15, 0.40, 0.60),
            'break_loss_valence': (-0.03, -0.10, -0.25),
        },
    },
    'rumia': {
        'label': 'Rumia',
        'low': 'vive el presente',
        'high': 'vuelve siempre al pasado',
        'help': 'cuánto espacio tiene lo viejo frente a lo nuevo',
        'anchor': 'lambda_recency',
        'knobs': {
            # lambda measures how fast recency fades: low = the past
            # still scores; high = only the fresh stirs.
            'lambda_recency': (0.60, 0.30, 0.10),
            'retrieval_top_k': (2, 5, 9),
            'retrieval_min_score': (0.80, 0.50, 0.30),
            'retrieval_semantic_min': (0.60, 0.45, 0.30),
            'refractory_episodes': (3, 1, 0),
        },
    },
    'costumbre': {
        'label': 'Costumbre',
        'low': 'lo repetido le resbala',
        'high': 'la rutina lo marca',
        'help': 'cuánto pesa que los días se repitan',
        'anchor': 'repetition_growth',
        'knobs': {
            'repetition_growth': (0.03, 0.08, 0.15),
            'repetition_salience': (0.15, 0.30, 0.50),
            'repetition_valence_cap': (0.15, 0.30, 0.50),
            'pattern_min_episodes': (6, 3, 2),
            'pattern_window': (6, 4, 3),
        },
    },
    'conviccion': {
        'label': 'Convicción',
        'low': 'duda de todo',
        'high': 'se aferra a lo que cree',
        'help': 'cuánta evidencia pide una creencia y cuánto la suelta',
        'anchor': 'belief_reinforce_delta',
        'knobs': {
            'belief_reinforce_delta': (0.05, 0.10, 0.20),
            # Inverted: the clingy mind barely drops a belief when the
            # world contradicts it; the doubting one sheds fast.
            'belief_contradict_delta': (0.25, 0.15, 0.05),
            'belief_confidence_decay': (0.90, 0.95, 0.99),
            'belief_new_per_reflection': (1, 2, 3),
            'belief_cap': (8, 12, 16),
            'belief_evidence_importance_min': (0.55, 0.40, 0.25),
        },
    },
}

_INT_KNOBS = {
    'evocations_to_fix', 'retrieval_top_k', 'refractory_episodes',
    'pattern_min_episodes', 'pattern_window', 'belief_new_per_reflection',
    'belief_cap',
}


def _piecewise(t, lo, mid, hi):
    if t <= 0.5:
        v = lo + (mid - lo) * (t / 0.5)
    else:
        v = mid + (hi - mid) * ((t - 0.5) / 0.5)
    return v


def _piecewise_inv(actual, lo, mid, hi):
    # Ramps may run descending (rumia's lambda_recency: present-focused
    # minds sit at HIGH knob values).
    if lo <= hi:
        if actual <= lo:
            return 0.0
        if actual >= hi:
            return 1.0
        if actual <= mid:
            return 0.5 * (actual - lo) / (mid - lo)
        return 0.5 + 0.5 * (actual - mid) / (hi - mid)
    if actual >= lo:
        return 0.0
    if actual <= hi:
        return 1.0
    if actual >= mid:
        return 0.5 * (lo - actual) / (lo - mid)
    return 0.5 + 0.5 * (mid - actual) / (mid - hi)


def trait_value(wiring, trait):
    """Where the anchor knob sits on the dial — the Trait's read-back is
    honest: raw wiring edits move the slider."""
    spec = TRAITS[trait]
    lo, mid, hi = spec['knobs'][spec['anchor']]
    actual = float(wiring.get(spec['anchor'], mid) or mid)
    return round(_piecewise_inv(actual, lo, mid, hi), 3)


def apply_trait(wiring, trait, t):
    """Write one Trait into a wiring dict (mutated in place). t in 0..1;
    every knob of the dial moves together."""
    spec = TRAITS[trait]
    t = max(0.0, min(1.0, float(t)))
    for key, (lo, mid, hi) in spec['knobs'].items():
        v = _piecewise(t, lo, mid, hi)
        wiring[key] = int(round(v)) if key in _INT_KNOBS else round(v, 4)
    return wiring


def traits_of(wiring):
    """{trait: {value, label, low, high, help}} — for the Studio."""
    return {
        key: {
            'value': trait_value(wiring, key),
            'label': spec['label'],
            'low': spec['low'],
            'high': spec['high'],
            'help': spec['help'],
        }
        for key, spec in TRAITS.items()
    }
