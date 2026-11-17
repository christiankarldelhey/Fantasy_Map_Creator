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
import { choose as mindChoose } from '../../../story/services/mind/mindClient.js';
import { rollSkillCheck } from '../character/skillCheck.js';
import { applyShelterChoice } from './tripDay.js';

// ---------------------------------------------------------------------------
// Fetch + feasibility (host-owned per ADR-0019)
// ---------------------------------------------------------------------------

async function fetchInteractions({ placesNarrationId = null, entitiesNarrationId = null }) {
  const col = placesNarrationId ? 'places_narration_id' : 'entities_narration_id';
  const id = placesNarrationId ?? entitiesNarrationId;
  const { rows } = await pool.query(
    `SELECT id, act, label, need_tags, skill, outcomes FROM interactions WHERE ${col} = $1`,
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

// The night's own Situation — what the place itself offers at sleep.
function overnightPool(day) {
  const id = day.overnight_interaction?.id;
  if (!id) return null;
  const slug = (day.overnight_location?.name ?? id).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    kind: 'overnight',
    situation_id: id,
    subject: `tag:place:${slug}`,
    parent: { placesNarrationId: id },
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
      subject: e.entity?.slug ? `npc:${e.entity.slug}` : null,
      parent: { entitiesNarrationId: e.interaction.dialogue_content.id },
      optionIds: new Set((e.interaction.decision.options || []).map((o) => o.id)),
      encounter: e,
      apply: (day_, outcome) => applyShelterOutcome(day_, outcome),
    }));
}

// ---------------------------------------------------------------------------
// resolveDayChoices — the one pre-resolution choosing
// ---------------------------------------------------------------------------

export async function resolveDayChoices(day, { characterId, startState = {}, rng = Math.random }) {
  const pools = [overnightPool(day), ...shelterOfferPools(day)].filter(Boolean);
  if (!pools.length) return [];

  const ctx = {
    skills: startState,
    coins: startState?.coins ?? 0,
    energy: startState?.energy ?? 100,
    shadow: startState?.shadow ?? 0,
  };

  // 1. Fetch + feasibility (host).
  for (const pool_ of pools) {
    let rows = await fetchInteractions(pool_.parent);
    // Shelter offers: only the authored option ids are on the table (the
    // record's other derived sole interactions are not this choice).
    if (pool_.optionIds) {
      rows = rows.filter((r) => pool_.optionIds.has(r.id.split(':').pop()));
    }
    pool_.feasible = rows.filter((r) => isFeasible(r, ctx));
  }

  const live = pools.filter((p) => p.feasible.length);
  if (!live.length) return [];

  // 2. Preference (Mind) — one call for every pool with a real choice.
  // Single-option pools are inevitable (destino manifiesto): no call needed.
  const chosen = new Map();
  const contested = live.filter((p) => p.feasible.length > 1);
  if (contested.length) {
    try {
      const res = await mindChoose(characterId, {
        choices: contested.map((p) => ({
          situation_id: p.situation_id,
          subject: p.subject,
          options: p.feasible.map((r) => ({
            interaction_id: r.id,
            act: r.act,
            need_tags: r.need_tags,
            p_success: successProbability(r, ctx),
          })),
        })),
      });
      for (const c of res?.choices ?? []) {
        if (c.interaction_id) chosen.set(c.situation_id, c.interaction_id);
      }
    } catch (err) {
      // The mind never blocks the game: fall back to the first feasible.
      console.warn('[mind] choose failed (non-fatal):', err.message);
    }
  }

  // 3. Roll + apply (host) — before resolveDayState, before the episode.
  const applied = [];
  for (const pool_ of live) {
    const pickId = chosen.get(pool_.situation_id) ?? pool_.feasible[0].id;
    const interaction = pool_.feasible.find((r) => r.id === pickId) ?? pool_.feasible[0];

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
    if (pool_.encounter) pool_.encounter.interaction.decision = null;

    applied.push({
      situation_id: pool_.situation_id,
      subject: pool_.subject,
      interaction_id: interaction.id,
      act: interaction.act,
      outcome: outcomeKey,
      check,
      text: outcome.text?.en ?? null,
    });
  }

  day.interaction_choices = applied;
  return applied;
}
