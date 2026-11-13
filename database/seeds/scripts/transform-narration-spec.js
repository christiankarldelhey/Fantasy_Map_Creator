// ============================================================================
// One-shot transform: places.json + narration.json → narration-v2 spec
// ----------------------------------------------------------------------------
// ADR-0015. Rewrites both authored files in place:
//   kinds      place | ambient (depiction/arrival/lore/interaction fold in)
//   prose      description → aspect, base → presence, base_lore → lore,
//              note → notes, condition/trigger → when + translated tags
//   beats      → single-option interactive situations
//   offers     → interactive situations folded into their place_ref parent
//   rest/ovn   → 'context:overnight' situation; mechanics → outcome effects
//   payload    → provenance only (origin, legacy_id, anchor_hint, location_ref…)
//
// Usage: node database/seeds/scripts/transform-narration-spec.js [--write]
//   Without --write it prints a dry-run report (counts + untranslated gates).
// ============================================================================

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)), '../data/json'
);
const WRITE = process.argv.includes('--write');

// ---------------------------------------------------------------------------
// Gate translation: legacy condition/trigger text → tags / not_tags / when
// ----------------------------------------------------------------------------
// Anything that parses lands in tags; the rest stays as `when` narrative.
const SLUG = (s) => String(s).toLowerCase().trim()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const GROUND = { soft: 'soft', hard: 'hard', blando: 'soft', duro: 'hard', doubtful: 'doubtful' };
const SEASON = { spring: 'spring', summer: 'summer', autumn: 'autumn', winter: 'winter',
                 primavera: 'spring', verano: 'summer', otoño: 'autumn', invierno: 'winter' };
const WEATHER = { clear: 'clear', fog: 'fog', frost: 'frost', wet: 'wet',
                  despejada: 'clear', lluvia: 'wet' };
const PHASE = { night: 'night', noche: 'night', afternoon: 'afternoon', tarde: 'afternoon',
                morning: 'morning', atardecer: 'evening' };

/**
 * condition text → { tags, not_tags, when }.
 * `when` keeps the {en,es} form — call sites pass the trigger object directly
 * for narrative-only gates; parseable fragments become tags.
 */
function gateFrom(condition, whenText = null) {
  const tags = [];
  const not_tags = [];
  let rest = String(condition || '').replace(/\*/g, '');
  const unmatched = [];

  const eat = (re, tag) => {
    const m = rest.match(re);
    if (m) { tags.push(typeof tag === 'function' ? tag(m) : tag); rest = rest.replace(m[0], ' '); return true; }
    return false;
  };
  const eatNot = (re, tag) => {
    const m = rest.match(re);
    if (m) { not_tags.push(typeof tag === 'function' ? tag(m) : tag); rest = rest.replace(m[0], ' '); return true; }
    return false;
  };

  // Authored Spanish vocab → canonical registry values (narration_tags)
  const canonTag = (t) => TAG_ALIASES[t] ?? t;

  // NOT creencia("x") / creencia("x")
  eatNot(/NOT\s+creencia\(["'`]([^"'`]+)["'`]\)/i, (m) => `belief:${SLUG(m[1])}`);
  eat(/creencia\(["'`]([^"'`]+)["'`]\)/i, (m) => `belief:${SLUG(m[1])}`);
  eat(/NOT\s+creencia\s*\(([^)]+)\)/i, (m) => `belief:${SLUG(m[1])}`);

  // season in [a, b] / season == x / bare season words
  const seasonIn = rest.match(/season\s+in\s+\[([^\]]+)\]/i);
  if (seasonIn) {
    for (const s of seasonIn[1].split(',')) {
      const v = SEASON[s.trim().toLowerCase()];
      if (v) tags.push(`season:${v}`); else unmatched.push(`season:${s.trim()}`);
    }
    rest = rest.replace(seasonIn[0], ' ');
  }
  eat(/season\s*==\s*(\w+)/i, (m) => `season:${SEASON[m[1].toLowerCase()] ?? m[1].toLowerCase()}`);

  // ground / suelo
  eat(/ground\s*==\s*(\w+)/i, (m) => `ground:${GROUND[m[1].toLowerCase()] ?? m[1].toLowerCase()}`);
  eat(/suelo\s*(?:==|pasa de duro a)?\s*(blando|duro)/i, (m) => `ground:${GROUND[m[1].toLowerCase()]}`);

  // weather / phase / time / entry
  eat(/weather\s*==\s*(\w+)/i, (m) => `weather:${WEATHER[m[1].toLowerCase()] ?? m[1].toLowerCase()}`);
  eat(/phase\s*==\s*(\w+)/i, (m) => `phase:${PHASE[m[1].toLowerCase()] ?? m[1].toLowerCase()}`);
  eat(/time\s*==\s*(\w+)/i, (m) => `phase:${PHASE[m[1].toLowerCase()] ?? m[1].toLowerCase()}`);
  eat(/entry\s*==\s*(\w+)/i, (m) => `entry:${m[1].toLowerCase()}`);
  eat(/entry_count\s*==\s*1\b/i, () => 'entry:first');
  eat(/entry_count\s*==\s*(\d+)/i, (m) => `entry_count:${m[1]}`);
  eat(/entry_count\s*>\s*(\d+)/i, (m) => `entry_count:${Number(m[1]) + 1}`);

  // region_days_total comparisons → cumulative region_day:N
  const rdGe = rest.match(/region_days_total\s*>=\s*(\d+)/i);
  if (rdGe) { tags.push(`region_day:${rdGe[1]}`); rest = rest.replace(rdGe[0], ' '); }
  const rdEq = rest.match(/region_days_total\s*==\s*(\d+)/i);
  if (rdEq) { tags.push(`region_day:${rdEq[1]}`, 'not_tags_never'); rest = rest.replace(rdEq[0], ' '); }
  const rdBetween = rest.match(/region_days_total\s+entre\s+(\d+)\s+y\s+(\d+)/i);
  if (rdBetween) { tags.push(`region_day:${rdBetween[1]}`); rest = rest.replace(rdBetween[0], ' '); }

  // days_since_last_exit comparisons
  eat(/days_since_last_exit\s*>=\s*(\d+)/i, (m) => `days_since_exit:${m[1]}`);
  eat(/days_since_last_exit\s*<\s*(\d+)/i, (m) => null); // can't express "<" — drop to when

  // Spanish day/night phrasing
  eat(/desde\s+el\s+d[ií]a\s*(\d+)/i, (m) => `region_day:${m[1]}`);
  eat(/desde\s+la\s+noche\s*(\d+)/i, (m) => `region_day:${m[1]}`);
  eat(/d[ií]a\s*(\d+)\s+en\s+adelante/i, (m) => `region_day:${m[1]}`);
  eat(/noche\s*(\d+)\s+en\s+adelante/i, (m) => `region_day:${m[1]}`);
  eat(/^\s*d[ií]a\s*(\d+)\s*$/i, (m) => `region_day:${m[1]}`);
  eat(/^\s*noche\s*(\d+)\s*$/i, (m) => `region_day:${m[1]}`);
  // unanchored "día N" / "noche N" fragments — leftover words go to `when`
  eat(/d[ií]a\s*(\d+)/i, (m) => `region_day:${m[1]}`);
  eat(/noche\s*(\d+)/i, (m) => `region_day:${m[1]}`);

  // Mind states in prose form
  eat(/melancol[ií]a\s*(\+{1,3}|alta|media|baja)?/i, () => 'mind:melancholy');
  eat(/sed\s+en\s+banda\s+baja/i, () => 'mind:thirst');
  eat(/sed\s+en\s+banda\s+media/i, () => 'mind:thirst');
  eat(/hambre\s+baja/i, () => 'mind:hunger');
  eat(/con\s+[`']([^`']+)[`']\s+alto/i, (m) => `mind:${SLUG(m[1])}`);
  eat(/con\s+(\w+)\s+alto/i, (m) => `mind:${SLUG(m[1])}`);

  // acampa → overnight flag
  eat(/el\s+personaje\s+acampa/i, () => 'context:overnight');

  // Bare season/phase words (a lone "invierno", "atardecer", "de noche")
  const bare = rest.trim().toLowerCase();
  if (SEASON[bare]) { tags.push(`season:${SEASON[bare]}`); rest = ' '; }
  if (bare === 'de noche') { tags.push('phase:night'); rest = ' '; }
  if (bare === 'noche despejada') { tags.push('phase:night', 'weather:clear'); rest = ' '; }
  if (PHASE[bare] && bare !== 'noche') { tags.push(`phase:${PHASE[bare]}`); rest = ' '; }
  if (bare === 'noche') { tags.push('phase:night'); rest = ' '; }
  if (bare === 'en junio' || bare === 'en julio' || bare === 'en agosto') { tags.push('season:summer'); rest = ' '; }

  // AND connectors and stray punctuation just fall away
  rest = rest.replace(/\bAND\b/gi, ' ').replace(/[·,;()]/g, ' ').replace(/\s+/g, ' ').trim();
  if (rest) unmatched.push(rest);

  const out = { tags: tags.map(canonTag).filter(Boolean) };
  if (not_tags.length) out.not_tags = not_tags.map(canonTag);
  // exact-match guards we approximated get narrated too
  if (rdEq) out.tags = out.tags.filter((t) => t !== 'not_tags_never');
  if (unmatched.length || whenText) {
    const w = typeof whenText === 'object' && whenText
      ? { en: whenText.en ?? whenText.trigger_en ?? null, es: whenText.es ?? whenText.trigger ?? null }
      : { en: String(condition) };
    if (w.en || w.es) out.when = w;
    else if (unmatched.length) out.when = { en: String(condition) };
  }
  return { gate: out, unmatched };
}

// ---------------------------------------------------------------------------
// Record transforms
// ---------------------------------------------------------------------------

const PROVENANCE_KEYS = new Set([
  'origin', 'legacy_id', 'anchor_hint', 'location_ref', 'approx_point',
  'region', 'region_confidence', 'place_ref',
]);

const stripTag = (t) => String(t).replace(/^tag:/, '');

// Authored Spanish/legacy vocab → canonical registry values (narration_tags).
const TAG_ALIASES = {
  'belief:sin_pajaros': 'belief:no_birds',
  'belief:sin_olor': 'belief:no_smell',
  'belief:sin_reparo': 'belief:no_repair',
  'mind:preguntas': 'mind:curiosity',
  'mind:vistos': 'mind:curiosity',
  'mind:desvio': 'mind:wander',
};

function localized(v) {
  if (v == null) return null;
  if (typeof v === 'object') {
    const { en = null, es = null } = v;
    return en || es ? { en, es } : null;
  }
  return { en: String(v), es: null };
}

const VARIANT_KEY_TAGS = {
  spring: 'season:spring', summer: 'season:summer', autumn: 'season:autumn',
  winter: 'season:winter', rain: 'weather:rain', snow: 'weather:snow',
  fog: 'weather:fog',
};

function variantToV2(v, report, rid) {
  const key = v.id ?? v.key;
  const out = { ...(key ? { id: key } : {}) };
  // legacy key doubles as a gating tag ('base' stays tagless — always applies)
  if (VARIANT_KEY_TAGS[key]) out.tags = [VARIANT_KEY_TAGS[key]];
  if (Array.isArray(v.phrases) && v.phrases.length) out.phrases = v.phrases;
  const text = localized(v.text);
  if (text) out.text = text;
  if (v.label && localized(v.label)) out.label = localized(v.label);
  if (v.condition) {
    const { gate, unmatched } = gateFrom(v.condition);
    if (gate.tags.length) out.tags = gate.tags;
    if (gate.not_tags) out.not_tags = gate.not_tags;
    if (gate.when) out.when = gate.when;
    if (unmatched.length) report.unmatched.push({ id: rid, cond: v.condition });
  }
  return out;
}

function beatToSituation(b, report, rid) {
  const sit = { id: b.id ?? `${rid}_beat` };
  const cond = typeof b.trigger === 'string' ? b.trigger : (b.trigger_en ?? null);
  if (cond) {
    const { gate, unmatched } = gateFrom(cond, { en: b.trigger_en ?? null, es: b.trigger ?? null });
    if (gate.tags.length) sit.tags = gate.tags;
    if (gate.not_tags) sit.not_tags = gate.not_tags;
    if (gate.when) sit.when = gate.when;
    if (unmatched.length) report.unmatched.push({ id: rid, cond });
  } else if (localized(b.trigger)) {
    sit.when = localized(b.trigger);
  }
  if (b.intensity != null) sit.intensity = b.intensity;
  if (b.once != null) sit.once = b.once;
  if (b.mind && (b.mind.note_en || b.mind.note_es)) sit.mind = b.mind;
  const text = localized(b.text ?? b.instruction);
  sit.options = [{
    id: `${sit.id}_opt`,
    outcomes: { success: { text } },
  }];
  return sit;
}

function offerOptionToV2(o) {
  return {
    id: o.id ?? null,
    tag: o.tag ?? null,
    skill: o.skill ?? null,
    difficulty: o.difficulty ?? null,
    requires: o.requires ?? null,
    outcomes: {
      success: {
        text: localized(o.result ?? o.text),
        effects: o.effects ?? null,
      },
      ...(o.failure ? { failure: { text: localized(o.failure), effects: null } } : {}),
    },
  };
}

/** places.json record → v2 record */
function transformPlacesRecord(r, report) {
  const kind = r.kind === 'place' ? 'place' : 'ambient';
  const out = {
    id: r.id,
    kind,
    ...(r.location_id != null ? { location_id: r.location_id } : {}),
    region_ids: r.region_ids ?? (r.region_id != null ? [r.region_id] : null),
    name: localized(r.name),
    type: localized(r.type),
    priority: r.priority ?? 0,
    tags: (r.tags || []).map(stripTag),
  };
  if (kind === 'place') {
    out.size_radius_km = r.size_radius_km ?? null;
    out.influence_radius_km = r.influence_radius_km ?? null;
  }

  const prose = {
    aspect: localized(r.aspect),
    presence: localized(r.presence ?? r.base),
    lore: localized(r.lore ?? r.base_lore),
    secret: r.secret ? {
      when: localized(r.secret.condition ?? r.secret.when),
      text: localized(r.secret.text),
    } : null,
    sections: Array.isArray(r.sections) && r.sections.length ? r.sections : null,
    facts: r.facts ?? null,
    notes: localized(r.notes ?? r.note),
    channel: localized(r.channel),
    traveller_use: localized(r.traveller_use),
  };
  for (const [k, v] of Object.entries(prose)) if (v != null) out[k] = v;

  if (Array.isArray(r.variants) && r.variants.length) {
    out.variants = r.variants.map((v) => variantToV2(v, report, r.id));
  }

  const situations = [];
  for (const b of r.beats || []) situations.push(beatToSituation(b, report, r.id));
  if (r.kind === 'interaction' && Array.isArray(r.options)) {
    situations.push({
      id: `${r.id}_offer`,
      when: localized(r.when ?? r.trigger ?? r.situation),
      situation: localized(r.situation),
      options: r.options.map(offerOptionToV2),
    });
  }
  if (situations.length) out.interactive = situations;

  // payload → provenance only
  const payload = {};
  for (const [k, v] of Object.entries(r)) {
    if (PROVENANCE_KEYS.has(k) && v != null && v !== '') payload[k] = v;
  }
  if (r.origin) payload.origin = r.origin;
  out.payload = payload;
  return out;
}

/** narration.json record → v2 record */
function transformNarrationRecord(r, report) {
  const payload = r.payload ?? {};
  const out = {
    id: r.id,
    kind: 'ambient',
    ...(r.location_id != null ? { location_id: r.location_id } : {}),
    region_ids: r.region_ids ?? (r.region_id != null ? [r.region_id] : null),
    name: localized(r.name),
    type: localized(r.type),
    cultural_family: r.cultural_family ?? null,
    priority: r.priority ?? 0,
    tags: (r.tags || []).map(stripTag),
  };
  if (r.refs) out.refs = r.refs;

  if (r.kind === 'interaction' && r.action === 'rest') {
    // overnight rest → presence + a tagged overnight situation
    out.presence = localized(r.description);
    if (!out.name && payload.title) out.name = { en: payload.title, es: null };
    out.interactive = [{
      id: `${r.id}_night`,
      tags: ['context:overnight'],
      options: [{
        id: 'rest',
        tag: 'mind:fatigue',
        outcomes: {
          success: {
            text: localized(r.description),
            effects: r.mechanics ?? null,
          },
        },
      }],
    }];
  } else {
    out.aspect = localized(r.description);
    if (payload.rotation) out.rotation = payload.rotation;
    if (payload.facts) out.facts = payload.facts;
  }

  if (Array.isArray(r.variants) && r.variants.length) {
    out.variants = r.variants.map((v) => variantToV2(v, report, r.id));
  }

  out.payload = { ...(payload.origin ? { origin: payload.origin } : {}),
                  ...(payload.legacy_id != null ? { legacy_id: payload.legacy_id } : {}),
                  ...(payload.title ? { title: payload.title } : {}),
                  // scope metadata terrainPhrases matches on
                  ...(payload.region_name ? { region_name: payload.region_name } : {}),
                  ...(payload.category ? { category: payload.category } : {}) };
  return out;
}

// ---------------------------------------------------------------------------
// Fold offer situations into their place_ref parent (transform-time, like the
// SQL migration's step 9). Orphan offers stay as ambient records.
// ---------------------------------------------------------------------------
function foldOffers(records, report) {
  const byId = new Map(records.map((r) => [r.id, r]));
  const kept = [];
  let folded = 0;
  for (const r of records) {
    const ref = r.payload?.place_ref;
    const parent = ref && byId.get(ref);
    if (parent && Array.isArray(r.interactive)) {
      parent.interactive = [...(parent.interactive || []), ...r.interactive];
      folded += 1;
      continue;
    }
    kept.push(r);
  }
  report.folded = folded;
  return kept;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const report = { unmatched: [], folded: 0, counts: {} };

const placesSrc = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'places.json'), 'utf8'));
const narrSrc = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'narration.json'), 'utf8'));

let places = placesSrc.records.map((r) => transformPlacesRecord(r, report));
places = foldOffers(places, report);
const narr = narrSrc.records.map((r) => transformNarrationRecord(r, report));

const kinds = {};
for (const r of [...places, ...narr]) kinds[r.kind] = (kinds[r.kind] || 0) + 1;
report.counts = { places: places.length, narration: narr.length, kinds };

console.log(JSON.stringify({ ...report, unmatched: report.unmatched.slice(0, 40) }, null, 2));
console.error(`unmatched gates: ${report.unmatched.length}`);

if (WRITE) {
  placesSrc.records = places;
  placesSrc.schema = 'narration-v2';
  narrSrc.records = narr;
  narrSrc.schema = 'narration-v2';
  await fs.writeFile(path.join(DATA_DIR, 'places.json'), JSON.stringify(placesSrc, null, 1) + '\n');
  await fs.writeFile(path.join(DATA_DIR, 'narration.json'), JSON.stringify(narrSrc, null, 1) + '\n');
  console.error('written: places.json + narration.json (narration-v2)');
}
