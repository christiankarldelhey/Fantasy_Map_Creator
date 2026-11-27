// ============================================================================
// Verify the ADR-0022 wolf pilot: a real wolves attack, resolved for real
// ----------------------------------------------------------------------------
// Loads the Wolves entity, rolls resolveEncounter until the 'attacks' form
// lands (the pilot contact row should be picked by the ladder), then runs
// the encounter through resolveDayChoices at a ROAD hour — not the shelter
// window — against a demo Celebrian mind. Prints the whole resolution:
// which option the mind drew, the skill roll, the outcome text and effects.
//
//   node scripts/verify_wolf_pilot.js [characterId] [--narrate] [--en]
//
// --narrate opens a real episode on the demo mind and narrates it with the
// LLM (costs one real narration). Default language is Spanish.
// ============================================================================
import pool from '../db.js';
import { resolveEncounter } from '../domains/game/services/world/interactionResolver.js';
import { resolveDayChoices } from '../domains/game/services/world/interactionEngine.js';
import { openEpisode, narrateEpisode } from '../domains/story/services/mind/mindClient.js';
import { toOpenPayload } from '../domains/story/services/mind/toOpenPayload.js';

const characterId = process.argv.find((a) => a.startsWith('--mind='))?.slice(7) ?? 'demo-celebrian-cdc527';
const entityName = process.argv.find((a) => a.startsWith('--entity='))?.slice(9) ?? 'Wolves';
const PILOT = process.argv.find((a) => a.startsWith('--cnt='))?.slice(6) ?? 'cnt:fb19da18-c124-4dba-9763-c885ac9e7749';

const { rows: [wolves] } = await pool.query(
  'SELECT id, slug, name, type, danger FROM entities WHERE name = $1', [entityName]);

// Celebrian's real spread: strong legs, weak arms.
const startState = {
  energy: 80, shadow: 5, coins: 10,
  skills: { skill_endurance: 9, skill_stealth: 9, skill_melee: 2, skill_intimidation: 2 },
};

let attacked = null;
for (let tries = 0; tries < 60 && !attacked; tries++) {
  const interaction = await resolveEncounter(wolves, { race: 'elf' }, [], Math.random, []);
  if (interaction.form === 'attacks' && interaction.dialogue_content?.id === PILOT) {
    attacked = interaction;
  }
}
if (!attacked) {
  console.log('FAIL: 60 rolls of resolveEncounter never produced the pilot attacks contact');
  await pool.end();
  process.exit(1);
}
console.log(`encounter resolved: form=attacks contact=${attacked.dialogue_content.id}`);
console.log(`situation: ${attacked.dialogue_content.situation_id}`);
console.log(`tension: ${attacked.dialogue_content.tension}\n`);

const day = {
  day_number: 900 + Math.floor(Math.random() * 90),
  date: '1950-11-27',
  regions: [{ name: 'Eriador' }],
  encounters: [{
    entity: wolves,
    form: 'attacks',
    hour_float: 15,             // mid-afternoon — NOT the shelter window
    phase: 'afternoon',
    location: { name: 'open country' },
    interaction: attacked,
  }],
  ambient_situations: [],
  overnight_interaction: { id: 'ovn:1' },
  overnight_location: { name: 'a cold camp', indoor: false },
  ambient: [],
  commands: [],
};

await resolveDayChoices(day, { characterId, startState });

const enc = day.encounters[0];
console.log('=== resolved_choice ===');
console.log(JSON.stringify(enc.interaction.resolved_choice, null, 1));
console.log('=== traveller_stance ===');
console.log(enc.interaction.dialogue_content?.traveller_stance);
console.log('=== interaction.outcome (wound channel) ===');
console.log(enc.interaction.outcome ?? '(none)');
console.log('=== interaction events ===');
for (const e of day.interaction_events ?? []) {
  console.log(JSON.stringify(e).slice(0, 400));
}

if (process.argv.includes('--narrate')) {
  const body = toOpenPayload({
    gameId: 'middle_earth',
    day,
    trip: { id: 'verify-wolf-pilot-' + Date.now(), name: 'verify wolf pilot' },
    character: { id: characterId, name: 'Celebrian', preset: 'celebrian', slug: 'celebrian' },
    characterState: { energy: 80, shadow: 5 },
  });
  body.character = { ...body.character, id: characterId };
  const opened = await openEpisode(body);
  const episodeId = opened?.response?.episode_id;
  console.log('\n=== episode opened:', episodeId, '===');
  const lang = process.argv.includes('--en') ? 'en' : 'es';
  const narration = await narrateEpisode(episodeId, lang);
  console.log('\n=== NARRATION ===');
  console.log('response keys:', Object.keys(narration ?? {}));
  const gen = narration?.generation ?? narration?.narrative ?? narration;
  console.log(typeof gen === 'string' ? gen : JSON.stringify(gen, null, 1).slice(0, 6000));
}
await pool.end();
