// C31 verification: aid_or_trade offers become decisions at dusk.
// Daylight encounters keep the honest pass-by stance; before_sleep
// encounters on optioned rows emit a decision whose stay option carries
// an overnight_shelter the host can apply.
import pool from '../db.js';
import { resolveEncounter } from '../domains/game/services/world/interactionResolver.js';
import { applyShelterChoice } from '../domains/game/services/world/tripDay.js';
import { resolveDayState } from '../domains/game/services/character/dayState.js';

const { rows: ents } = await pool.query(
  `SELECT * FROM entities WHERE type IN ('humans','elves','dwarves','maiar','hobbits') ORDER BY name`
);
const char = { slug: 'aranath' };

const decisionRows = new Set();
let daylight = 0, dusk = 0;
for (const e of ents) {
  for (let i = 0; i < 30 && !decisionRows.has(e.id); i++) {
    const r = await resolveEncounter(e, char, [], Math.random, [], {
      shadowBand: 'clear', characterSlug: char.slug, nightTiming: 'before_sleep',
    });
    const dc = r.dialogue_content;
    if (!dc || dc.interaction_form !== 'aid_or_trade') continue;
    if (r.decision) {
      dusk++;
      decisionRows.add(e.id);
      const stay = r.decision.options.find((o) => (o.commands || []).length);
      const shelter = stay?.commands?.find((c) => c.type === 'overnight_shelter');
      console.log(
        `DECISION ${e.name.padEnd(28)} stay=${(stay?.label || '-').slice(0, 45).padEnd(46)}`,
        shelter ? `shelter=${shelter.name} rest=${shelter.rest_quality} shadow=${shelter.shadow_effect} cost=${shelter.lodging_cost} meal=${shelter.meal}` : 'NO SHELTER',
      );
      // Apply the stay choice and check the day resolves the shelter.
      if (shelter) {
        const day = { day_number: 1, encounters: [], regions: [], climate: [], biomes: [], commands: [], overnight_interaction: {} };
        applyShelterChoice(day, shelter);
        const res = resolveDayState({
          day,
          startState: { energy: 50, shadow: 10, coins: 8, days_without_food: 2, days_without_water: 0, fatigue: 0 },
          effects: { rations: 1, waterHeld: 1, waterCapacity: 3, coldShift: 0, restBonus: 0 },
          inventoryRows: [],
        });
        console.log(`   → paid=${res.lodging.paid} sheltered=${res.lodging.sheltered} meals=${res.meals.map((m) => m.provided ? 'GIFT' : m.food).join('|')}`);
      }
      break;
    }
  }
  for (let i = 0; i < 30; i++) {
    const r = await resolveEncounter(e, char, [], Math.random, [], {
      shadowBand: 'clear', characterSlug: char.slug, nightTiming: null,
    });
    if (r.dialogue_content?.interaction_form === 'aid_or_trade') {
      daylight++;
      if (r.decision) console.log(`  BUG: decision fired outside before_sleep for ${e.name}`);
      break;
    }
  }
}
console.log(`\nentities that produced a dusk aid_or_trade decision: ${dusk}`);
console.log(`entities sampled at daylight (no decision expected): ${daylight}`);
await pool.end();
