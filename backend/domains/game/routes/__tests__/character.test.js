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
