import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  typeClasses,
  typeMatches,
  resolveScoped,
  pickVariant,
  pickRotation,
  scopeOf,
} from '../world/resolveNarrative.js';

// ---------------------------------------------------------------------------
// Type vocabulary
// ---------------------------------------------------------------------------

test('typeClasses maps fine types to their classes', () => {
  assert.deepEqual(typeClasses('village').sort(), ['settlement'].sort());
  assert.deepEqual(typeClasses('fortified_town').sort(), ['fortification', 'settlement'].sort());
  assert.deepEqual(typeClasses('stream'), ['water']);
  assert.deepEqual(typeClasses('ruins'), ['ruin']);
  assert.deepEqual(typeClasses('nonexistent'), []);
});

test('typeMatches: exact match', () => {
  assert.ok(typeMatches('village', 'village'));
  assert.ok(!typeMatches('village', 'town'));
});

test('typeMatches: record class matches fine query, not the reverse', () => {
  assert.ok(typeMatches('settlement', 'village'));
  assert.ok(typeMatches('fortification', 'fortified_town'));
  assert.ok(!typeMatches('village', 'settlement'));
});

// ---------------------------------------------------------------------------
// Scope ladder
// ---------------------------------------------------------------------------

const records = [
  { id: 'loc', location_id: 457, type: null, region_id: null, cultural_family: null, priority: 100 },
  { id: 'tr', location_id: null, type: 'village', region_id: 62, cultural_family: null, priority: 80 },
  { id: 'tf', location_id: null, type: 'village', region_id: null, cultural_family: 'northman', priority: 60 },
  { id: 'reg', location_id: null, type: null, region_id: 62, cultural_family: null, priority: 40 },
  { id: 'fam', location_id: null, type: null, region_id: null, cultural_family: 'northman', priority: 20 },
  { id: 'typ', location_id: null, type: 'village', region_id: null, cultural_family: null, priority: 10 },
  { id: 'cls', location_id: null, type: 'settlement', region_id: null, cultural_family: null, priority: 5 },
];

const ctx = { locationId: null, type: 'village', regionId: 62, culturalFamily: 'northman' };

test('highest priority wins among all eligible scope candidates', () => {
  const { record } = resolveScoped(records, ctx);
  assert.equal(record.id, 'tr');
});

test('location-bound record only resolves for its own location', () => {
  const { record } = resolveScoped(records, { ...ctx, locationId: 457 });
  assert.equal(record.id, 'loc');
  const { record: other } = resolveScoped(records, { ...ctx, locationId: 999 });
  assert.notEqual(other.id, 'loc');
});

test('class-scoped record is eligible for a fine type query', () => {
  const only = [records.find((r) => r.id === 'cls')];
  const { record } = resolveScoped(only, { ...ctx, regionId: 1, culturalFamily: 'x' });
  assert.equal(record.id, 'cls');
});

test('record carrying a non-matching dimension is excluded', () => {
  const { record } = resolveScoped(records, { ...ctx, regionId: 8 });
  assert.equal(record.id, 'tf'); // region-scoped 'tr' and 'reg' drop out
});

test('typeBound=true excludes region/family-only records (overnight IN_LOCATION)', () => {
  const { record } = resolveScoped(records, ctx, { typeBound: true });
  assert.equal(record.id, 'tr');
  const eligible = resolveScoped(
    records.filter((r) => ['reg', 'fam'].includes(r.id)),
    ctx,
    { typeBound: true },
  );
  assert.equal(eligible.record, null);
});

test('typeBound=false excludes typed and location-bound records (overnight IN_WILD)', () => {
  const { record } = resolveScoped(records, ctx, { typeBound: false });
  assert.equal(record.id, 'reg');
});

test('priority tie breaks toward the more specific record', () => {
  const tied = [
    { id: 'generic', location_id: null, type: 'village', region_id: null, cultural_family: null, priority: 50 },
    { id: 'specific', location_id: null, type: 'village', region_id: 62, cultural_family: null, priority: 50 },
  ];
  const { record } = resolveScoped(tied, ctx);
  assert.equal(record.id, 'specific');
});

test('scope-less records are never eligible; empty ladder returns scope none', () => {
  const nos = [{ id: 'none', location_id: null, type: null, region_id: null, cultural_family: null, priority: 99 }];
  const { record, scope } = resolveScoped(nos, ctx);
  assert.equal(record, null);
  assert.equal(scope, 'none');
});

test('scopeOf reports the carried dimensions', () => {
  assert.deepEqual(scopeOf(records.find((r) => r.id === 'tr')), ['type', 'region_id']);
  assert.deepEqual(scopeOf(records.find((r) => r.id === 'loc')), ['location_id']);
});

// ---------------------------------------------------------------------------
// Variants + rotation
// ---------------------------------------------------------------------------

test('pickVariant honors key order on map-shaped variants', () => {
  const rec = { payload: { variants: { winter: ['w1'], snow: ['s1'], base: ['b1'] } } };
  const { key } = pickVariant(rec, ['snow', 'winter', 'base']);
  assert.equal(key, 'snow');
});

test('pickVariant falls through missing keys; empty map returns null', () => {
  const rec = { payload: { variants: { winter: ['w1'] } } };
  const { key } = pickVariant(rec, ['snow', 'winter']);
  assert.equal(key, 'winter');
  assert.equal(pickVariant(rec, ['snow']), null);
  assert.equal(pickVariant({ payload: {} }, ['snow']), null);
});

test('pickVariant matches array-shaped variants by key or id', () => {
  const rec = { payload: { variants: [{ id: 'spring_grass', text: { en: 'x' } }] } };
  assert.equal(pickVariant(rec, ['spring_grass']).id, 'spring_grass');
  assert.equal(pickVariant(rec, ['nope']), null);
});

test('pickRotation skips used indices and honors explicit idx', () => {
  const rot = [{ idx: 1, en: 'a' }, { idx: 2, en: 'b' }, { idx: 3, en: 'c' }];
  assert.equal(pickRotation(rot, [1]).index, 2);
  assert.equal(pickRotation(rot, [1, 2, 3]), null);
  const plain = ['a', 'b'];
  assert.equal(pickRotation(plain, [0]).index, 1);
});
