import { test } from 'node:test';
import assert from 'node:assert/strict';

import { rollSkillCheck, availableActions, ACTION_THRESHOLDS } from '../character/skillCheck.js';

// A fixed rng makes rolls deterministic: rng() * 10 + 1 == fixed die.
const dieRng = (die) => () => (die - 1) / 10;

// ---------------------------------------------------------------------------
// rollSkillCheck
// ---------------------------------------------------------------------------
test('rollSkillCheck: deterministic roll with rng, success/margin computed', () => {
  const { roll, total, success, margin } = rollSkillCheck({
    skill: 5,
    difficulty: 10,
    rng: dieRng(6),
  });
  assert.equal(roll, 6);
  assert.equal(total, 11); // 6 + 5 + 0 (fresh/clear = no modifiers)
  assert.equal(success, true);
  assert.equal(margin, 1);
});

test('rollSkillCheck: worn/spent energy penalises the roll', () => {
  const normal = rollSkillCheck({ skill: 5, difficulty: 10, energy: 60, rng: dieRng(5) });
  const worn = rollSkillCheck({ skill: 5, difficulty: 10, energy: 30, rng: dieRng(5) });
  const spent = rollSkillCheck({ skill: 5, difficulty: 10, energy: 5, rng: dieRng(5) });
  assert.equal(normal.total, 10);
  assert.equal(worn.total, 9);
  assert.equal(spent.total, 8);
});

test('rollSkillCheck: shadow only penalises mind-based skills (persuasion/lore)', () => {
  const melee = rollSkillCheck({ skill: 5, difficulty: 10, skillName: 'melee', shadow: 80, rng: dieRng(5) });
  const lore = rollSkillCheck({ skill: 5, difficulty: 10, skillName: 'lore', shadow: 80, rng: dieRng(5) });
  assert.equal(melee.total, 10); // no shadow penalty for melee
  assert.equal(lore.total, 8);   // burdened = -2
});

test('rollSkillCheck: energy and shadow penalties stack', () => {
  const { total } = rollSkillCheck({
    skill: 5,
    difficulty: 10,
    skillName: 'persuasion',
    energy: 10,   // spent = -2
    shadow: 50,   // shadowed = -1
    rng: dieRng(5),
  });
  assert.equal(total, 5 + 5 - 2 - 1);
});

test('rollSkillCheck: failure when total is below difficulty', () => {
  const { success, margin } = rollSkillCheck({ skill: 0, difficulty: 15, rng: dieRng(1) });
  assert.equal(success, false);
  assert.equal(margin, 1 - 15);
});

// ---------------------------------------------------------------------------
// availableActions
// ---------------------------------------------------------------------------
test('availableActions: track requires skill_tracking >= 3', () => {
  assert.equal(availableActions({ skills: { skill_tracking: 2 } }).track, false);
  assert.equal(availableActions({ skills: { skill_tracking: 3 } }).track, true);
});

test('availableActions: hunt is enabled by EITHER ranged>=2 OR tracking>=4', () => {
  assert.equal(availableActions({ skills: { skill_ranged: 1, skill_tracking: 1 } }).hunt, false);
  assert.equal(availableActions({ skills: { skill_ranged: 2, skill_tracking: 0 } }).hunt, true);
  assert.equal(availableActions({ skills: { skill_ranged: 0, skill_tracking: 4 } }).hunt, true);
});

test('availableActions: persuade and identify_lore thresholds', () => {
  const skills = { skill_persuasion: 2, skill_lore: 3 };
  const actions = availableActions({ skills });
  assert.equal(actions.persuade, true);
  assert.equal(actions.identify_lore, true);
});

test('availableActions: missing skills default to 0 and gate everything off', () => {
  const actions = availableActions({ skills: {} });
  for (const action of Object.keys(ACTION_THRESHOLDS)) {
    assert.equal(actions[action], false);
  }
});
