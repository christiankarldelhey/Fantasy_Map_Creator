#!/usr/bin/env node
// ============================================================================
// derive-interactions.mjs — one-time generator: situations[] → interactions.json
// ----------------------------------------------------------------------------
// Wave D: `interactions` becomes an authored seed like any other (db madre).
// This tool derives it ONCE from the legacy authored options inside
// situations[] — every option becomes a typed interaction row — and slims
// the narration sources to pure situation descriptors (the executable keys
// options/commands now live only in interactions.json).
//
// After this runs, authors edit interactions.json directly: acts, labels,
// need_tags and typed effects are the authoring format. The legacy shapes
// (commands, flat effects maps, overnight_shelter) are history.
//
//   node derive-interactions.mjs            # generate + slim in place
//   node derive-interactions.mjs --dry-run  # report only
// ============================================================================

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/json');
const DRY = process.argv.includes('--dry-run');

// Contact-shape → Act for derived single interactions (stance/commands-only
// situations). Rough first cut — payload.mapped_from keeps the form so a hand
// pass can re-act them later without re-deriving.
const FORM_TO_ACT = {
  brief_exchange: 'talk', topic: 'talk', sign_only: 'talk', confronts: 'talk',
  aid_or_trade: 'accept',
  harvest_shelter: 'rest',
  attacks: 'defy', sudden_peril: 'defy',
  // watches/stalks/glimpsed/observed/reacts_withdraws/hinders_passage/
  // sound_only/scenery/presence_felt/drifts_closer/mistaken_for_object
  // default below — the traveller keeps distance or walks on.
};
const DERIVED_DEFAULT_ACT = 'avoid';

// Authored option id → Act. 'stay' is rest: taking the offered bed is the same
// outcome family as a place's overnight 'rest'.
const OPTION_TO_ACT = { rest: 'rest', stay: 'rest', move_on: 'avoid' };

// A legacy command becomes one or more typed effects. overnight_shelter is
// decomposed into its atoms — lodging, the coin it costs, the meal, the rest,
// the shadow relief — never kept as one opaque command.
function commandToEffects(cmd) {
  switch (cmd.type) {
    case 'meal':
      return [{ type: 'meal', ...(cmd.food ? { food: cmd.food } : {}), ...(cmd.meal_slug ? { slug: cmd.meal_slug } : {}) }];
    case 'item':
      return [{ type: 'item', slug: cmd.slug, qty: cmd.qty ?? 1 }];
    case 'water_refill':
      return [{ type: 'water', refill: true }];
    case 'coins':
      return [{ type: 'coins', amount: cmd.amount }];
    case 'heal':
      return [{ type: 'heal', ...(cmd.amount != null ? { amount: cmd.amount } : {}) }];
    case 'overnight_shelter': {
      const effects = [
        { type: 'lodging', name: cmd.name, description: cmd.description, indoor: !!cmd.indoor },
      ];
      if (cmd.lodging_cost) effects.push({ type: 'coins', amount: -cmd.lodging_cost });
      if (cmd.meal) effects.push({ type: 'meal', ...(cmd.meal_slug ? { slug: cmd.meal_slug } : {}) });
      if (cmd.rest_quality) effects.push({ type: 'rest', quality: cmd.rest_quality });
      if (cmd.shadow_effect) effects.push({ type: 'shadow', amount: cmd.shadow_effect });
      return effects;
    }
    default:
      return [{ type: cmd.type, ...cmd }];
  }
}

// Place overnight options carry a flat {rest_quality, shadow_effect} object —
// translate each key to its typed effect. Unknown keys degrade to {type, amount}
// rather than being dropped. But the newer authored places write effects as
// *intent prose* ({en, es} strings: "food · mark `cache_taken`") — that is not
// executable and stays in effects_note until a human types it.
const LEGACY_EFFECT_TO_TYPE = {
  rest_quality: (v) => ({ type: 'rest', quality: v }),
  shadow_effect: (v) => ({ type: 'shadow', amount: v }),
  energy: (v) => ({ type: 'energy', amount: v }),
};
const isLangNote = (v) =>
  v && typeof v === 'object' && !Array.isArray(v) && ('en' in v || 'es' in v) &&
  Object.values(v).every((x) => x == null || typeof x === 'string');
function effectsToList(effects) {
  if (!effects) return [];
  if (Array.isArray(effects)) return effects;
  if (isLangNote(effects)) return []; // intent prose → effects_note, not an effect
  return Object.entries(effects).map(([k, v]) =>
    LEGACY_EFFECT_TO_TYPE[k] ? LEGACY_EFFECT_TO_TYPE[k](v) : { type: k, amount: v }
  );
}

// Lang fields arrive as 'text' | {en, es}; outcome text keeps the {en, es} shape.
function toLang(v) {
  if (v == null) return null;
  return typeof v === 'string' ? { en: v } : v;
}

// Places — options carry {outcomes:{success:{text,effects}}} already.
// opt.skill/difficulty land in `skill` when authored; `requires` rides
// payload until the feasibility filter knows what to do with it.
function placeInteractions(rec) {
  const rows = [];
  for (const sit of rec.situations ?? []) {
    for (const opt of sit.options ?? []) {
      const success = opt.outcomes?.success ?? {};
      const note = isLangNote(success.effects) ? { effects_note: success.effects } : {};
      rows.push({
        id: `${sit.id}:${opt.id}`,
        places_narration_id: rec.id,
        entities_narration_id: null,
        act: OPTION_TO_ACT[opt.id] ?? DERIVED_DEFAULT_ACT,
        label: opt.label ? { en: opt.label } : null,
        need_tags: opt.tags ?? (opt.tag ? [opt.tag] : []),
        skill: opt.skill != null
          ? { name: opt.skill, ...(opt.difficulty != null ? { difficulty: opt.difficulty } : {}) }
          : null,
        outcomes: {
          success: { text: toLang(success.text), effects: effectsToList(success.effects), ...note },
          ...(opt.outcomes?.failure
            ? { failure: { text: toLang(opt.outcomes.failure.text), effects: effectsToList(opt.outcomes.failure.effects) } }
            : {}),
        },
        payload: {
          origin: 'seed:interactions', situation: sit.id,
          ...(opt.requires != null ? { requires: opt.requires } : {}),
        },
      });
    }
  }
  return rows;
}

// Entities — options carry {label, tags, stance, commands}; situation-level
// commands apply to every option of that situation (the meal they give you
// even when you walk on). Stance/commands-only situations become a single
// inevitable interaction.
function entityInteractions(rec) {
  const rows = [];
  for (const sit of rec.situations ?? []) {
    const sharedEffects = (sit.commands ?? []).flatMap(commandToEffects);
    const options = sit.options ?? [];

    if (options.length) {
      for (const opt of options) {
        rows.push({
          id: `${sit.id}:${opt.id}`,
          places_narration_id: null,
          entities_narration_id: rec.id,
          act: OPTION_TO_ACT[opt.id] ?? FORM_TO_ACT[rec.form] ?? DERIVED_DEFAULT_ACT,
          label: opt.label ? { en: opt.label } : null,
          need_tags: opt.tags ?? (opt.tag ? [opt.tag] : []),
          skill: null,
          outcomes: {
            success: {
              text: toLang(opt.stance ?? opt.label),
              effects: [...sharedEffects, ...(opt.commands ?? []).flatMap(commandToEffects)],
            },
          },
          payload: { origin: 'seed:interactions', situation: sit.id },
        });
      }
      continue;
    }

    if (!sit.stance && !sharedEffects.length) continue; // narrative-only Situation

    rows.push({
      id: `${sit.id}:sole`,
      places_narration_id: null,
      entities_narration_id: rec.id,
      act: FORM_TO_ACT[rec.form] ?? DERIVED_DEFAULT_ACT,
      label: null,
      need_tags: sit.tags ?? [],
      skill: null,
      outcomes: { success: { text: toLang(sit.stance), effects: sharedEffects } },
      payload: {
        origin: 'seed:interactions',
        situation: sit.id,
        ...(rec.form ? { mapped_from_form: rec.form } : {}),
      },
    });
  }
  return rows;
}

// Situations stay on their record — but only the authored descriptor
// (gating + prose). Everything executable (options, commands) now lives
// solely in interactions.json.
const EXECUTABLE_SIT_KEYS = new Set(['options', 'commands']);
function slimInteractive(records) {
  let stripped = 0;
  for (const rec of records) {
    for (const sit of rec.situations ?? []) {
      for (const k of EXECUTABLE_SIT_KEYS) {
        if (k in sit) { delete sit[k]; stripped++; }
      }
    }
  }
  return stripped;
}

// Detect a file's JSON indent (' ' × n) so rewriting stays diff-quiet.
function detectIndent(text) {
  const m = text.match(/\n( +)\S/);
  return m ? m[1].length : 2;
}

async function main() {
  const files = {
    'places.json': null,
    'narration.json': null,
    'entities_narration.json': null,
  };
  const indents = {};
  for (const f of Object.keys(files)) {
    const text = await fs.readFile(path.join(DATA_DIR, f), 'utf8');
    files[f] = JSON.parse(text);
    indents[f] = detectIndent(text);
  }
  const placeRecords = files['places.json'].records ?? files['places.json'];
  const narrationRecords = files['narration.json'].records ?? files['narration.json'];
  const entities = files['entities_narration.json'];

  const interactions = [
    ...placeRecords.flatMap(placeInteractions),
    ...narrationRecords.flatMap(placeInteractions),
    ...entities.flatMap(entityInteractions),
  ];

  const actCount = {};
  for (const i of interactions) actCount[i.act] = (actCount[i.act] ?? 0) + 1;
  console.log(`interactions.json: ${interactions.length} rows —`,
    Object.entries(actCount).map(([a, n]) => `${a}:${n}`).join(' '));

  const stripped =
    slimInteractive(placeRecords) + slimInteractive(narrationRecords) + slimInteractive(entities);
  console.log(`sources slimmed: ${stripped} executable keys removed from situations[]`);

  if (DRY) { console.log('--dry-run: nothing written'); return; }

  await fs.writeFile(
    path.join(DATA_DIR, 'interactions.json'),
    JSON.stringify(interactions, null, 2) + '\n'
  );
  for (const f of Object.keys(files)) {
    await fs.writeFile(
      path.join(DATA_DIR, f),
      JSON.stringify(files[f], null, indents[f]) + '\n'
    );
  }
  console.log('✅ interactions.json written; places/entities_narration/narration slimmed');
}

main().catch((e) => { console.error(e); process.exit(1); });
