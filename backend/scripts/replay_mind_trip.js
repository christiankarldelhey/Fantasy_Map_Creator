// ============================================================================
// Replay persisted trip_days through the Mind Engine on a fresh brain
// ----------------------------------------------------------------------------
// Reads the stored world of finished trips (trip_days rows — climate,
// encounters, meals, overnight, energy/shadow columns), rebuilds each day,
// runs the CURRENT toEvents contract, and opens/closes episodes on a
// replay character id — a fresh brain living the same world, for
// before/after comparison with the character's real mind.
//
//   node scripts/replay_mind_trip.js aranath-c3 f00e6689 05303e37
//
// Fidelity notes: water_crossings/thoughts are not persisted, and the
// wounded condition per day isn't either — those fields simply stay null.
// Episode indexes are offset per trip so the mind sees one monotonic life.
// ============================================================================
import pool from '../db.js';
import { toEvents } from '../domains/story/services/mind/toEvents.js';
import { loadNarratorCharacter } from '../domains/story/services/narrator/narratorCharacter.js';
import { openEpisode, closeEpisode } from '../domains/story/services/mind/mindClient.js';

const [, , replayId, ...tripPrefixes] = process.argv;
if (!replayId || tripPrefixes.length === 0) {
  console.error('usage: node scripts/replay_mind_trip.js <replayCharId> <tripIdPrefix>...');
  process.exit(1);
}

const GAME_ID = process.env.GAME_ID || 'middle_earth';

function slimCharacter(c, id) {
  return {
    id,
    name: c.name ?? null,
    brain_profile: c.brain_profile || c.slug || null,
    skills: {
      tracking: c.skill_tracking ?? 0,
      persuasion: c.skill_persuasion ?? 0,
      ranged: c.skill_ranged ?? 0,
      melee: c.skill_melee ?? 0,
      lore: c.skill_lore ?? 0,
    },
    energy: c.energy ?? null,
    shadow: c.shadow ?? null,
    conditions: [c.wounded && c.wounded !== 'none' ? 'wounded' : null, c.sick ? 'sick' : null].filter(Boolean),
    wounded: c.wounded ?? null,
  };
}

async function overnightOf(row) {
  const interaction = {
    rest_quality: row.rest_quality ?? null,
    shadow_effect: row.shadow_effect ?? null,
  };
  if (row.places_interaction_id != null) {
    const { rows } = await pool.query(
      'SELECT title, description FROM places_interactions WHERE id = $1',
      [row.places_interaction_id]
    );
    if (rows[0]) {
      interaction.name = rows[0].title || null;
      interaction.description = rows[0].description || null;
    }
  }
  return interaction;
}

function anyMealEaten(meals) {
  return (meals || []).some(
    (m) => (m.food?.name || m.food) != null || m.itemId != null || m.slug === 'tavern_meal'
  );
}

async function replayTrip(tripPrefix, character, episodeOffset, hungerStreak) {
  const { rows: trips } = await pool.query(
    'SELECT id, name FROM trips WHERE id::text LIKE $1',
    [`${tripPrefix}%`]
  );
  const trip = trips[0];
  if (!trip) throw new Error(`no trip matches ${tripPrefix}`);

  const { rows: days } = await pool.query(
    `SELECT * FROM trip_days WHERE trip_id = $1 ORDER BY day_number`,
    [trip.id]
  );
  console.log(`\n=== ${trip.name} (${trip.id.toString().slice(0, 8)}) — ${days.length} days ===`);

  for (const row of days) {
    const meals = row.meals || [];
    hungerStreak = anyMealEaten(meals) ? 0 : hungerStreak + 1;

    const day = {
      day_number: row.day_number,
      date: row.date,
      distance_km: row.distance_km,
      walking_hours: row.walking_hours,
      regions: row.regions || [],
      terrain_phrases: row.terrain_phrases || null,
      biomes: row.biomes || [],
      locations: row.locations || [],
      climate: row.climate || [],
      encounters: row.encounters || [],
      meals,
      overnight_location: row.overnight_location || null,
      overnight_interaction: await overnightOf(row),
    };
    const stateContext = {
      startState: { energy: row.energy_start, shadow: row.shadow_start },
      endState: {
        energy: row.energy_end,
        shadow: row.shadow_end,
        days_without_food: hungerStreak,
      },
    };
    const events = toEvents({ day, trip, character, stateContext });
    // Monotonic episode index across trips — the mind reads when.episode.
    for (const e of events) e.when.episode = row.day_number + episodeOffset;

    const opened = await openEpisode({
      game_id: GAME_ID,
      character,
      episode_ref: `trip:${trip.id}:day:${row.day_number}:replay`,
      events,
      day: {},
    });
    const closed = await closeEpisode(opened.response.episode_id, {});

    const perceived = events.map((e) => e.type).join(',');
    console.log(
      `day ${row.day_number} (ep ${row.day_number + episodeOffset}) ` +
      `[${perceived}] -> encoded=${closed.response.encoded} ` +
      `patterns=${closed.response.patterns} faded=${closed.response.patterns_faded}`
    );
  }
  return { offset: episodeOffset + days.length, hungerStreak };
}

const sourceCharId = process.env.SOURCE_CHARACTER_ID || '142';
const source = await loadNarratorCharacter(Number(sourceCharId));
const character = slimCharacter(source, replayId);
console.log(`replaying as ${replayId} (mold hint: ${character.brain_profile})`);

let offset = 0;
let hungerStreak = 0;
for (const prefix of tripPrefixes) {
  ({ offset, hungerStreak } = await replayTrip(prefix, character, offset, hungerStreak));
}

console.log('\ndone — inspect the brain via GET /mind/brains?character_id=' + replayId);
await pool.end();
