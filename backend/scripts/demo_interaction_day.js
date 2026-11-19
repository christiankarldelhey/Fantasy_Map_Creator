// ============================================================================
// Demo: run a synthetic day through the interaction engine for real
// ----------------------------------------------------------------------------
// Builds a minimal `day` (a shelter-offer contact, one ambient voice, the
// Prancing Pony overnight cell) and calls resolveDayChoices against the
// live DB + Mind — the same path trips.js runs, minus route generation.
// Prints what the day looks like afterwards: minted outcome events,
// resolved choices, and the wire events the episode would open with.
//
//   node scripts/demo_interaction_day.js [characterId]
//
// characterId defaults to 'demo-ix-001' — a throwaway mind so the demo
// never pollutes a real character's memory.
// ============================================================================
import pool from '../db.js';
import { resolveDayChoices } from '../domains/game/services/world/interactionEngine.js';
import { toEvents } from '../domains/story/services/mind/toEvents.js';
import { openEpisode } from '../domains/story/services/mind/mindClient.js';
import { toOpenPayload } from '../domains/story/services/mind/toOpenPayload.js';

const characterId = process.argv[2] ?? 'demo-ix-001';
const OPEN_EPISODE = process.argv.includes('--open');
const DAY = 99;

// --- a real shelter-offer contact (two authored options) -------------------
const CNT = 'cnt:0a1d0001-0000-4000-8000-0a1d00000001';
const { rows: [cnt] } = await pool.query(
  'SELECT id, entity_id, form, situations FROM entities_narration WHERE id = $1', [CNT]);
const sit = cnt.situations[0];
const { rows: [entity] } = await pool.query(
  'SELECT slug, name, danger FROM entities WHERE id = $1', [cnt.entity_id]);

// --- a real ambient situation that has interaction rows --------------------
const { rows: amb } = await pool.query(`
  SELECT pn.id AS record_id, pn.name, s AS sit
  FROM places_narration pn, jsonb_array_elements(pn.situations) s
  WHERE EXISTS (SELECT 1 FROM interactions i
                WHERE i.places_narration_id = pn.id
                  AND i.payload->>'situation' = s->>'id')
    AND pn.id NOT LIKE 'ovn:%'
  LIMIT 3`);
const ambient = amb[0];

const day = {
  day_number: DAY,
  regions: [{ name: 'Bree' }],
  encounters: [{
    entity, form: cnt.form ?? 'confronts',
    night_timing: 'before_sleep',   // the authored fork contests at dusk
    hour_float: 18, phase: 'evening',
    location: { name: 'a way-house' },
    interaction: {
      dialogue_content: {
        id: cnt.id,
        situation_id: sit.id,
        tension: sit.situation?.en ?? null,
        traveller_stance: null,
        narration: cnt,
      },
    },
  }],
  ambient_situations: ambient ? [{
    record_id: ambient.record_id,
    situation_id: ambient.sit.id,
    name: ambient.name,
    when: ambient.sit.when ?? null,
    phase: 'afternoon',
    tagSet: new Set(),
  }] : [],
  overnight_interaction: { id: 'ovn:1' },
  overnight_location: { name: 'The Prancing Pony', indoor: true },
  ambient: [],      // generateDay initializes this rail; the ambient apply pushes here
  commands: [],
};

console.log(`characterId=${characterId}  day=${DAY}\n`);
console.log(`contact: ${cnt.id} — situation '${sit.id}'`);
console.log(`ambient: ${ambient?.record_id} — '${ambient?.sit.id}'`);
console.log(`overnight: ovn:1 (The Prancing Pony)\n`);

await resolveDayChoices(day, {
  characterId,
  startState: { energy: 80, shadow: 5, coins: 10, skills: { skill_persuasion: 5 } },
});

console.log('=== minted interaction events ===');
for (const e of day.interaction_events ?? []) {
  console.log(JSON.stringify(e, null, 1));
  console.log('---');
}
console.log('=== resolved_choice on the encounter ===');
console.log(JSON.stringify(day.encounters[0].interaction.resolved_choice, null, 1));
console.log('=== traveller_stance (engine-stamped) ===');
console.log(day.encounters[0].interaction.dialogue_content.traveller_stance);
console.log('=== overnight_interaction after apply ===');
console.log(JSON.stringify(day.overnight_interaction, null, 1));
console.log('=== day.commands ===');
console.log(JSON.stringify(day.commands, null, 1));

console.log('\n=== toEvents wire (the events[] the episode opens with) ===');
const wire = toEvents({ day, trip: { id: 'demo', name: 'demo' }, character: {}, previousDay: null });
for (const e of wire) console.log(` ${e.type.padEnd(12)} ${e.id ?? ''} ${JSON.stringify(e.data).slice(0, 110)}`);

if (OPEN_EPISODE) {
  const body = toOpenPayload({
    gameId: 'middle_earth',
    day,
    trip: { id: 'demo-interaction-day', name: 'demo' },
    character: { id: characterId, name: 'Demo', preset: 'aranath', slug: 'demo' },
    characterState: { energy: 80, shadow: 5 },
  });
  // The real wire carries the character_id as part of the mind path —
  // open uses the character block; keep the demo id everywhere.
  body.character = { ...body.character, id: characterId };
  const opened = await openEpisode(body);
  console.log('\n=== opened episode ===');
  console.log(JSON.stringify(opened?.response ?? opened, null, 1).slice(0, 1500));
}

await pool.end();
