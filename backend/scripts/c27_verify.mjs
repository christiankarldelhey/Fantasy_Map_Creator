// C27 verification: encounter gifts flow row → commands → resolution.
import pool from '../db.js';
import { resolveEncounter } from '../domains/game/services/world/interactionResolver.js';
import { resolveDayState } from '../domains/game/services/character/dayState.js';

const { rows: ents } = await pool.query(
  `SELECT * FROM entities WHERE type IN ('humans','elves','hobbits','maiar') AND danger <= 1 LIMIT 12`
);
const char = { slug: 'celebrian-user-5' };
const found = [];

for (const e of ents) {
  for (let i = 0; i < 40 && found.length < 6; i++) {
    const r = await resolveEncounter(e, char, [], Math.random, [], {
      shadowBand: 'clear', characterSlug: char.slug, nightTiming: null,
    });
    const cmds = r.dialogue_content?.commands;
    if (Array.isArray(cmds) && cmds.length > 0) {
      found.push({ entity: e.name, form: r.form, stance: r.dialogue_content.traveller_stance, cmds });
      break;
    }
  }
}

for (const f of found) {
  console.log(`\n${f.entity} [${f.form}]`);
  console.log(`  stance: ${f.stance}`);
  console.log(`  commands: ${JSON.stringify(f.cmds)}`);

  const cmds = f.cmds.map((c) => ({ ...c, hour_float: 14 }));
  const r = resolveDayState({
    day: {
      day_number: 1, distance_km: 18, encounters: [],
      regions: [{ name: 'Testland' }], climate: [], biomes: [],
      commands: cmds,
      overnight_interaction: { rest_quality: 2, shadow_effect: 0 },
    },
    startState: { energy: 60, shadow: 10, coins: 4, days_without_food: 3, days_without_water: 1, fatigue: 0, wounded: 'wounded' },
    effects: { rations: 0, waterHeld: 0.5, waterCapacity: 3, coldShift: 0, restBonus: 0 },
    inventoryRows: [],
  });
  console.log(`  → meals: ${r.meals.map((m) => `${m.slot}:${m.provided ? 'GIFT' : m.food || 'none'}`).join(' | ')}`);
  console.log(`  → water refilled: ${r.water.refilled ?? false}, food streak: ${r.food.newDaysWithoutFood}, wounded: ${r.conditions.wounded}, grants: ${JSON.stringify(r.grants)}, coinsAfter: ${r.lodging.coinsAfter}`);
}
await pool.end();
