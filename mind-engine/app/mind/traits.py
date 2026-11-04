# ============================================================================
# Traits — the Mind's human-scale dials (#59)
# ----------------------------------------------------------------------------
# A Trait is a 0..1 slider in plain language. Two kinds:
#
#   living  — act every episode: the dial writes several wiring knobs at
#             once, and reading it back derives the value from the anchor
#             knob so raw wiring edits still show on the slider.
#   dormant — action dials (#62 Decision wakes them): they exist as data
#             from day one — a `trait_<name>` key in wiring the Studio can
#             show and set — but no mechanism reads them yet. The rule
#             that killed Pull/Habit applies: if an era passes and nothing
#             wakes them, they get reviewed or removed.
#
# The mid pole (t=0.5) is the engine's default; the extremes are the two
# personalities of the dial. Memoria and Costumbre left the catalog:
# forgetting and routine are internal mechanisms, not personality —
# Piel and Rumia already carry what they meant.
# ============================================================================

TRAITS = {
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
    'conviccion': {
        'label': 'Convicción',
        'low': 'duda de todo',
        'high': 'se aferra a lo que cree',
        'help': 'cuánta evidencia pide una creencia y cuánto la suelta',
        'anchor': 'belief_reinforce_delta',
        'knobs': {
            'belief_reinforce_delta': (0.25, 0.5, 1.0),
            # Inverted: the clingy mind barely drops a belief when the
            # world contradicts it; the doubting one sheds fast.
            'belief_contradict_delta': (1.25, 0.75, 0.25),
            'belief_strength_decay': (0.90, 0.95, 0.99),
            'belief_new_per_reflection': (1, 2, 3),
            'belief_cap': (8, 12, 16),
            'belief_evidence_importance_min': (0.55, 0.40, 0.25),
        },
    },
    'curiosidad': {
        'label': 'Curiosidad',
        'low': 'nada le llama',
        'high': 'todo le interesa',
        'help': 'cuánto le atrae lo nuevo y lo que resuena con sus temas',
        'anchor': 'w_novelty',
        'knobs': {
            'w_novelty': (0.05, 0.25, 0.45),
            'w_theme': (0.05, 0.15, 0.30),
            'dialogue_recall_min': (0.55, 0.40, 0.25),
        },
    },
    # --- dormant action dials (#62) ------------------------------------
    # Stored as trait_<name> in wiring: the Studio shows and edits them,
    # nothing acts on them yet.
    'impulso': {
        'label': 'Impulso',
        'dormant': True,
        'low': 'se aguanta',
        'high': 'se calienta y actúa ya',
        'help': 'actuar primero o aguantar — dormido hasta la Decisión',
    },
    'deliberacion': {
        'label': 'Deliberación',
        'dormant': True,
        'low': 'el impulso primero',
        'high': 'el bien mayor primero',
        'help': 'cuánto pesa la consecuencia antes de moverse — dormido',
    },
    'integridad': {
        'label': 'Integridad',
        'dormant': True,
        'low': 'el fin lo justifica',
        'high': 'hay líneas que no se cruzan',
        'help': 'qué cuesta traicionar lo que cree — dormido',
    },
    'coraje': {
        'label': 'Coraje',
        'dormant': True,
        'low': 'la cautela primero',
        'high': 'el miedo no decide',
        'help': 'actuar bajo amenaza — dormido',
    },
    'corruptibilidad': {
        'label': 'Corruptibilidad',
        'dormant': True,
        'low': 'la sombra no lo tienta',
        'high': 'cae fácil',
        'help': 'su propensión a corromperse — dormido',
    },
}

_INT_KNOBS = {
    'retrieval_top_k', 'refractory_episodes',
    'belief_new_per_reflection', 'belief_cap',
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
    """Where the dial sits — living traits read the anchor knob back (raw
    wiring edits move the slider); dormant ones read their stored value."""
    spec = TRAITS[trait]
    if spec.get('dormant'):
        return round(float(wiring.get(f'trait_{trait}', 0.5) or 0.5), 3)
    lo, mid, hi = spec['knobs'][spec['anchor']]
    actual = float(wiring.get(spec['anchor'], mid) or mid)
    return round(_piecewise_inv(actual, lo, mid, hi), 3)


def apply_trait(wiring, trait, t):
    """Write one Trait into a wiring dict (mutated in place). t in 0..1 —
    a living dial moves every knob together; a dormant one stores itself."""
    spec = TRAITS[trait]
    t = max(0.0, min(1.0, float(t)))
    if spec.get('dormant'):
        wiring[f'trait_{trait}'] = round(t, 4)
        return wiring
    for key, (lo, mid, hi) in spec['knobs'].items():
        v = _piecewise(t, lo, mid, hi)
        wiring[key] = int(round(v)) if key in _INT_KNOBS else round(v, 4)
    return wiring


def traits_of(wiring):
    """{trait: {value, label, low, high, help, dormant}} — for the Studio."""
    return {
        key: {
            'value': trait_value(wiring, key),
            'label': spec['label'],
            'low': spec['low'],
            'high': spec['high'],
            'help': spec['help'],
            'dormant': bool(spec.get('dormant')),
        }
        for key, spec in TRAITS.items()
    }
