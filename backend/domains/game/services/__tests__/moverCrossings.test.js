import { test } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Mover crossings — the living-map rail.
// detectMoverCrossings and presencePoolEntries are pure: legs come in as
// rows, the day's walked path as {lng, lat, hour_float, phase} points.
// ---------------------------------------------------------------------------

import {
  detectMoverCrossings,
  presencePoolEntries,
} from '../world/moverCrossings.js';
import { resolveMoverContact } from '../world/interactionResolver.js';
import { encountersBeforeSettlement } from '../world/tripDay.js';

const marchLeg = (over = {}) => ({
  leg_id: 'leg-1',
  entity_id: 'ent-gandalf',
  leg_kind: 'march',
  leg_index: 1,
  entity_slug: 'gandalf',
  entity_name: 'Gandalf',
  entity_type: 'maiar',
  danger: 0,
  shadow_weight: -2,
  notice_radius_km: 5,
  contact_radius_km: 1,
  visibility: 'visible',
  greeting: false,
  active_phases: ['morning', 'afternoon'],
  hostile: false,
  ...over,
});

const residentLeg = (over = {}) => ({
  leg_id: 'leg-2',
  entity_id: 'ent-barliman',
  leg_kind: 'resident',
  leg_index: 1,
  entity_slug: 'barliman',
  entity_name: 'Barliman Butterbur',
  entity_type: 'humans',
  danger: 0,
  shadow_weight: 0,
  location_id: 'loc-prancing-pony',
  location_type: 'inn',
  loc_lng: 10,
  loc_lat: 20,
  notice_radius_km: 5,
  contact_radius_km: 1,
  visibility: 'hidden',
  greeting: false,
  active_phases: ['morning', 'afternoon', 'night'],
  hostile: false,
  ...over,
});

// 0.01 deg lat ≈ 1.11 km
const path = [
  { lng: 10.00, lat: 20.00, hour_float: 8, phase: 'morning', region: 'Bree-land', region_id: 7 },
  { lng: 10.05, lat: 20.00, hour_float: 12, phase: 'morning', region: 'Bree-land', region_id: 7 },
  { lng: 10.10, lat: 20.00, hour_float: 16, phase: 'afternoon', region: 'Bree-land', region_id: 7 },
];

// ---------------------------------------------------------------------------
// march legs
// ---------------------------------------------------------------------------

test('march: inside contact radius → crossing at the closest hour', () => {
  const trails = new Map([['leg-1', [10.05, 20.00]]]); // on the noon point
  const { crossings, traces } = detectMoverCrossings({
    legs: [marchLeg()], trailsByLeg: trails, dayPath: path,
    overnightLocation: null, arrivalHourFloat: 19,
  });
  assert.equal(crossings.length, 1);
  assert.equal(traces.length, 0);
  assert.equal(crossings[0].hour_float, 12);
  assert.equal(crossings[0].phase, 'morning');
});

test('march: inside notice but outside contact → trace', () => {
  // ~3.3 km east of the noon point: beyond 1 km contact, inside 5 km notice
  const trails = new Map([['leg-1', [10.08, 20.00]]]);
  const { crossings, traces } = detectMoverCrossings({
    legs: [marchLeg()], trailsByLeg: trails, dayPath: path,
    overnightLocation: null, arrivalHourFloat: 19,
  });
  assert.equal(crossings.length, 0);
  assert.equal(traces.length, 1);
  assert.equal(traces[0].hour_float, 16); // closest path point (10.10)
});

test('march: visibility signs caps contact at trace', () => {
  const trails = new Map([['leg-1', [10.05, 20.00]]]);
  const { crossings, traces } = detectMoverCrossings({
    legs: [marchLeg({ visibility: 'signs' })], trailsByLeg: trails, dayPath: path,
    overnightLocation: null, arrivalHourFloat: 19,
  });
  assert.equal(crossings.length, 0);
  assert.equal(traces.length, 1);
});

test('march: hidden visibility silences the leg', () => {
  const trails = new Map([['leg-1', [10.05, 20.00]]]);
  const { crossings, traces } = detectMoverCrossings({
    legs: [marchLeg({ visibility: 'hidden' })], trailsByLeg: trails, dayPath: path,
    overnightLocation: null, arrivalHourFloat: 19,
  });
  assert.equal(crossings.length + traces.length, 0);
});

test('march: beyond notice radius → nothing', () => {
  const trails = new Map([['leg-1', [10.50, 20.00]]]); // ~40+ km away
  const { crossings, traces } = detectMoverCrossings({
    legs: [marchLeg()], trailsByLeg: trails, dayPath: path,
    overnightLocation: null, arrivalHourFloat: 19,
  });
  assert.equal(crossings.length + traces.length, 0);
});

test('march: active_phases filters the approached hours', () => {
  // Mover sits on the afternoon point but only walks mornings — the path
  // point that touches it is out of phase, and no morning point is near.
  const trails = new Map([['leg-1', [10.10, 20.00]]]);
  const { crossings, traces } = detectMoverCrossings({
    legs: [marchLeg({ active_phases: ['morning'], notice_radius_km: 2, contact_radius_km: 1 })],
    trailsByLeg: trails, dayPath: path,
    overnightLocation: null, arrivalHourFloat: 19,
  });
  assert.equal(crossings.length + traces.length, 0);
});

test('march: no trail point today → nothing', () => {
  const { crossings, traces } = detectMoverCrossings({
    legs: [marchLeg()], trailsByLeg: new Map(), dayPath: path,
    overnightLocation: null, arrivalHourFloat: 19,
  });
  assert.equal(crossings.length + traces.length, 0);
});

// ---------------------------------------------------------------------------
// resident legs
// ---------------------------------------------------------------------------

test('resident: sleeping at the anchored place → crossing before sleep', () => {
  const overnight = { id: 'loc-prancing-pony', type: 'inn', region: 'Bree-land', region_id: 7 };
  const { crossings } = detectMoverCrossings({
    legs: [residentLeg()], trailsByLeg: new Map(), dayPath: path,
    overnightLocation: overnight, arrivalHourFloat: 19,
  });
  assert.equal(crossings.length, 1);
  assert.equal(crossings[0].phase, 'before_sleep');
  assert.equal(crossings[0].hour_float, 19);
});

test('resident: location_type matches when no specific anchor', () => {
  const leg = residentLeg({ location_id: null, location_type: 'inn' });
  const overnight = { id: 'loc-elsewhere', type: 'inn' };
  const { crossings } = detectMoverCrossings({
    legs: [leg], trailsByLeg: new Map(), dayPath: path,
    overnightLocation: overnight, arrivalHourFloat: 19,
  });
  assert.equal(crossings.length, 1);
});

test('resident: hidden residents are still met at their place', () => {
  // visibility 'hidden' on a resident means "no trace on the road" —
  // the meeting still happens when the traveller stops there.
  const overnight = { id: 'loc-prancing-pony', type: 'inn' };
  const { crossings } = detectMoverCrossings({
    legs: [residentLeg({ visibility: 'hidden' })], trailsByLeg: new Map(), dayPath: path,
    overnightLocation: overnight, arrivalHourFloat: 19,
  });
  assert.equal(crossings.length, 1);
});

test('resident: greeting fires on a pass-through near the place', () => {
  const leg = residentLeg({ greeting: true });
  const overnight = { id: 'loc-other', type: 'inn' }; // sleeps elsewhere
  const { crossings } = detectMoverCrossings({
    legs: [leg], trailsByLeg: new Map(), dayPath: path,
    overnightLocation: overnight, arrivalHourFloat: 19,
  });
  assert.equal(crossings.length, 1); // path starts at the place itself
  assert.equal(crossings[0].hour_float, 8);
});

test('resident: far away, wrong stop → nothing', () => {
  const leg = residentLeg({ loc_lng: 11.5, loc_lat: 20.0 });
  const overnight = { id: 'loc-other', type: 'inn' };
  const { crossings } = detectMoverCrossings({
    legs: [leg], trailsByLeg: new Map(), dayPath: path,
    overnightLocation: overnight, arrivalHourFloat: 19,
  });
  assert.equal(crossings.length, 0);
});

// ---------------------------------------------------------------------------
// presence legs — pool injection
// ---------------------------------------------------------------------------

const presenceLeg = (over = {}) => ({
  leg_id: 'leg-3',
  entity_id: 'ent-nazgul',
  leg_kind: 'presence',
  entity_slug: 'nazgul',
  entity_name: 'The Nine',
  entity_type: 'undead',
  danger: 5,
  shadow_weight: 5,
  active: 'all-day',
  family: null,
  region_id: 7,
  level: 4,
  road_bias: { road_major: 2, off_road: -2 },
  active_phases: ['morning', 'afternoon'],
  ...over,
});

test('presence: matching region+phase yields a pool entity at leg level', () => {
  const out = presencePoolEntries([presenceLeg()], {
    regionName: 'Bree-land', regionId: 7, road_type: 'road_major', phase: 'morning',
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'ent-nazgul');
  assert.equal(out[0].probability_by_region[0].probability, 6); // 4 + road_major 2
  assert.equal(out[0]._moverLeg.leg_id, 'leg-3');
});

test('presence: out-of-phase legs do not join the pool', () => {
  const out = presencePoolEntries([presenceLeg({ active_phases: ['night'] })], {
    regionName: 'Bree-land', regionId: 7, road_type: 'road', phase: 'morning',
  });
  assert.equal(out.length, 0);
});

test('presence: other regions do not see the mover', () => {
  const out = presencePoolEntries([presenceLeg()], {
    regionName: 'The Shire', regionId: 99, road_type: 'road', phase: 'morning',
  });
  assert.equal(out.length, 0);
});

// ---------------------------------------------------------------------------
// resolveMoverContact — the authored voice for a scheduled meeting
// ---------------------------------------------------------------------------

const legContact = {
  contact_id: 'cnt:gandalf:leg:1',
  aspect: { en: 'Grey robes and a long stride, far off on the ridge.' },
  variants: [
    { weight: 1, text: { en: 'He stops you at the ford and asks your name.' } },
  ],
  disposition: { en: 'guarded' },
  facts: { topic: 'news_and_rumor' },
  situations: [],
  contact_tags: [],
};

test('resolveMoverContact: trace → sign_only with the aspect as content', () => {
  const i = resolveMoverContact(marchLeg(), legContact, 'trace', 'aranath', () => 0);
  assert.equal(i.form, 'sign_only');
  assert.equal(i.dialogue_content.concrete_content, legContact.aspect.en);
  assert.equal(i.prose_hint, legContact.aspect.en);
});

test('resolveMoverContact: crossing → confronts with a picked variant', () => {
  const i = resolveMoverContact(marchLeg(), legContact, 'crossing', 'aranath', () => 0);
  assert.equal(i.form, 'confronts');
  assert.equal(i.dialogue_content.concrete_content, legContact.variants[0].text.en);
  assert.equal(i.dialogue_content.topic, 'news_and_rumor');
});

test('resolveMoverContact: hostile legs carry high intensity', () => {
  const i = resolveMoverContact(marchLeg({ hostile: true }), legContact, 'crossing', 'aranath', () => 0);
  assert.equal(i.intensity, 3);
});

test('resolveMoverContact: race-gated contact returns null', () => {
  const gated = { ...legContact, contact_tags: ['race:elf'] };
  const i = resolveMoverContact(marchLeg(), gated, 'crossing', 'aranath', () => 0); // dunedain
  assert.equal(i, null);
});

// ---------------------------------------------------------------------------
// encountersBeforeSettlement — mover exemption
// ---------------------------------------------------------------------------

test('settlement walls do not cancel an authored resident meeting', () => {
  const encs = [
    { hour_float: 19, phase: 'before_sleep', _mover: { kind: 'crossing' } },
    { hour_float: 19, phase: 'afternoon' }, // spawn at arrival — cancelled
  ];
  const out = encountersBeforeSettlement(encs, 19, true);
  assert.equal(out.length, 1);
  assert.ok(out[0]._mover);
});
