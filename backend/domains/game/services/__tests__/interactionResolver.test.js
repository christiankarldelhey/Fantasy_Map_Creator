// ---------------------------------------------------------------------------
// interactionResolver — cultural scope never relaxes (#86)
// ---------------------------------------------------------------------------
// The Saralainn case: a Dunnish clan entity (family 'dunlendings') met in
// a dunadan_north region drew a 'glimpsed_far' contact row written for a
// Gondorian column — the generic fallback dropped the cultural_family
// filter, so another people's prose narrated the encounter. The fallback
// may relax the region; a row that declares a culture only ever speaks
// for its own people — better silence than a borrowed voice.
// ---------------------------------------------------------------------------
import { test } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../../../db.js';
import {
  resolveEncounter,
  clearAllEncounterCaches,
} from '../world/interactionResolver.js';

const originalQuery = pool.query.bind(pool);

const GLIMPSED_FAR_FORM = {
  form: 'glimpsed_far',
  intensity: 0,
  weight: 1,
  min_danger: 0,
  max_danger: 9,
  triggers_roll: false,
  prose_hint: 'Figures on a far road, about their own business.',
};

// The seed row that caused #86: a Gondorian military column, correctly
// scoped — 'cultural_family: gondorian' — but selectable for anyone.
const GONDORIAN_COLUMN = {
  id: 'cnt:gondor-column',
  kind: 'contact',
  entity_id: null,
  entity_ids: null,
  entity_type: 'humans',
  form: 'glimpsed_far',
  cultural_family: 'gondorian',
  region_id: null,
  tags: [],
  facts: { topic: 'news_and_rumor' },
  presence: { en: 'A Gondorian military column on this road.' },
};

// Simulate the DB honoring each query's filters: the gondorian row only
// comes back when the SQL does not constrain cultural_family.
function installMock({ contactRows = [GONDORIAN_COLUMN] } = {}) {
  const queries = [];
  pool.query = async (text, params) => {
    queries.push(text);
    if (text.includes("kind = 'form'")) return { rows: [GLIMPSED_FAR_FORM] };
    if (text.includes("kind = 'contact'")) {
      if (params[1] === 'topic') return { rows: [] };
      if (text.includes('n.entity_id = $1')) return { rows: [] };
      if (!text.includes('n.cultural_family')) return { rows: contactRows };
      return {
        rows: contactRows.filter(
          (r) =>
            r.cultural_family == null ||
            r.cultural_family === params[3]
        ),
      };
    }
    return { rows: [] };
  };
  return queries;
}

const SARALAINN = {
  id: 'c89386a2-b71f-4243-ab0d-e15d4094c152',
  name: 'Saralainn',
  type: 'humans',
  danger: 0,
};

const MINTYRNATH = { characterSlug: 'aranath', culturalFamily: 'dunadan_north', regionId: 60 };

test('a culturally-scoped row never speaks for another people', async () => {
  clearAllEncounterCaches();
  installMock();
  try {
    const out = await resolveEncounter(
      SARALAINN, { slug: 'aranath' }, [], () => 0, [], MINTYRNATH);
    assert.equal(out.form, 'glimpsed_far');
    assert.equal(out.dialogue_content, null);
  } finally {
    pool.query = originalQuery;
  }
});

test('the same row still serves its own culture', async () => {
  clearAllEncounterCaches();
  installMock();
  try {
    const out = await resolveEncounter(
      { ...SARALAINN, id: 'other-entity' },
      { slug: 'aranath' }, [], () => 0, [],
      { ...MINTYRNATH, culturalFamily: 'gondorian' });
    assert.equal(out.dialogue_content?.id, 'cnt:gondor-column');
  } finally {
    pool.query = originalQuery;
  }
});

test('unscoped rows still carry the generic fallback', async () => {
  clearAllEncounterCaches();
  const AGNOSTIC = { ...GONDORIAN_COLUMN, id: 'cnt:agnostic', cultural_family: null };
  installMock({ contactRows: [AGNOSTIC] });
  try {
    const out = await resolveEncounter(
      SARALAINN, { slug: 'aranath' }, [], () => 0, [], MINTYRNATH);
    assert.equal(out.dialogue_content?.id, 'cnt:agnostic');
  } finally {
    pool.query = originalQuery;
  }
});
