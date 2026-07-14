import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../db.js';
import {
  resolveOvernight,
  resolveRegionAtPoint,
  clearPlacesInteractionsCache,
} from '../placesInteractions.js';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const regions = [
  { id: 62, name: 'Rohan', cultural_family: 'northman' },
  { id: 8, name: 'Dagorlad', cultural_family: 'enemy' },
  { id: 99, name: 'Nowhere', cultural_family: 'unique_fangorn' },
];

const interactions = [
  // L1 named jewel
  {
    id: 1,
    interaction_type: 'overnight',
    location_id: 457,
    location_type: null,
    region_id: null,
    cultural_family: null,
    title: 'The Prancing Pony',
    description: 'Hot ale and a warm bed at Bree.',
    rest_quality: 3,
    shadow_effect: -1,
    priority: 100,
  },
  // L2 type + region (Rohan village)
  {
    id: 2,
    interaction_type: 'overnight',
    location_id: null,
    location_type: 'village',
    region_id: 62,
    cultural_family: null,
    title: null,
    description: 'A Rohirrim village of the plains.',
    rest_quality: 3,
    shadow_effect: 0,
    priority: 80,
  },
  // L3 type + family (Northman village)
  {
    id: 3,
    interaction_type: 'overnight',
    location_id: null,
    location_type: 'village',
    region_id: null,
    cultural_family: 'northman',
    title: null,
    description: 'A Northman village of the grass.',
    rest_quality: 2,
    shadow_effect: 0,
    priority: 60,
  },
  // L0 generic type
  {
    id: 4,
    interaction_type: 'overnight',
    location_id: null,
    location_type: 'village',
    region_id: null,
    cultural_family: null,
    title: null,
    description: 'A village family gives shelter.',
    rest_quality: 2,
    shadow_effect: 0,
    priority: 10,
  },
  // L4 wild unique region (Rohan)
  {
    id: 5,
    interaction_type: 'overnight',
    location_id: null,
    location_type: null,
    region_id: 62,
    cultural_family: null,
    title: null,
    description: 'A night on the Rohan grass.',
    rest_quality: 2,
    shadow_effect: 0,
    priority: 40,
  },
  // L5 wild family (Northman)
  {
    id: 6,
    interaction_type: 'overnight',
    location_id: null,
    location_type: null,
    region_id: null,
    cultural_family: 'northman',
    title: null,
    description: 'A night on the open grass and river-land.',
    rest_quality: 2,
    shadow_effect: 0,
    priority: 20,
  },
  // Wild family generic
  {
    id: 7,
    interaction_type: 'overnight',
    location_id: null,
    location_type: null,
    region_id: null,
    cultural_family: 'wild',
    title: null,
    description: 'A night in wild, unpeopled country.',
    rest_quality: 1,
    shadow_effect: 0,
    priority: 20,
  },
];

const originalQuery = pool.query.bind(pool);

beforeEach(() => {
  clearPlacesInteractionsCache();
});

function installMock() {
  pool.query = async (text, params) => {
    if (text.includes('FROM regions WHERE id = $1')) {
      const region = regions.find((r) => r.id === params[0]);
      return { rows: region ? [region] : [] };
    }
    if (text.includes('FROM places_interactions')) {
      return { rows: interactions.filter((r) => r.interaction_type === params[0]) };
    }
    if (text.includes('FROM regions WHERE ST_Contains')) {
      // resolveRegionAtPoint not heavily tested here; return null.
      return { rows: [] };
    }
    return { rows: [] };
  };
}

function restoreMock() {
  pool.query = originalQuery;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('Rohan village in location context picks L2 type+region row', async () => {
  installMock();
  try {
    const result = await resolveOvernight({
      context: 'IN_LOCATION',
      locationId: null,
      locationType: 'village',
      regionId: 62,
    });
    assert.equal(result.description, 'A Rohirrim village of the plains.');
    assert.equal(result.rest_quality, 3);
    assert.equal(result.scope, 'type_region');
  } finally {
    restoreMock();
  }
});

test('Rohan wild context picks L4 region-specific row', async () => {
  installMock();
  try {
    const result = await resolveOvernight({
      context: 'IN_WILD',
      locationId: null,
      locationType: null,
      regionId: 62,
    });
    assert.equal(result.description, 'A night on the Rohan grass.');
    assert.equal(result.scope, 'region');
  } finally {
    restoreMock();
  }
});

test('Named location (L1) beats family and region matches', async () => {
  installMock();
  try {
    const result = await resolveOvernight({
      context: 'IN_LOCATION',
      locationId: 457,
      locationType: 'inn',
      regionId: 62,
    });
    assert.equal(result.title, 'The Prancing Pony');
    assert.equal(result.scope, 'location');
  } finally {
    restoreMock();
  }
});

test('Wild context excludes location-bound rows', async () => {
  installMock();
  try {
    const result = await resolveOvernight({
      context: 'IN_WILD',
      locationId: null,
      locationType: null,
      regionId: 8,
    });
    // Dagorlad has no unique wild row in the mock, so it should fall back to the
    // generic 'wild' family row.
    assert.equal(result.description, 'A night in wild, unpeopled country.');
    assert.equal(result.scope, 'family_wild');
  } finally {
    restoreMock();
  }
});

test('Region with no unique wild row falls back to generic wild family row', async () => {
  installMock();
  try {
    const result = await resolveOvernight({
      context: 'IN_WILD',
      locationId: null,
      locationType: null,
      regionId: 99,
    });
    // unique_fangorn has no specific wild row, so the resolver falls back to
    // the generic 'wild' family record as required by the spec.
    assert.equal(result.description, 'A night in wild, unpeopled country.');
    assert.equal(result.scope, 'family_wild');
    assert.equal(result.rest_quality, 1);
    assert.equal(result.shadow_effect, 0);
  } finally {
    restoreMock();
  }
});

test('Missing region_id returns fallback and warns', async () => {
  installMock();
  try {
    const result = await resolveOvernight({
      context: 'IN_WILD',
      locationId: null,
      locationType: null,
      regionId: null,
    });
    assert.equal(result.scope, 'hardcoded_fallback');
  } finally {
    restoreMock();
  }
});
