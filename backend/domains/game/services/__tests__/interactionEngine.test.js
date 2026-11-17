import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isFeasible,
  successProbability,
  effectsToShelter,
  effectsToCommands,
  applyOvernightOutcome,
} from '../world/interactionEngine.js';

// ---------------------------------------------------------------------------
// Feasibility — the host's gate (ADR-0019): skill floors and what can be paid
// ---------------------------------------------------------------------------

test('isFeasible: skill.min gates on the character skill column', () => {
  const i = { skill: { name: 'persuasion', min: 4 }, outcomes: { success: { effects: [] } } };
  assert.equal(isFeasible(i, { skills: { skill_persuasion: 5 }, coins: 0 }), true);
  assert.equal(isFeasible(i, { skills: { skill_persuasion: 3 }, coins: 0 }), false);
  assert.equal(isFeasible(i, { skills: {}, coins: 0 }), false);
});

test('isFeasible: coin cost on success must be payable', () => {
  const i = {
    outcomes: { success: { effects: [{ type: 'coins', amount: -3 }] } },
  };
  assert.equal(isFeasible(i, { skills: {}, coins: 5 }), true);
  assert.equal(isFeasible(i, { skills: {}, coins: 3 }), true);
  assert.equal(isFeasible(i, { skills: {}, coins: 2 }), false);
});

test('isFeasible: gifts and free options are always feasible', () => {
  const gift = { outcomes: { success: { effects: [{ type: 'coins', amount: 2 }] } } };
  assert.equal(isFeasible(gift, { skills: {}, coins: 0 }), true);
  assert.equal(isFeasible({ outcomes: { success: { effects: [] } } }, { skills: {}, coins: 0 }), true);
});

// ---------------------------------------------------------------------------
// p_success — the honest read the Mind weighs
// ---------------------------------------------------------------------------

test('successProbability: no difficulty authored → 1', () => {
  assert.equal(successProbability({ skill: { name: 'x' } }, {}), 1.0);
  assert.equal(successProbability({}, {}), 1.0);
});

test('successProbability: rises with skill, clamps to [0.05, 1]', () => {
  const at0 = successProbability({ skill: { name: 's', difficulty: 5 } }, { skills: { skill_s: 0 } });
  const at8 = successProbability({ skill: { name: 's', difficulty: 5 } }, { skills: { skill_s: 8 } });
  assert.ok(at8 > at0);
  assert.equal(at8, 1);
  assert.ok(at0 >= 0.05);
});

// ---------------------------------------------------------------------------
// Typed effects → the day's rails
// ---------------------------------------------------------------------------

test('effectsToShelter: decomposed overnight_shelter atoms', () => {
  const shelter = effectsToShelter([
    { type: 'lodging', name: 'The Prancing Pony', indoor: true },
    { type: 'rest', quality: 1.4 },
    { type: 'shadow', amount: -0.05 },
    { type: 'coins', amount: -3 },
    { type: 'meal', slug: 'stew', food: 30 },
    { type: 'water', refill: true },
  ]);
  assert.equal(shelter.name, 'The Prancing Pony');
  assert.equal(shelter.indoor, true);
  assert.equal(shelter.rest_quality, 1.4);
  assert.equal(shelter.shadow_effect, -0.05);
  assert.equal(shelter.lodging_cost, 3);
  assert.equal(shelter.meal, true);
  assert.equal(shelter.meal_slug, 'stew');
  assert.equal(shelter.water, true);
});

test('effectsToCommands: outside a shelter every atom becomes a command', () => {
  const cmds = effectsToCommands([
    { type: 'meal', slug: 'bread', food: 20 },
    { type: 'water', refill: true },
    { type: 'coins', amount: 4 },
    { type: 'item', slug: 'torch', qty: 1 },
    { type: 'heal' },
  ]);
  assert.deepEqual(cmds.map((c) => c.type),
    ['meal', 'water_refill', 'coins', 'item', 'heal']);
});

test('effectsToCommands: in shelter, meal/water ride the shelter not commands', () => {
  const cmds = effectsToCommands([
    { type: 'meal', slug: 'stew' },
    { type: 'water', refill: true },
    { type: 'coins', amount: 4 },
  ], { inShelter: true });
  assert.deepEqual(cmds, [{ type: 'coins', amount: 4 }]);
});

test('effectsToCommands: coin cost is a shelter concern, never a command', () => {
  const cmds = effectsToCommands([{ type: 'coins', amount: -3 }]);
  assert.deepEqual(cmds, []);
});

// ---------------------------------------------------------------------------
// applyOvernightOutcome — the night's own Situation
// ---------------------------------------------------------------------------

test('applyOvernightOutcome: rewrites the night fields in place', () => {
  const day = {
    overnight_location: { name: 'Old Bridge', type: 'landmark', indoor: false },
    overnight_interaction: { id: 'ovn:x', rest_quality: 0.8, shadow_effect: 0 },
    commands: [],
  };
  applyOvernightOutcome(day, {
    effects: [
      { type: 'lodging', name: 'The Prancing Pony', indoor: true },
      { type: 'rest', quality: 1.4 },
      { type: 'shadow', amount: -0.05 },
      { type: 'coins', amount: -3 },
      { type: 'meal', slug: 'stew' },
    ],
    text: { en: 'A warm bed upstairs.' },
  });
  assert.equal(day.overnight_location.name, 'The Prancing Pony');
  assert.equal(day.overnight_location.indoor, true);
  assert.equal(day.overnight_interaction.rest_quality, 1.4);
  assert.equal(day.overnight_interaction.shadow_effect, -0.05);
  // The night IS the place: the narration record id survives the rewrite.
  assert.equal(day.overnight_interaction.id, 'ovn:x');
  // Cost + meal ride shelter_choice so resolveDayState's lodging path pays.
  assert.equal(day.shelter_choice.lodging_cost, 3);
  assert.equal(day.shelter_choice.meal, true);
});

test('applyOvernightOutcome: a night with no lodging keeps the spot', () => {
  const day = {
    overnight_location: { name: 'Wildwood verge', indoor: false },
    overnight_interaction: { id: 'ovn:y', rest_quality: 0.8, shadow_effect: 0.1 },
  };
  applyOvernightOutcome(day, { effects: [{ type: 'rest', quality: 1.0 }] });
  assert.equal(day.overnight_location.name, 'Wildwood verge');
  assert.equal(day.overnight_interaction.rest_quality, 1.0);
  assert.equal(day.overnight_interaction.shadow_effect, 0.1);
});
