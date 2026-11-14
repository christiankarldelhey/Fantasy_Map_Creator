import { test } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../../../db.js';
import {
  regionStay,
  stayTags,
  dayWideTags,
  resolveAmbientVoice,
} from '../world/ambientVoice.js';

// ---------------------------------------------------------------------------
// Stay arithmetic
// ---------------------------------------------------------------------------

const R = 46;

test('first visit: stayDays 1, entryCount 1, no gap', () => {
  const stay = regionStay([], (d) => d.includes(R));
  assert.deepEqual(stay, { stayDays: 1, entryCount: 1, gapDays: 0 });
});

test('third consecutive day inside: stayDays 3, still first stay', () => {
  const stay = regionStay([[R], [R]], (d) => d.includes(R));
  assert.deepEqual(stay, { stayDays: 3, entryCount: 1, gapDays: 0 });
});

test('re-entry after a gap: stayDays 1, entryCount 2, gap measured', () => {
  // 2 days in, 20 days out, today back in.
  const history = [[R], [R], ...Array(20).fill([99])];
  const stay = regionStay(history, (d) => d.includes(R));
  assert.deepEqual(stay, { stayDays: 1, entryCount: 2, gapDays: 20 });
});

test('second stay, second day inside: stayDays 2, gap frozen', () => {
  const history = [[R], ...Array(20).fill([99]), [R]];
  const stay = regionStay(history, (d) => d.includes(R));
  assert.deepEqual(stay, { stayDays: 2, entryCount: 2, gapDays: 20 });
});

// ---------------------------------------------------------------------------
// Tag emission
// ---------------------------------------------------------------------------

test('stayTags: cumulative region_day, entry:first only on first stay', () => {
  const first = stayTags({ stayDays: 3, entryCount: 1, gapDays: 0 });
  assert.ok(first.includes('region_day:1') && first.includes('region_day:3'));
  assert.ok(first.includes('entry:first'));

  const reentry = stayTags({ stayDays: 1, entryCount: 2, gapDays: 20 });
  assert.ok(!reentry.includes('entry:first'));
  assert.ok(reentry.includes('entry_count:2'));
  assert.ok(reentry.includes('days_since_exit:15')); // 15 ≤ 20
});

test('dayWideTags: season, weather, ground, mind', () => {
  const tags = dayWideTags({
    dateISO: '3018-03-10',
    variantOrder: ['rain', 'base'],
    crossedTypes: ['forest', 'marsh'],
    startState: { energy: 20, days_without_food: 1, days_without_water: 0, shadow: 60 },
  });
  assert.ok(tags.has('season:spring'));
  assert.ok(tags.has('weather:rain'));
  assert.ok(tags.has('ground:soft'));
  assert.ok(!tags.has('ground:hard'));
  assert.ok(tags.has('mind:fatigue'));
  assert.ok(tags.has('mind:hunger'));
  assert.ok(tags.has('mind:melancholy')); // shadow 60 → shadowed
  assert.ok(!tags.has('mind:thirst'));
});

test('dayWideTags: no startState emits no mind tags', () => {
  const tags = dayWideTags({ dateISO: '3018-01-05', variantOrder: ['snow', 'winter', 'base'], crossedTypes: ['mountain'] });
  assert.ok(tags.has('season:winter'));
  assert.ok(tags.has('weather:snow'));
  assert.ok(tags.has('ground:hard'));
  assert.ok(!tags.has('mind:fatigue'));
});

// ---------------------------------------------------------------------------
// resolveAmbientVoice (mocked pool)
// ---------------------------------------------------------------------------

const originalQuery = pool.query.bind(pool);

const records = [
  {
    id: 'AM-A1', name: { en: 'The wind' }, region_ids: [46], priority: 0,
    interactive: [
      { id: 's1', tags: ['region_day:1'], options: [{ id: 'o1', outcomes: { success: { text: { en: 'day one wind' } } } }] },
      { id: 's2', tags: ['region_day:2'], options: [{ id: 'o2', outcomes: { success: { text: { en: 'day two wind' }, effects: { shadow_effect: 1 } } } }] },
      { id: 's3', tags: ['region_day:3'], options: [{ id: 'o3', outcomes: { success: { text: { en: 'day three wind' } } } }] },
    ],
  },
  {
    id: 'F-00', name: { en: 'Coming in' }, region_ids: [46], priority: 5,
    interactive: [
      { id: 'arr1', tags: ['region_day:1', 'entry:first'], options: [{ id: 'o', outcomes: { success: { text: { en: 'first arrival' } } } }] },
      { id: 're', tags: ['entry_count:2'], options: [{ id: 'o', outcomes: { success: { text: { en: 're-entry' } } } }] },
    ],
  },
  {
    id: 'ovn:9', name: { en: 'Night' }, region_ids: [46], priority: 0,
    interactive: [
      { id: 'night', tags: ['context:overnight'], options: [{ id: 'rest', outcomes: { success: { text: { en: 'the night' } } } }] },
    ],
  },
  {
    id: 'G-00', name: { en: 'Elsewhere' }, region_ids: [70], priority: 0,
    interactive: [
      { id: 'g1', tags: ['region_day:1'], options: [{ id: 'o', outcomes: { success: { text: { en: 'other region' } } } }] },
    ],
  },
];

function installMock({ history = [], regionIds = [46] } = {}) {
  pool.query = async (text, params) => {
    if (text.includes('FROM trip_days')) {
      return { rows: history.map((regions) => ({ regions })) };
    }
    if (text.includes('FROM places_narration')) {
      const wanted = params[0] || [];
      return {
        rows: records.filter((r) => (r.region_ids || []).some((id) => wanted.includes(id))),
      };
    }
    return { rows: [] };
  };
}

const DAY = {
  tripId: 'trip-1',
  todayRegions: [{ id: 46, name: 'Angmar' }],
  dateISO: '3018-03-10',
  variantOrder: ['base'],
  crossedTypes: ['mountain'],
  startState: { energy: 80, shadow: 10 },
  rng: () => 0,
};

test('day 1 in region fires the day-1 situation, not the others', async () => {
  installMock({ history: [] });
  try {
    const events = await resolveAmbientVoice({ ...DAY, dayNumber: 1 });
    const ids = events.map((e) => e.situation_id);
    assert.deepEqual(ids, ['arr1', 's1']);
    assert.equal(events.find((e) => e.record_id === 'AM-A1').text.en, 'day one wind');
  } finally {
    pool.query = originalQuery;
  }
});

test('day 3 fires the most specific eligible beat (cumulative tags)', async () => {
  installMock({ history: [[{ id: 46 }], [{ id: 46 }]] });
  try {
    const events = await resolveAmbientVoice({ ...DAY, dayNumber: 3 });
    const wind = events.find((e) => e.record_id === 'AM-A1');
    assert.equal(wind.situation_id, 's3');
  } finally {
    pool.query = originalQuery;
  }
});

test('overnight situations never fire on the walking day', async () => {
  installMock({ history: [] });
  try {
    const events = await resolveAmbientVoice({ ...DAY, dayNumber: 1 });
    assert.ok(!events.some((e) => e.record_id === 'ovn:9'));
  } finally {
    pool.query = originalQuery;
  }
});

test('records scoped to other regions are excluded', async () => {
  installMock({ history: [] });
  try {
    const events = await resolveAmbientVoice({ ...DAY, dayNumber: 1 });
    assert.ok(!events.some((e) => e.record_id === 'G-00'));
  } finally {
    pool.query = originalQuery;
  }
});

test('re-entry fires the entry_count situation, not the first-arrival one', async () => {
  const history = [[{ id: 46 }], [{ id: 46 }], ...Array(20).fill([{ id: 99 }])];
  installMock({ history });
  try {
    const events = await resolveAmbientVoice({ ...DAY, dayNumber: 24 });
    const coming = events.find((e) => e.record_id === 'F-00');
    assert.equal(coming.situation_id, 're');
  } finally {
    pool.query = originalQuery;
  }
});
