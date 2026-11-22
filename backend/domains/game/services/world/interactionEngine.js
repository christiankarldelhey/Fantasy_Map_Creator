// ============================================================================
// Interaction engine (ADR-0019, Wave C)
// ----------------------------------------------------------------------------
// One choosing for every resolved Situation: the host says what is
// *feasible*, asks the Mind which it prefers (`POST /mind/minds/:id/choose`),
// rolls the skill, and applies the outcome — all BEFORE the day resolves and
// the episode opens. Situations resolve in narrative order; each outcome
// updates the projected Condition, emits an Event, and is perceived by the
// Mind before the next pool — the day is felt while it happens.
//
// Executable facts (options, acts, effects) live only in the interactions
// table — the narration records' situations[] is a descriptor store
// (situation ids, gates, prose). Fork detection is row-count, not JSONB.
// ============================================================================

import pool from '../../../../db.js';
import {
  choose as mindChoose,
  perceive as mindPerceive,
} from '../../../story/services/mind/mindClient.js';
import { solarKey } from '../../../story/services/naturalLanguage/daylight.js';
import { slugify } from '../../../story/services/naturalLanguage/text.js';
import { rollSkillCheck } from '../character/skillCheck.js';
import { applyShelterChoice } from './tripDay.js';

// ---------------------------------------------------------------------------
// Fetch + feasibility (host-owned per ADR-0019)
// ---------------------------------------------------------------------------

async function fetchInteractions({ placesNarrationId = null, entitiesNarrationId = null }) {
  const col = placesNarrationId ? 'places_narration_id' : 'entities_narration_id';
  const id = placesNarrationId ?? entitiesNarrationId;
  const { rows } = await pool.query(
    `SELECT id, act, label, need_tags, skill, outcomes, payload, intensity FROM interactions WHERE ${col} = $1`,
    [id]
  );
  return rows;
}

// What the character must be/have to take this option at all: the skill floor
// and the coin the option's success would cost. Everything else is preference,
// the Mind's job.
export function isFeasible(interaction, { skills = {}, coins = 0 }) {
  const min = interaction.skill?.min;
  if (min != null && (skills[`skill_${interaction.skill.name}`] ?? 0) < min) return false;
  const cost = (interaction.outcomes?.success?.effects ?? [])
    .filter((e) => e.type === 'coins' && Number.isFinite(e.amount) && e.amount < 0)
    .reduce((s, e) => s - e.amount, 0);
  return cost === 0 || coins >= cost;
}

// The honest success read the Mind weighs (p_success): expected roll of
// d10+skill+modifiers vs difficulty. No skill authored → 1.
export function successProbability(interaction, { skills = {}, energy = 100, shadow = 0 }) {
  const skill = interaction.skill;
  if (!skill?.difficulty) return 1.0;
  const value = skills[`skill_${skill.name}`] ?? 0;
  // rollSkillCheck semantics: success when roll(1..10) + value + mods >=
  // difficulty. Winning rolls = value - difficulty + 11 over 10 (band
  // modifiers ignored — a close honest read, not the roll itself).
  const winning = Math.min(10, Math.max(0, value - skill.difficulty + 11));
  return Math.max(0.05, winning / 10);
}

// ---------------------------------------------------------------------------
// Outcome application — typed effects → the day's own rails
// ---------------------------------------------------------------------------
// The effects decompose into two sinks: `day.shelter_choice`/`overnight_*`
// (roof, rest, shadow — resolveDayState's lodging path) and `day.commands`
// (the unconditional-gift rail it already honours: meal, water_refill,
// coins, item, heal). The choice is applied, then resolveDayState turns it
// into Condition — once, no re-resolution.

export function effectsToShelter(effects) {
  const shelter = {};
  for (const e of effects) {
    if (e.type === 'lodging') {
      shelter.name = e.name ?? shelter.name;
      shelter.description = e.description ?? shelter.description;
      shelter.indoor = !!e.indoor;
    } else if (e.type === 'rest' && Number.isFinite(e.quality)) {
      shelter.rest_quality = e.quality;
    } else if (e.type === 'shadow' && Number.isFinite(e.amount)) {
      shelter.shadow_effect = e.amount;
    } else if (e.type === 'coins' && Number.isFinite(e.amount) && e.amount < 0) {
      shelter.lodging_cost = -e.amount;
    } else if (e.type === 'meal') {
      shelter.meal = true;
      if (e.slug) shelter.meal_slug = e.slug;
      if (e.food) shelter.food = e.food;
    } else if (e.type === 'water' && e.refill) {
      shelter.water = true;
    }
  }
  return shelter;
}

export function effectsToCommands(effects, { inShelter = false } = {}) {
  const commands = [];
  for (const e of effects) {
    if (e.type === 'meal' && !inShelter) {
      commands.push({ type: 'meal', food: e.food ?? null, slug: e.slug ?? null });
    } else if (e.type === 'water' && e.refill && !inShelter) {
      commands.push({ type: 'water_refill' });
    } else if (e.type === 'coins' && Number.isFinite(e.amount) && e.amount > 0) {
      commands.push({ type: 'coins', amount: e.amount });
    } else if (e.type === 'item' && e.slug) {
      commands.push({ type: 'item', slug: e.slug, qty: e.qty ?? 1 });
    } else if (e.type === 'heal') {
      commands.push({ type: 'heal', ...(Number.isFinite(e.amount) ? { amount: e.amount } : {}) });
    }
  }
  return commands;
}

// The night's own Situation (a place's overnight record): the choice rewrites
// the night's fields directly — there is no second party granting a roof.
export function applyOvernightOutcome(day, outcome) {
  const effects = outcome?.effects ?? [];
  const shelter = effectsToShelter(effects);
  if (shelter.name) {
    day.overnight_location = { ...(day.overnight_location || {}), name: shelter.name, type: 'shelter', indoor: shelter.indoor };
  }
  day.overnight_interaction = {
    ...(day.overnight_interaction || {}),
    description: outcome?.text?.en ?? day.overnight_interaction?.description ?? null,
    rest_quality: shelter.rest_quality ?? day.overnight_interaction?.rest_quality ?? null,
    shadow_effect: shelter.shadow_effect ?? day.overnight_interaction?.shadow_effect ?? 0,
  };
  day.commands = [...(day.commands || []), ...effectsToCommands(effects, { inShelter: !!shelter.name })];
  if (shelter.meal || shelter.water || shelter.lodging_cost != null) {
    day.shelter_choice = { ...(day.shelter_choice || {}), ...shelter };
  }
}

// A shelter *offered* by a source (the entity stay): same application B5 did,
// only from typed effects instead of an overnight_shelter command.
function applyShelterOutcome(day, outcome) {
  const effects = outcome?.effects ?? [];
  const shelter = effectsToShelter(effects);
  applyShelterChoice(day, shelter);
  day.commands = [...(day.commands || []), ...effectsToCommands(effects, { inShelter: true })];
}

// ---------------------------------------------------------------------------
// The day's choosable Situations
// ---------------------------------------------------------------------------

// One slugifier for the whole wire (story/naturalLanguage/text.js):
// identities are 'the_border_that_does_not_exist' — a second spelling
// would fragment the mind's Relations and tag space.

// The night's own Situation — what the place itself offers at sleep.
function overnightPool(day) {
  const id = day.overnight_interaction?.id;
  if (!id) return null;
  return {
    kind: 'overnight',
    situation_id: id,
    subject: `place:${slugify(day.overnight_location?.name ?? id)}`,
    parent: { placesNarrationId: id },
    hour: 24, // the night always resolves last in narrative order
    phase: 'night',
    placeSlug: slugify(day.overnight_location?.name),
    apply: (day_, outcome) => applyOvernightOutcome(day_, outcome),
  };
}

// Every encounter's chosen situation — contact, crossing, or mover leg.
// Sole interactions apply their stance outright; the shared part of an
// options situation is the world's unconditional gift; the options
// themselves contest only at the shelter window (every authored contact
// fork is a "stay the night or walk on" offer — nothing to decide at
// 10am on the road).
function contactPools(day) {
  return (day.encounters || [])
    .filter((e) => e.interaction?.dialogue_content?.id
      && e.interaction?.dialogue_content?.situation_id)
    .map((e) => ({
      kind: 'contact',
      situation_id: e.interaction.dialogue_content.situation_id,
      // The situation's subject is the encounter's entity — the same
      // subject tag the perceived event sediments ('entity:rabbit'),
      // so the choice weighs the Relation the meeting actually built.
      subject: e.entity?.slug ? `entity:${slugify(e.entity.slug)}` : null,
      parent: { entitiesNarrationId: e.interaction.dialogue_content.id },
      // Only this situation's rows: the record's other situations are
      // not what the traveller lived.
      rowFilter: (r) => r.payload?.situation === e.interaction.dialogue_content.situation_id,
      encounter: e,
      offerWindow: e.night_timing === 'before_sleep',
      hour: e.hour_float ?? 12,
      phase: e.phase ?? 'afternoon',
      placeSlug: slugify(e.location?.name ?? e.location ?? day.overnight_location?.name),
      apply: (day_, outcome) => {
        const shelter = effectsToShelter(outcome?.effects ?? []);
        if (Object.keys(shelter).length) {
          applyShelterChoice(day_, shelter);
          day_.commands = [...(day_.commands || []), ...effectsToCommands(outcome?.effects ?? [], { inShelter: true })
            .map((c) => ({ ...c, hour_float: e.hour_float ?? null }))];
        } else {
          day_.commands = [...(day_.commands || []), ...effectsToCommands(outcome?.effects ?? [])
            .map((c) => ({ ...c, hour_float: e.hour_float ?? null }))];
        }
      },
    }));
}

// A phase's narrative position — ambient voices carry no hour, only the
// stretch of day the moment belongs to.
const PHASE_HOUR = { morning: 9, afternoon: 15, night: 21 };

// The land's voice: region ambient situations gated by the day's tag set.
// Option tags are gates here (the option only speaks when the day carries
// its tag) — the old favoured/untagged rule becomes the feasible set.
function ambientPools(day) {
  return (day.ambient_situations || [])
    .filter((s) => s.situation_id && s.record_id)
    .map((s) => ({
      kind: 'ambient',
      situation_id: s.situation_id,
      subject: null,
      parent: { placesNarrationId: s.record_id },
      rowFilter: (r) => r.payload?.situation === s.situation_id,
      ambient: s,
      hour: PHASE_HOUR[s.phase] ?? 12,
      phase: s.phase,
      placeSlug: slugify(typeof s.name === 'string' ? s.name : s.name?.en),
      fallbackRng: true, // the land draws at random when no mind weighs it
      // Tag gate, then the usual feasibility.
      feasible: (rows, ctx) => {
        const fav = rows.filter((r) => r.need_tags?.length && r.need_tags.every((t) => s.tagSet?.has(t)));
        const plain = rows.filter((r) => !r.need_tags?.length);
        const candidates = fav.length ? fav : (plain.length ? plain : rows);
        return candidates.filter((r) => isFeasible(r, ctx));
      },
      apply: (day_, outcome, interaction) => {
        const shadowFx = (outcome.effects || [])
          .filter((e) => e.type === 'shadow' && Number.isFinite(e.amount))
          .reduce((x, e) => x + e.amount, 0);
        day_.ambient.push({
          record_id: s.record_id,
          situation_id: s.situation_id,
          option_id: interaction.id.split(':').pop(),
          name: s.name,
          when: s.when,
          phase: s.phase,
          text: outcome.text ?? null,
          // The picked option's own tone outranks the record's (#184):
          // a 'walked on' choice inside an uneasy place can carry its
          // own settled word.
          felt: rowFelt(interaction) ?? s.felt ?? null,
          // resolveDayState reads the ambient rail's shadow through this
          // legacy shape; the rest of the effects land on day.commands.
          effects: shadowFx ? { shadow_effect: shadowFx } : null,
        });
        day_.commands = [...(day_.commands || []), ...effectsToCommands(outcome.effects)
          .map((c) => ({ ...c, hour_float: PHASE_HOUR[s.phase] ?? null }))];
      },
    }));
}

// ---------------------------------------------------------------------------
// Sequential choosing (Wave C): pools resolve in narrative order, each
// outcome lands in the Mind BEFORE the next pool is scored
// ---------------------------------------------------------------------------

// The Condition the next pool is read against: start state plus the deltas
// the picks so far declared. resolveDayState computes the true end-of-day
// numbers later; this is the honest mid-day projection.
function projectCondition(startState) {
  const p = {};
  for (const [k, v] of Object.entries(startState || {})) {
    if (typeof v === 'number' || typeof v === 'string') p[k] = v;
  }
  return p;
}

function applyConditionDeltas(projected, effects) {
  for (const e of effects || []) {
    if (e.type === 'coins' && Number.isFinite(e.amount)) {
      projected.coins = Math.max(0, (projected.coins ?? 0) + e.amount);
    } else if (e.type === 'energy' && Number.isFinite(e.amount)) {
      projected.energy = Math.max(0, Math.min(100, (projected.energy ?? 100) + e.amount));
    } else if (e.type === 'shadow' && Number.isFinite(e.amount)) {
      projected.shadow = Math.max(0, Math.min(100, (projected.shadow ?? 0) + e.amount));
    } else if (e.type === 'meal') {
      projected.days_without_food = 0;
    } else if (e.type === 'water' && e.refill) {
      projected.days_without_water = 0;
    }
  }
}

// The resolved pick as an Event: rides the interim /perceive now AND the
// episode's events[] at open — the stable id makes it count once.
// Envelope vocabulary rides flat (act/intensity/reading/tags); data
// holds what the kind owns — the subject entity, the outcome, the
// body after it landed, and the host ids as provenance.
export function outcomeEvent(day, pool_, interaction, outcomeKey, outcome, after = null) {
  const data = {
    outcome: outcomeKey,
    provenance: {
      situation_id: pool_.situation_id,
      interaction_id: interaction.id,
    },
  };
  // The body after the outcome landed — per-event vitals so the Studio
  // day chart can draw energy/shadow between event points.
  if (after) {
    data.after = { energy: after.energy ?? null, shadow: after.shadow ?? null };
  }
  const shadowFx = (outcome?.effects || [])
    .filter((e) => e.type === 'shadow' && Number.isFinite(e.amount))
    .reduce((s, e) => s + e.amount, 0);
  if (shadowFx) data.shadow_delta = shadowFx;
  // The thing lived — the encounter's entity, whatever it is (rabbit,
  // ruin, bandit camp): one namespace for every subject, matching the
  // encounter event's own entity channel.
  const entity = pool_.subject?.startsWith('entity:')
    ? pool_.subject.slice(7) : null;
  if (entity) {
    data.entity = entity;
    data.entity_name = pool_.encounter?.entity?.name ?? entity;
    if (Number.isFinite(pool_.encounter?.entity?.danger)) {
      data.danger = pool_.encounter.entity.danger;
    }
  }
  const when = {};
  if (pool_.hour != null) when.hour = pool_.hour;
  if (pool_.phase != null) when.phase = pool_.phase;
  const light = solarKey(when.hour, day?.daylight)
    ?? (when.phase === 'night' ? 'night' : null);
  if (light) when.light = light;
  return {
    id: `d${day.day_number}:sit:${pool_.situation_id}:${interaction.id.split(':').pop()}`,
    type: 'interaction',
    when,
    // The wire omits what it does not say — null channels never ship.
    where: {
      ...(day.regions?.[0]?.name ? { region: day.regions[0].name } : {}),
      ...(pool_.placeSlug ? { place: pool_.placeSlug } : {}),
    },
    act: interaction.act,
    // The choice's own force wins; a row that declares none inherits
    // how hard the meeting hit (#184).
    intensity: interaction.intensity ?? pool_.encounter?.interaction?.intensity ?? undefined,
    // The event reads whole on its own: the situation's own lead-in
    // ('he saw them before they saw him…') opens, the outcome resolves —
    // a bare 'Takes the ford upstream.' is a memory with no subject.
    reading: [
      pool_.encounter?.interaction?.dialogue_content?.npc_attitude,
      outcome?.text?.en,
    ].filter(Boolean).join(' ') || undefined,
    // Tone (#184): an authored felt on the interaction row wins; else
    // the contact record's own felt:* tag speaks for the meeting. The
    // act itself rides the envelope — no 'tag:<act>' duplicate.
    tags: [...(interaction.need_tags || []),
      ...(rowFelt(interaction) ? [rowFelt(interaction)] : contactFelt(pool_))],
    data,
  };
}

// An authored tone on the interaction row itself — payload.felt names
// the wheel word; stored already prefixed so either form loads.
function rowFelt(interaction) {
  const f = interaction.felt ?? interaction.payload?.felt;
  if (!f) return null;
  return String(f).startsWith('felt:') ? String(f) : `felt:${f}`;
}

// The contact record's tone: entities_narration rows carry felt:* in
// `tags`; the resolved dialogue keeps the record as `narration`.
function contactFelt(pool_) {
  const narration = pool_.encounter?.interaction?.dialogue_content?.narration;
  const tags = narration?.contact_tags ?? narration?.tags ?? [];
  const felt = tags.find((t) => t.startsWith('felt:'));
  return felt ? [felt] : [];
}

// The shared part of an options situation — sit-level commands were
// replicated into every option's effects at backfill; their intersection
// is the gift the traveller receives no matter which way the scene plays.
function sharedEffects(rows) {
  const lists = rows.map((r) => r.outcomes?.success?.effects ?? []);
  if (!lists.length || lists.some((l) => !l.length)) return [];
  const key = (e) => JSON.stringify(e);
  const first = new Set(lists[0].map(key));
  for (const l of lists.slice(1)) {
    const s = new Set(l.map(key));
    for (const k of [...first]) if (!s.has(k)) first.delete(k);
  }
  return lists[0].filter((e) => first.has(key(e)));
}

export async function resolveDayChoices(day, { characterId, startState = {}, rng = Math.random }) {
  // Narrative order: ambient voices and contacts by their hour, the
  // night itself last.
  const pools = [...ambientPools(day), ...contactPools(day), overnightPool(day)]
    .filter(Boolean)
    .sort((a, b) => a.hour - b.hour);
  if (!pools.length) return [];

  const projected = projectCondition(startState);
  const ctx = {
    skills: startState,
    get coins() { return projected.coins ?? 0; },
    get energy() { return projected.energy ?? 100; },
    get shadow() { return projected.shadow ?? 0; },
  };

  const applied = [];
  const events = [];
  // Outcome events flush before the next choose — the next pool is
  // scored by the Mind as it stands after everything felt so far.
  const flush = async () => {
    const pending = events.filter((e) => !e._felt);
    if (!pending.length || !characterId) return;
    try {
      await mindPerceive(characterId, { events: pending, character: projected });
      for (const e of pending) e._felt = true;
    } catch (err) {
      console.warn('[mind] perceive failed (non-fatal):', err.message);
    }
  };

  for (const pool_ of pools) {
    let rows = await fetchInteractions(pool_.parent);
    if (pool_.rowFilter) rows = rows.filter(pool_.rowFilter);
    if (pool_.kind === 'contact') {
      const sole = rows.filter((r) => r.id.endsWith(':sole'));
      const optionRows = rows.filter((r) => !r.id.endsWith(':sole'));

      // The stance happened; its effects are the world's to give.
      for (const r of sole) {
        const outcome = r.outcomes?.success ?? {};
        pool_.apply(day, outcome, r);
        applyConditionDeltas(projected, outcome.effects);
        if ((outcome.effects || []).length) pool_.encounter.interaction.given = true;
        // traveller_stance is what the traveller did — the applied
        // outcome's prose, stamped post-resolution (its single home is
        // the interaction row, not the situation descriptor).
        const dc = pool_.encounter?.interaction?.dialogue_content;
        if (dc && outcome.text?.en) dc.traveller_stance = outcome.text.en;
        events.push(outcomeEvent(day, pool_, r, 'success', outcome, projected));
      }

      // The shared part of an options situation (sit-level commands
      // replicated into every option) is the unconditional gift — it
      // lands whether or not the fork is offered.
      const shared = sharedEffects(optionRows);
      if (shared.length) {
        pool_.apply(day, { effects: shared }, optionRows[0]);
        applyConditionDeltas(projected, shared);
        pool_.encounter.interaction.given = true;
      }

      // The options themselves only contest at the shelter window —
      // every authored contact fork is an evening offer.
      if (!pool_.offerWindow || optionRows.length <= 1) continue;
      rows = optionRows;
      // Fall through to feasibility + choose below.
    }

    // Feasibility is checked NOW — earlier picks may have spent the coins
    // or dropped the energy this option would have needed.
    const feasible = pool_.feasible
      ? pool_.feasible(rows, ctx)
      : rows.filter((r) => isFeasible(r, ctx));
    if (!feasible.length) {
      // An offer the traveller cannot take is not a fork — the episode
      // never sees it.
      continue;
    }

    // Preference (Mind). A single-option pool is inevitable — no call.
    // Without a mind the land draws at random (its old way); forks that
    // belong to a being fall back to the first feasible.
    let interaction = pool_.fallbackRng
      ? feasible[Math.floor(rng() * feasible.length)]
      : feasible[0];
    if (characterId && feasible.length > 1) {
      await flush();
      try {
        const res = await mindChoose(characterId, {
          choices: [{
            situation_id: pool_.situation_id,
            subject: pool_.subject,
            options: feasible.map((r) => ({
              interaction_id: r.id,
              act: r.act,
              need_tags: r.need_tags,
              p_success: successProbability(r, ctx),
            })),
          }],
        });
        const pickId = res?.choices?.[0]?.interaction_id;
        interaction = feasible.find((r) => r.id === pickId) ?? feasible[0];
      } catch (err) {
        // The mind never blocks the game: fall back to the first feasible.
        console.warn('[mind] choose failed (non-fatal):', err.message);
      }
    }

    // Roll + apply (host) — before resolveDayState, before the episode.
    let outcomeKey = 'success';
    let check = null;
    if (interaction.skill?.difficulty != null) {
      check = rollSkillCheck({
        skill: ctx.skills[`skill_${interaction.skill.name}`] ?? 0,
        difficulty: interaction.skill.difficulty,
        skillName: interaction.skill.name,
        energy: ctx.energy,
        shadow: ctx.shadow,
        rng,
      });
      outcomeKey = check.success && interaction.outcomes?.success
        ? 'success'
        : (interaction.outcomes?.failure ? 'failure' : 'success');
    }

    const outcome = interaction.outcomes?.[outcomeKey] ?? {};
    pool_.apply(day, outcome, interaction);

    // The pick rides to the episode for the narrator.
    if (pool_.encounter) {
      pool_.encounter.interaction.resolved_choice = {
        interaction_id: interaction.id, act: interaction.act,
        text: outcome.text?.en ?? null,
        // A 'walked on' pick changes nothing — 'changed' marks only a
        // choice the body actually felt (the old option.commands rule).
        changed: (outcome.effects || []).length > 0,
      };
      const dc = pool_.encounter.interaction.dialogue_content;
      if (dc && outcome.text?.en) dc.traveller_stance = outcome.text.en;
    }

    applied.push({
      situation_id: pool_.situation_id,
      subject: pool_.subject,
      interaction_id: interaction.id,
      act: interaction.act,
      outcome: outcomeKey,
      check,
      text: outcome.text?.en ?? null,
    });

    // The day felt what happened: project the Condition forward, report
    // the outcome event so the NEXT pool is scored by the evolved Mind.
    // Ambient voices already reach the episode as 'moment' events —
    // minting a second, id-less event here would sediment them twice.
    applyConditionDeltas(projected, outcome?.effects);
    if (pool_.kind !== 'ambient') {
      events.push(outcomeEvent(day, pool_, interaction, outcomeKey, outcome, projected));
    }
    await flush();
  }

  await flush();
  day.interaction_choices = applied;
  day.interaction_events = events.map(({ _felt, ...e }) => e);
  return applied;
}
