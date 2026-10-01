// C25 live dry-run — exercises the real dusk-shelter pipeline without
// waiting on encounter RNG:
//   resolveEncounter (real, DB) → toOpenPayload/toEvents (real wire)
//   → POST /episodes (real mind) → decision_point + recommended
//   → POST /decide (autopick recommended, as trips.js does)
//   → applyShelterChoice + resolveShelterLodging (real mechanics)
//   → close episode so nothing stays open.
//
// Run from backend/: node scripts/c25_dryrun.mjs

import pool from '../db.js';
import { resolveEncounter } from '../domains/game/services/world/interactionResolver.js';
import { toOpenPayload } from '../domains/story/services/mind/toOpenPayload.js';
import { openEpisode, decideEpisode, closeEpisode } from '../domains/story/services/mind/mindClient.js';
import { applyShelterChoice } from '../domains/game/services/world/tripDay.js';
import { resolveShelterLodging } from '../domains/game/services/character/inventory.js';

const CHARACTER_ID = 147;

// 1. Real Celebrian state (dead from the test trip — starving, exhausted)
const { rows: [character] } = await pool.query(
  `SELECT * FROM character_state WHERE id = $1`, [CHARACTER_ID]
);
console.log(`character: ${character.name} E${character.energy} S${character.shadow} daysWithoutFood=${character.days_without_food} coins=${character.coins}`);

// 2. Real resolveEncounter against a sites entity until the authored
//    harvest_shelter row (with options) resolves — real DB, real weighted pick.
const { rows: sites } = await pool.query(
  `SELECT * FROM entities WHERE type IN ('sites','resources') ORDER BY name`
);
let resolved = null;
let entity = null;
for (let attempt = 0; attempt < 200 && !resolved?.decision; attempt++) {
  entity = sites[attempt % sites.length];
  const r = await resolveEncounter(entity, character, [], Math.random, [], {
    shadowBand: 'clear',
    characterSlug: character.slug,
    nightTiming: 'before_sleep',
  });
  if (r?.decision?.options?.length) resolved = r;
}
if (!resolved?.decision) {
  console.log('No decision resolved after 200 attempts — check options rows.');
  process.exit(1);
}
console.log(`\nencounter resolved: ${entity.name}/${entity.type} form=${resolved.form}`);
console.log(`decision: ${resolved.decision.id} — "${resolved.decision.prompt}"`);
resolved.decision.options.forEach(o =>
  console.log(`  - ${o.id}: "${o.label}" tags=${JSON.stringify(o.tags)} cmds=${(o.commands || []).length}`));

// 3. Fabricated day — real toEvents wire. The shelter offer lands at 20:30;
//    baseline overnight is open sky (the default the decision can rewrite).
const day = {
  day_number: 900,
  date: '1950-06-21',
  distance_km: 24,
  walking_hours: 7.5,
  regions: [{ name: 'Test Marches', cultural_family: null }],
  terrain_phrases: {},
  biomes: [],
  locations: [],
  water_crossings: [],
  climate: [],
  meals: [],
  encounters: [{
    hour: '20:30',
    hour_float: 20.5,
    phase: 'night',
    region: 'Test Marches',
    night_timing: 'before_sleep',
    entity: {
      id: entity.id, name: entity.name, type: entity.type,
      slug: entity.name, danger: entity.danger, active: entity.active,
    },
    interaction: resolved,
  }],
  overnight_location: { name: 'open moor', type: 'wild', indoor: false },
  overnight_interaction: {
    title: 'open moor', description: 'cold ground under open sky',
    rest_quality: 0, shadow_effect: 2, scope: 'hardcoded_fallback',
  },
};
const trip = { id: '00000000-0000-0000-0000-00000000c25d', name: 'C25 dry-run' };

const openBody = toOpenPayload({
  gameId: 'middle_earth',
  day,
  trip,
  character,
  characterState: { energy: character.energy, shadow: character.shadow },
  stateContext: {
    startState: { energy: character.energy, shadow: character.shadow, wounded: character.wounded, days_without_food: character.days_without_food, days_without_water: character.days_without_water },
    endState: { energy: character.energy, shadow: character.shadow, wounded: character.wounded, days_without_food: character.days_without_food, days_without_water: character.days_without_water },
  },
});
const decEvent = openBody.events.find(e => e.data?.decision);
console.log(`\nwire: ${openBody.events.length} events, decision on encounter event: ${decEvent ? 'YES' : 'NO'}`);

// 4. Real open → decision_point + recommended
const { response: opened } = await openEpisode(openBody);
const point = opened.psyche_packet?.decision_point;
console.log(`\nepisode ${opened.episode_id} opened`);
console.log(`decision_point: ${point ? point.decision_id : 'NONE'} recommended=${point?.recommended ?? 'none'}`);
console.log(`needs_active: ${JSON.stringify((opened.psyche_packet?.needs_active || []).map(n => n.key || n))}`);
console.log(`mood: ${JSON.stringify(opened.psyche_packet?.mood)}`);

// 5. Autopick like trips.js does
if (point) {
  const res = await decideEpisode(opened.episode_id, {
    optionId: point.recommended ?? point.options?.[0]?.id,
    decisionId: point.decision_id,
  });
  console.log(`\ndecide → proposed_commands: ${JSON.stringify(res?.proposed_commands)}`);

  // The patched memory: stance + rest should now tell the chosen night
  const enc = res?.perceived_day?.find(p => p.data?.substance?.stance);
  const rest = res?.perceived_day?.find(p => p.type === 'rest');
  console.log(`patched stance: "${enc?.data?.substance?.stance ?? enc?.reading ?? '-'}"`);
  console.log(`patched rest: place=${rest?.data?.place ?? '-'} quality=${rest?.data?.rest_quality ?? '-'}`);

  // 6. Real mechanics — what the host would apply
  for (const cmd of res?.proposed_commands || []) {
    if (cmd?.type === 'overnight_shelter') {
      applyShelterChoice(day, cmd);
      const lodg = resolveShelterLodging({ shelter: cmd, coins: character.coins, currentEnergy: character.energy });
      console.log(`\napplied: overnight → ${day.overnight_location.name} (indoor=${day.overnight_location.indoor}) rest=${day.overnight_interaction.rest_quality} shadow_eff=${day.overnight_interaction.shadow_effect}`);
      console.log(`lodging: paid=${lodg.paid} cost=${lodg.cost} coinsAfter=${lodg.coinsAfter} recoveryOverride=${lodg.recoveryOverride} restQuality=${lodg.restQuality}`);
    }
  }

  // 7. Close so no orphan episode
  try {
    const { response: closed } = await closeEpisode(opened.episode_id, {
      end_cause: 'dry_run',
      decisions: [{ decision_id: point.decision_id, option_id: point.recommended }],
    });
    console.log(`\nclosed: ${JSON.stringify(closed).slice(0, 300)}`);
  } catch (e) {
    console.log(`\nclose failed (non-fatal): ${e.message}`);
  }
}

await pool.end();
