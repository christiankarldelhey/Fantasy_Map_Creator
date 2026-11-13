import { test } from 'node:test';
import assert from 'node:assert/strict';

import pool from '../../../../db.js';
import characterRouter from '../character.js';

// POST /api/trips takes the traveller from users.active_character_id, so
// switching character must persist it — for admins as well as normal users.

const sqlLog = [];
const mockQuery = async (text, params) => {
  sqlLog.push({ text: text.replace(/\s+/g, ' ').trim(), params });
  return { rows: [{ id: 2, name: 'Celebrian' }] };
};
const mockClient = { query: mockQuery, release() {} };

const originalQuery = pool.query;
const originalConnect = pool.connect;

function installMock() {
  sqlLog.length = 0;
  pool.query = mockQuery;
  pool.connect = async () => mockClient;
}
function restoreMock() {
  pool.query = originalQuery;
  pool.connect = originalConnect;
}

const route = characterRouter.stack.find(
  (layer) => layer.route && layer.route.path === '/:id/active' && layer.route.methods.put
);
assert.ok(route, 'PUT /:id/active should exist');
const handler = route.route.stack[route.route.stack.length - 1].handle;

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
  };
}

async function switchTo(characterId, { isAdmin }) {
  installMock();
  try {
    const res = mockRes();
    await handler({ params: { id: String(characterId) }, userId: 7, isAdmin }, res, (err) => { throw err; });
    return res;
  } finally {
    restoreMock();
  }
}

const userUpdates = () => sqlLog.filter((q) => /UPDATE users SET active_character_id/.test(q.text));

test('normal user switching character persists users.active_character_id', async () => {
  await switchTo(2, { isAdmin: false });
  assert.equal(userUpdates().length, 1);
  assert.deepEqual(userUpdates()[0].params, [String(2), 7]);
});

test('admin switching character persists users.active_character_id', async () => {
  await switchTo(2, { isAdmin: true });
  assert.equal(userUpdates().length, 1);
  assert.deepEqual(userUpdates()[0].params, [String(2), 7]);
});

// Cloning a template copies its live stats into a new character_state row.
// The INSERT's VALUES list must line up with its column list one-to-one —
// a past regression left `false` under `permadeath` (instead of `active`)
// and dropped the trailing skill placeholders, so clone-all always 500'd
// and fresh users got an empty character picker.
const template = {
  id: 1, name: 'Aranath', slug: 'aranath', type: 'ranger', gender: 'm',
  description: 'd', description_es: 'd', system_prompt: 'p',
  introduction_instructions: 'i', resistance: 5, permadeath: true,
  energy_initial: 100, shadow_initial: 0,
};

function mockPoolForCloning() {
  sqlLog.length = 0;
  pool.query = async (text, params) => {
    const flat = text.replace(/\s+/g, ' ').trim();
    sqlLog.push({ text: flat, params });
    if (/FROM starting_kits/.test(flat)) return { rows: [] };
    if (/owner_user_id = \$1 AND template_id/.test(flat)) return { rows: [] };
    if (/owner_user_id IS NULL/.test(flat)) return { rows: [template] };
    if (/INSERT INTO character_state/.test(flat)) return { rows: [{ id: 99 }] };
    if (/active_character_id FROM users/.test(flat)) return { rows: [{ active_character_id: null }] };
    return { rows: [] };
  };
  pool.connect = async () => ({ query: pool.query, release() {} });
}

function assertCloneInsertAligned() {
  const insert = sqlLog.find((q) => /^INSERT INTO character_state/.test(q.text));
  assert.ok(insert, 'clone INSERT should run');

  const cols = insert.text.match(/\(([^)]+)\)\s*VALUES/)[1].split(',').map((s) => s.trim());
  const vals = insert.text.match(/VALUES\s*\(([^)]+)\)/)[1].split(',').map((s) => s.trim());
  assert.equal(vals.length, cols.length, 'VALUES must cover every target column');

  const at = (col) => vals[cols.indexOf(col)];
  assert.equal(at('permadeath'), '$11');
  assert.equal(at('active'), 'false');
  assert.equal(at('owner_user_id'), '$12');
  assert.equal(at('template_id'), '$13');
  assert.equal(at('slug'), '$14');
  assert.equal(at('shadow'), '$16');

  const maxRef = Math.max(...vals.flatMap((v) => [...v.matchAll(/\$(\d+)/g)].map((m) => +m[1])));
  assert.equal(insert.params.length, maxRef, 'every param must be bound');
  assert.equal(insert.params[10], true, '$11 binds permadeath');
  assert.equal(insert.params[11], 7, '$12 binds userId');
}

async function runHandler(path, method, req) {
  const layer = characterRouter.stack.find(
    (l) => l.route && l.route.path === path && l.route.methods[method]
  );
  assert.ok(layer, `${method.toUpperCase()} ${path} should exist`);
  const handler = layer.route.stack[layer.route.stack.length - 1].handle;
  const res = mockRes();
  await handler(req, res, (err) => { throw err; });
  return res;
}

test('clone-all INSERT aligns columns with VALUES', async () => {
  mockPoolForCloning();
  try {
    await runHandler('/clone-all', 'post', { userId: 7 });
    assertCloneInsertAligned();
  } finally {
    restoreMock();
  }
});

test('clone/:templateId INSERT aligns columns with VALUES', async () => {
  mockPoolForCloning();
  try {
    await runHandler('/clone/:templateId', 'post', { params: { templateId: '1' }, userId: 7 });
    assertCloneInsertAligned();
  } finally {
    restoreMock();
  }
});
