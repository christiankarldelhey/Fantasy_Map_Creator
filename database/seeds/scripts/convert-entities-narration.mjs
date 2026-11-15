#!/usr/bin/env node
// ============================================================================
// convert-entities-narration.mjs
// ----------------------------------------------------------------------------
// One-shot converter: legacy encounter sources → data/json/entities_narration.json
//
//   encounter_forms.csv   → kind='form'    (the contact-shape draw)
//   npc_interactions.csv  → kind='contact' (the substance of a contact)
//   entities.csv          → kind='entity'  (the being's ficha: aspect/lore)
//   movers/*.yml          → kind='entity'  (mover ficha, entity_slug) +
//                           kind='contact' (per leg: leg_ref + beats→variants)
//
// Scope refs stay stable across reseeds: entity ids come from entities.csv
// (stable UUIDs); movers and legs regenerate, so the JSON carries
// entity_slug / leg_ref {mover, leg_index} and the seed loader resolves the
// real FKs at load time. See docs/design/entities-narration.md.
// ============================================================================

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const DATA_DIR = path.resolve(path.dirname(__filename), '..', 'data');
const OUT = path.join(DATA_DIR, 'json', 'entities_narration.json');

// --------------------------------------------------------------------------
// CSV parsing (same relaxed-quote handling as load-seeds parseCsv)
// --------------------------------------------------------------------------
function parseCsv(text) {
  const rows = [];
  let cur = '', inQ = false, row = [];
  const flushCell = () => { row.push(cur); cur = ''; };
  const flushRow = () => { if (row.length > 1 || row[0] !== '') rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') flushCell();
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      flushCell(); flushRow();
    } else cur += ch;
  }
  flushCell(); flushRow();
  const hdr = rows.shift();
  return rows.map(r => Object.fromEntries(hdr.map((h, i) => [h, r[i] ?? ''])));
}

const nil = (v) => (v == null || v === '' ? null : v);
const num = (v) => (nil(v) == null ? null : Number(v));
const bool = (v) => v === 'True' || v === 'true' || v === '1';
const lang = (v) => (nil(v) == null ? null : { en: v });
const pgArr = (v) => { // '{uuid,uuid}' → ['uuid','uuid']
  const s = nil(v);
  if (!s) return null;
  return s.replace(/^\{|\}$/g, '').split(',').map(x => x.trim()).filter(Boolean);
};
const jsonOr = (v) => { try { return nil(v) == null ? null : JSON.parse(v); } catch { return null; } };

// character-specific substance → race gates (design: race, not person)
const CHARACTER_RACE = { aranath: 'dunedain', celebrian: 'elf' };

const records = [];

// --------------------------------------------------------------------------
// 1. encounter_forms → kind='form'
// --------------------------------------------------------------------------
const forms = parseCsv(await fs.readFile(path.join(DATA_DIR, 'csv/encounter_forms.csv'), 'utf8'));
for (const r of forms) {
  records.push({
    id: `form:${r.entity_type}:${r.interaction_form}`,
    kind: 'form',
    entity_type: nil(r.entity_type),
    form: nil(r.interaction_form),
    intensity: num(r.intensity),
    weight: num(r.weight),
    min_danger: num(r.min_danger),
    max_danger: num(r.max_danger),
    triggers_roll: bool(r.triggers_roll),
    aspect: lang(r.prose_hint),
    tags: [],
    payload: { source: 'encounter_forms', legacy_id: nil(r.id) },
  });
}

// --------------------------------------------------------------------------
// 2. npc_interactions → kind='contact'
// --------------------------------------------------------------------------
const npc = parseCsv(await fs.readFile(path.join(DATA_DIR, 'csv/npc_interactions.csv'), 'utf8'));
for (const r of npc) {
  const id = `cnt:${r.id}`;
  const options = jsonOr(r.options);
  const commands = jsonOr(r.commands);
  const situation = {
    id: `${id}:sit`,
    tags: [],
    situation: lang(r.tension),
    stance: lang(r.traveller_stance),
    commands: commands ?? undefined,
    options: options ?? undefined,
  };
  const hasInteractive = situation.situation || situation.stance || situation.commands || situation.options;
  records.push({
    id,
    kind: 'contact',
    entity_id: nil(r.entity_id),
    entity_ids: pgArr(r.entity_ids) ?? undefined,
    entity_type: nil(r.entity_type),
    region_id: num(r.region_id),
    cultural_family: nil(r.cultural_family),
    form: nil(r.interaction_form),
    tags: nil(r.character_id) ? [`race:${CHARACTER_RACE[r.character_id] ?? r.character_id}`] : [],
    disposition: lang(r.npc_attitude),
    presence: lang(r.concrete_content),
    channel: lang(r.topic_prose_hint),
    facts: nil(r.topic) ? { topic: r.topic } : null,
    interactive: hasInteractive ? [situation] : null,
    payload: { source: 'npc_interactions', legacy_id: nil(r.id),
               legacy_character: nil(r.character_id) ?? undefined },
  });
}

// --------------------------------------------------------------------------
// 3. entities → kind='entity' fichas (aspect = summary, lore = description)
// --------------------------------------------------------------------------
const ents = parseCsv(await fs.readFile(path.join(DATA_DIR, 'csv/entities.csv'), 'utf8'));
for (const e of ents) {
  if (!e.slug) continue;
  records.push({
    id: `ent:${e.slug}`,
    kind: 'entity',
    entity_id: nil(e.id),
    entity_type: nil(e.type),
    aspect: lang(e.description_summary),
    lore: lang(e.description),
    tags: [],
    payload: { source: 'entities' },
  });
}

// --------------------------------------------------------------------------
// 4. movers/*.yml → entity fichas + per-leg contacts (beats → variants)
// --------------------------------------------------------------------------
const moversDir = path.join(DATA_DIR, 'movers');
const moverFiles = (await fs.readdir(moversDir)).filter(f => f.endsWith('.yml') && f !== 'campaigns.yml');
for (const file of moverFiles) {
  const doc = yaml.load(await fs.readFile(path.join(moversDir, file), 'utf8'));
  const m = doc.mover ?? {};
  if (!m.slug) continue;

  // `ent:mover:` namespace: a named individual can share a slug with an
  // entities.csv subject (e.g. `umli` the people vs `umli` the mover).
  records.push({
    id: `ent:mover:${m.slug}`,
    kind: 'entity',
    entity_slug: m.slug,
    entity_type: 'npc',
    lore: lang(m.description),
    notes: lang(m.motivation),
    facts: { canon: Boolean(m.canon), mover_kind: m.kind ?? null,
             campaign: m.campaign ?? null },
    tags: [],
    payload: { source: 'movers' },
  });

  const legs = Array.isArray(doc.legs) ? doc.legs : [];
  legs.forEach((leg, i) => {
    const legIndex = Number(leg.index ?? i + 1);
    const beats = leg.beats ?? (leg.beat ? [leg.beat] : []);
    records.push({
      id: `cnt:${m.slug}:leg:${legIndex}`,
      kind: 'contact',
      entity_slug: m.slug,
      entity_type: 'npc',
      leg_ref: { mover: m.slug, leg_index: legIndex },
      form: null,
      aspect: lang(leg.trace),   // the distance-sign: the face seen from afar
      variants: beats.map((b) => ({
        id: b.variant ?? 'base',
        title: b.title ?? null,
        text: { en: b.text },
        effects: b.effects ?? {},
      })),
      facts: {
        leg_kind: leg.kind ?? null,
        visibility: leg.visibility ?? 'signs',
        campaign: leg.campaign ?? m.campaign ?? null,
      },
      tags: [],
      payload: { source: 'mover_beats' },
    });
  });
}

// --------------------------------------------------------------------------
// Write
// --------------------------------------------------------------------------
for (const r of records) {
  for (const k of Object.keys(r)) if (r[k] === undefined) delete r[k];
}
await fs.writeFile(OUT, JSON.stringify(records, null, 2) + '\n', 'utf8');
const by = {};
for (const r of records) by[r.kind] = (by[r.kind] || 0) + 1;
console.log(`entities_narration.json: ${records.length} records`, by);
