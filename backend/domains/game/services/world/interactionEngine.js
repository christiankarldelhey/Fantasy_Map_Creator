// ============================================================================
// Interaction engine (ADR-0019, Wave B)
// ----------------------------------------------------------------------------
// One choosing for every resolved Situation: the host says what is
// *feasible*, asks the Mind which it prefers (`POST /mind/minds/:id/choose`),
// rolls the skill, and applies the outcome — all BEFORE the day resolves and
// the episode opens. No re-resolution, no in-episode /decide for these.
//
// Wave B pilot scope: the night's own Situation (the place's overnight
// record) plus before_sleep shelter offers on encounters. Everything else —
// contact substance, ambient situations — still rides the legacy path until
// Wave C.
// ============================================================================

import pool from '../../../../db.js';
import {
  choose as mindChoose,
  perceive as mindPerceive,
} from '../../../story/services/mind/mindClient.js';
import { rollSkillCheck } from '../character/skillCheck.js';
import { applyShelterChoice } from './tripDay.js';

// ---------------------------------------------------------------------------
// Fetch + feasibility (host-owned per ADR-0019)
// ---------------------------------------------------------------------------

async function fetchInteractions({ placesNarrationId = null, entitiesNarrationId = null }) {
  const col = placesNarrationId ? 'places_narration_id' : 'entities_narration_id';
  const id = placesNarrationId ?? entitiesNarrationId;
  const { rows } = await pool.query(
    `SELECT id, act, label, need_tags, skill, outcomes, payload FROM interactions WHERE ${col} = $1`,
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

const slugify = (s) => (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// The night's own Situation — what the place itself offers at sleep.
function overnightPool(day) {
  const id = day.overnight_interaction?.id;
  if (!id) return null;
  return {
    kind: 'overnight',
    situation_id: id,
    subject: `tag:place:${slugify(day.overnight_location?.name ?? id)}`,
    parent: { placesNarrationId: id },
    hour: 24, // the night always resolves last in narrative order
    phase: 'night',
    placeSlug: slugify(day.overnight_location?.name),
    apply: (day_, outcome) => applyOvernightOutcome(day_, outcome),
  };
}

// A dusk shelter offer on an encounter — `interaction.decision` was built
// by resolveEncounter from the contact's authored options; the same options
// live as interactions keyed `<record>:<sit>:<option>`.
function shelterOfferPools(day) {
  return (day.encounters || [])
    .filter((e) => e.interaction?.decision && e.interaction?.dialogue_content?.id)
    .map((e) => ({
      kind: 'shelter_offer',
      situation_id: e.interaction.decision.id,
      // Relation subjects are full tags ('tag:npc:hal'), per relations.py.
      subject: e.entity?.slug ? `tag:npc:${e.entity.slug}` : null,
      parent: { entitiesNarrationId: e.interaction.dialogue_content.id },
      optionIds: new Set((e.interaction.decision.options || []).map((o) => o.id)),
      encounter: e,
      hour: e.hour_float ?? 20.5,
      phase: e.phase ?? 'night',
      placeSlug: slugify(day.overnight_location?.name),
      apply: (day_, outcome) => applyShelterOutcome(day_, outcome),
    }));
}

// An encounter's chosen situation with no fork on the table — the picked
// `sit` is known by its preserved id; its sole Interaction carries the
// gifts the stance declares (a shared meal, a refilled skin). The host
// applies, the mind digests — nothing to choose.
function contactPools(day) {
  return (day.encounters || [])
    .filter((e) =>
      !e.interaction?.decision
      && e.interaction?.dialogue_content?.id
      && e.interaction?.dialogue_content?.situation_id)
    .map((e) => ({
      kind: 'contact',
      situation_id: e.interaction.dialogue_content.situation_id,
      subject: e.entity?.slug ? `tag:npc:${e.entity.slug}` : null,
      parent: { entitiesNarrationId: e.interaction.dialogue_content.id },
      // Only this situation's rows: the record's other situations are
      // not what the traveller lived.
      rowFilter: (r) => r.payload?.situation === e.interaction.dialogue_content.situation_id,
      encounter: e,
      hour: e.hour_float ?? 12,
      phase: e.phase ?? 'afternoon',
      placeSlug: slugify(e.location?.name ?? e.location),
      apply: null, // command rail — applied per effect below
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
export function outcomeEvent(day, pool_, interaction, outcomeKey, outcome) {
  const data = {
    act: interaction.act,
    situation_id: pool_.situation_id,
    interaction_id: interaction.id,
    outcome: outcomeKey,
    description: outcome?.text?.en ?? null,
    tags: [interaction.act, ...(interaction.need_tags || [])],
  };
  const shadowFx = (outcome?.effects || [])
    .filter((e) => e.type === 'shadow' && Number.isFinite(e.amount))
    .reduce((s, e) => s + e.amount, 0);
  if (shadowFx) data.shadow_effect = shadowFx;
  const npc = pool_.subject?.startsWith('tag:npc:') ? pool_.subject.slice(8) : null;
  if (npc) {
    data.npc = npc;
    data.npc_name = pool_.encounter?.entity?.name ?? npc;
    if (Number.isFinite(pool_.encounter?.entity?.danger)) {
      data.danger = pool_.encounter.entity.danger;
    }
  }
  return {
    id: `d${day.day_number}:sit:${pool_.situation_id}:${interaction.id.split(':').pop()}`,
    type: 'interaction',
    when: { hour: pool_.hour ?? null, phase: pool_.phase ?? null },
    where: {
      region: day.regions?.[0]?.name ?? null,
      place: pool_.placeSlug || null,
    },
    data,
  };
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
  // Narrative order: contacts by their hour, the night itself last.
  const pools = [...contactPools(day), ...shelterOfferPools(day), overnightPool(day)]
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
    // Shelter offers: only the authored option ids are on the table (the
    // record's other derived sole interactions are not this choice).
    if (pool_.optionIds) {
      rows = rows.filter((r) => pool_.optionIds.has(r.id.split(':').pop()));
    }

    if (pool_.kind === 'contact') {
      // Inevitable: the stance's own effects + the shared gift. Feasible
      // by construction — the stance happened; the gift is the world's.
      const sole = rows.filter((r) => r.id.endsWith(':sole'));
      const optionRows = rows.filter((r) => !r.id.endsWith(':sole'));
      const gifts = [...effectsToCommands(sharedEffects(optionRows), { inShelter: false })]
        .map((c) => ({ ...c, hour_float: pool_.hour }));
      if (gifts.length) {
        day.commands = [...(day.commands || []), ...gifts];
        applyConditionDeltas(projected, sharedEffects(optionRows));
      }
      for (const r of sole) {
        const outcome = r.outcomes?.success ?? {};
        const cmds = effectsToCommands(outcome.effects, { inShelter: false })
          .map((c) => ({ ...c, hour_float: pool_.hour }));
        day.commands = [...(day.commands || []), ...cmds];
        applyConditionDeltas(projected, outcome.effects);
        events.push(outcomeEvent(day, pool_, r, 'success', outcome));
      }
      continue;
    }

    // Feasibility is checked NOW — earlier picks may have spent the coins
    // or dropped the energy this option would have needed.
    const feasible = rows.filter((r) => isFeasible(r, ctx));
    if (!feasible.length) continue;

    // Preference (Mind). A single-option pool is inevitable — no call.
    let interaction = feasible[0];
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
    pool_.apply(day, outcome);

    // The choice is consumed: B5's in-episode /decide must not see it again.
    if (pool_.encounter) {
      pool_.encounter.interaction.decision = null;
      pool_.encounter.interaction.resolved_choice = {
        interaction_id: interaction.id, act: interaction.act,
        text: outcome.text?.en ?? null,
      };
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
    events.push(outcomeEvent(day, pool_, interaction, outcomeKey, outcome));
    applyConditionDeltas(projected, outcome?.effects);
    await flush();
  }

  await flush();
  day.interaction_choices = applied;
  day.interaction_events = events.map(({ _felt, ...e }) => e);
  return applied;
}
