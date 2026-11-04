// ============================================================================
// State blocks — the traveller's condition, equipage and end, rendered HERE
// ----------------------------------------------------------------------------
// Restored to Node as part of the world-voice migration (issue #52): the
// mind-engine Python twin was removed in #54 — this module is the only copy.
// The host ships raw state (energy, shadow, supplies, fate); these phrases
// are the world voice for it. Numbers NEVER reach the prompt.
// ============================================================================

const PHRASES = {
  'condition.energy.worn':
    '{name} is worn down; let a heavier step, a shorter temper and a '
    + 'longing for shelter show in how {name} moves.',
  'condition.energy.spent':
    "{name} is at the very limit of {name}'s strength — stumbling, "
    + 'the body failing, choices driven by exhaustion.',
  'condition.shadow.unease':
    'A faint unease has settled on {name}: grimmer now, more watchful '
    + 'than before.',
  'condition.shadow.shadowed':
    'A shadow has gathered on {name}, mile by mile: quick to suspect, '
    + 'seeing threat where once {name} saw beauty, slow to trust the '
    + 'quiet.',
  'condition.shadow.burdened':
    '{name} is heavily burdened in spirit: the land itself feels '
    + 'malevolent, bleak, and what trust {name} had is all but gone.',
  'condition.wounded.wounded':
    '{name} nurses a wound that has not yet healed.',
  'condition.wounded.badly_wounded':
    '{name} is badly wounded, moving as one who is not far from '
    + 'falling.',
  'condition.owes_to': 'This owes to {notes}.',
  'note.combat': 'a fight with {subject}',
  'note.tension': '{subject} shadowing the road',
  'note.company': 'an hour in the company of {subject}',
  'note.rest_good': "a night's rest at {subject}",
  'note.rest': 'a night at {subject}',
  'condition.tail':
    'Let this colour the telling — how {name} moves, what {name} '
    + 'notices and longs for — but never name it as a fact or a number.',
  'equipage.turned_away':
    'turned away from the door for want of coin, the traveller slept '
    + 'against the wall of the very town that would not have him',
  'equipage.poorly_clad':
    'poorly clad for this cold; the cloak is thin and the wind finds '
    + 'every gap',
  'equipage.low_rations': 'the satchel is nearly empty',
  'equipage.flask_frozen':
    'the waterskin is rimed with ice and no stream can refill it today',
  'equipage.empty_waterskin':
    'the waterskin is empty; the tongue is parched and every swallow '
    + 'is remembered',
  'equipage.low_water':
    'the waterskin is nearly dry; only a mouthful or two remain',
  'equipage.no_food_water_deep':
    'neither food nor water in days; the body is doubly tried and the '
    + 'step unsteady',
  'equipage.no_food_water':
    'neither food nor water has passed the lips; the body is doubly '
    + 'tried',
  'equipage.hungry_deep':
    'no decent meal in days; hunger gnaws and weakens the arm',
  'equipage.hungry': 'no decent meal since yesterday; the belly is hollow',
  'equipage.thirsty_deep':
    'no water in far too long; the tongue swells and the mind grows '
    + 'slow',
  'equipage.thirsty':
    'no water since yesterday; the throat is dust and the lips are '
    + 'cracked',
  'equipage.low_coins':
    'few coins left in the purse, counted twice before asking for a bed',
  'equipage.no_coins': 'the purse is empty',
  'equipage.tail':
    'Never list objects or quantities; the equipage appears only when '
    + 'it hinders, is lacking, or brings comfort.',
  'endstate.slain':
    '=== THE END ===\nThis is the FINAL CHAPTER. {name} dies here. '
    + 'Narrate the moment of death explicitly in the final movement. Do '
    + 'not end the chapter with {name} still alive. The journey ends '
    + 'here.\n\n=== MANDATORY ENDING ===\nYou must describe {name}\'s '
    + 'actual death. Do not transition to a night at camp; the story '
    + 'stops at the moment {name} falls.',
  'endstate.dead_exhaustion':
    '=== THE END ===\nThis is the FINAL CHAPTER. Exhaustion finally '
    + 'claims {name}, who dies here. Narrate the collapse and final '
    + 'moments explicitly in the final movement. Do not end the chapter '
    + "with {name} still alive. The journey ends here.\n\n"
    + '=== MANDATORY ENDING ===\nYou must describe {name}\'s death from '
    + 'exhaustion. Do not transition to a night at camp; the story stops '
    + "at {name}'s final collapse.",
  'endstate.dead_shadow':
    '=== THE END ===\nThis is the FINAL CHAPTER. The shadow finally '
    + 'consumes {name}; {name} dies or is fully corrupted. Narrate the '
    + 'corruption taking hold and the final end explicitly in the final '
    + 'movement. Do not end the chapter with {name} merely threatened or '
    + 'alive. The journey ends in darkness.\n\n=== MANDATORY ENDING ===\n'
    + 'You must describe the exact moment the shadow consumes {name}. Do '
    + 'not transition to a night at camp; the story stops at that moment.',
};

const THRESHOLDS = {
  'condition.energy_worn_max': 50,
  'condition.energy_spent_max': 25,
  'condition.shadow_unease_min': 20,
  'condition.shadow_shadowed_min': 45,
  'condition.shadow_burdened_min': 70,
  'equipage.cold_temp_max': 15,
  'equipage.cold_shift_min': 3,
  'equipage.low_rations_max': 2,
  'equipage.low_water_max': 0.25,
  'equipage.low_coins_max': 5,
};

function phrase(key, fmt = {}) {
  const template = PHRASES[key];
  if (template == null) return '';
  return template.replace(/\{(\w+)\}/g, (m, k) => (fmt[k] != null ? fmt[k] : m));
}

/**
 * Machine notes ('kind:subject') render through note.<kind> — the host
 * records WHAT drove the day, the pack owns how to say it. Anything else
 * is a legacy authored note and passes through as-is.
 */
export function renderNote(note) {
  const idx = (note || '').indexOf(':');
  if (idx > 0 && idx < note.length - 1) {
    const rendered = phrase(`note.${note.slice(0, idx)}`, { subject: note.slice(idx + 1) });
    if (rendered) return rendered;
  }
  return note;
}

/**
 * === TRAVELLER'S CONDITION === — energy/shadow/wounded bands + the
 * causal 'owes to' tail from recent log notes. '' when nothing crosses
 * a threshold (a fine body is not prose).
 */
export function conditionSection(state, characterName = 'The traveller') {
  const s = state || {};
  const name = characterName || 'The traveller';
  const { energy, shadow, wounded } = s;

  const lines = [];
  if (energy != null && energy < THRESHOLDS['condition.energy_worn_max']) {
    const band = energy < THRESHOLDS['condition.energy_spent_max'] ? 'spent' : 'worn';
    lines.push(phrase(`condition.energy.${band}`, { name }));
  }
  if (shadow != null && shadow >= THRESHOLDS['condition.shadow_unease_min']) {
    let band = 'unease';
    if (shadow >= THRESHOLDS['condition.shadow_burdened_min']) band = 'burdened';
    else if (shadow >= THRESHOLDS['condition.shadow_shadowed_min']) band = 'shadowed';
    lines.push(phrase(`condition.shadow.${band}`, { name }));
  }
  if (wounded === 'wounded' || wounded === 'badly_wounded') {
    lines.push(phrase(`condition.wounded.${wounded}`, { name }));
  }

  const kept = lines.filter(Boolean);
  if (!kept.length) return '';

  const notes = (s.recentNotes || []).filter(Boolean).map(renderNote).filter(Boolean).slice(0, 3);
  if (notes.length) {
    kept.push(phrase('condition.owes_to', { notes: notes.join('; and to ') }));
  }

  const tail = phrase('condition.tail', { name });
  return "=== TRAVELLER'S CONDITION ===\n"
    + kept.join(' ')
    + (tail ? `\n${tail}` : '')
    + '\n\n';
}

/**
 * === EQUIPAGE === — what hinders, lacks or comforts. Facts arrive
 * raw (rations, water, coins, cold); phrases come from the pack.
 */
export function equipmentSection(state) {
  const s = state || {};
  const lines = [];

  if (s.turnedAway) lines.push(phrase('equipage.turned_away'));

  const meanTemp = s.meanTemperature;
  const coldShift = s.coldShift || 0;
  if (
    meanTemp != null
    && meanTemp < THRESHOLDS['equipage.cold_temp_max']
    && coldShift < THRESHOLDS['equipage.cold_shift_min']
  ) {
    lines.push(phrase('equipage.poorly_clad'));
  }

  for (const item of s.notableItems || []) {
    if (item) lines.push(item);
  }

  const rations = s.rations || 0;
  if (rations > 0 && rations <= THRESHOLDS['equipage.low_rations_max']) {
    lines.push(phrase('equipage.low_rations'));
  }

  const waterCapacity = s.waterCapacity || 0;
  const waterHeld = s.waterHeld || 0;
  if (waterCapacity > 0) {
    if (s.flaskFrozen) {
      lines.push(phrase('equipage.flask_frozen'));
    } else if (waterHeld <= 0) {
      lines.push(phrase('equipage.empty_waterskin'));
    } else if (waterHeld <= THRESHOLDS['equipage.low_water_max']) {
      lines.push(phrase('equipage.low_water'));
    }
  }

  const daysFood = s.daysWithoutFood || 0;
  const daysWater = s.daysWithoutWater || 0;
  if (daysFood >= 1 && daysWater >= 1) {
    const deep = daysFood >= 3 && daysWater >= 3;
    lines.push(phrase(deep ? 'equipage.no_food_water_deep' : 'equipage.no_food_water'));
  } else if (daysFood >= 3) {
    lines.push(phrase('equipage.hungry_deep'));
  } else if (daysFood >= 1) {
    lines.push(phrase('equipage.hungry'));
  } else if (daysWater >= 3) {
    lines.push(phrase('equipage.thirsty_deep'));
  } else if (daysWater >= 1) {
    lines.push(phrase('equipage.thirsty'));
  }

  const coins = s.coins;
  if (coins != null) {
    if (coins === 0) {
      lines.push(phrase('equipage.no_coins'));
    } else if (coins <= THRESHOLDS['equipage.low_coins_max']) {
      lines.push(phrase('equipage.low_coins'));
    }
  }

  const kept = lines.filter(Boolean);
  if (!kept.length) return '';

  const tail = phrase('equipage.tail');
  return '=== EQUIPAGE ===\n'
    + `${kept.join('. ')}.`
    + (tail ? `\n${tail}` : '')
    + '\n\n';
}

/**
 * === THE END === — terminal chapters only. `fate` arrives raw; the
 * wording (and which fates exist) lives in the pack.
 */
export function endStateSection(fate, characterName = 'The traveller') {
  if (!fate || fate === 'living') return '';
  const name = characterName || 'The traveller';
  const text = phrase(`endstate.${fate}`, { name });
  return text ? `${text}\n\n` : '';
}
