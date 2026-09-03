import { test } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Tests for DELETE /api/auth/me — account deletion cascade
// ---------------------------------------------------------------------------
// We mock pool.query, bcrypt, and jwt by intercepting the module's imports
// through the db.js barrel. The test creates a mock Express req/res and
// calls the router directly.

// Track all SQL executed so we can assert the cascade order
const sqlLog = [];
let mockPasswordHash = '$2b$10$validhash';
let mockBcryptResult = true;
let mockUserExists = true;

// Mock pool that db.js exports
const mockPool = {
  query: async (text, params) => {
    sqlLog.push({ text: text.trim(), params });
    if (text.includes('SELECT password_hash FROM users')) {
      return { rows: mockUserExists ? [{ password_hash: mockPasswordHash }] : [] };
    }
    return { rows: [] };
  },
};

// We need to intercept the db.js import. In Node's native test runner we
// can use --import with a register hook, but that's heavy. Instead, we
// patch the mock pool onto the actual db module's default export.
import pool from '../../../../db.js';

// Save original to restore later
const originalQuery = pool.query;

function installMock() {
  pool.query = mockPool.query;
  sqlLog.length = 0;
}

function restoreMock() {
  pool.query = originalQuery;
}

// Mock bcrypt — we need to intercept the bcrypt module that auth.js uses.
// Since auth.js does `import bcrypt from 'bcrypt'`, we can't easily mock it
// at runtime. Instead, we test the cascade SQL logic by calling the
// handler with a pre-validated state.
//
// Strategy: we create a minimal Express-like mock and call the DELETE
// handler. We patch pool.query to track SQL. For bcrypt, we use the real
// bcrypt with a known hash so compare returns predictably.

import bcrypt from 'bcrypt';

// Pre-compute a real hash for the test password
const TEST_PASSWORD = 'testpass123';
const TEST_HASH = await bcrypt.hash(TEST_PASSWORD, 10);

// ---------------------------------------------------------------------------
// Build a mock Express req/res for the DELETE handler
// ---------------------------------------------------------------------------
function mockReq(body = {}, userId = 1) {
  return { body, userId, params: {} };
}

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    ended: false,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
    end() { this.ended = true; return this; },
  };
  return res;
}

// Import the router to extract the DELETE handler
// We need to find the DELETE /me route handler from the auth router
import authRouter from '../auth.js';
// auth.js is at domains/game/routes/auth.js, test is at domains/game/routes/__tests__/
// so '../auth.js' resolves correctly

// Find the DELETE /me route
const deleteRoute = authRouter.stack.find(
  (layer) => layer.route && layer.route.path === '/me' && layer.route.methods.delete
);

assert.ok(deleteRoute, 'DELETE /me route should exist in auth router');

// The route has authenticateToken middleware + the handler
// We need to call the handler directly, bypassing auth middleware
const deleteHandler = deleteRoute.route.stack[deleteRoute.route.stack.length - 1].handle;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('DELETE /me requires password in body', async () => {
  installMock();
  try {
    mockPasswordHash = TEST_HASH;
    mockUserExists = true;
    const req = mockReq({}, 1);
    const res = mockRes();
    await deleteHandler(req, res, (err) => { throw err; });
    assert.equal(res.statusCode, 400);
    assert.match(res.body.error, /password/i);
  } finally {
    restoreMock();
  }
});

test('DELETE /me returns 404 for non-existent user', async () => {
  installMock();
  try {
    mockUserExists = false;
    const req = mockReq({ password: TEST_PASSWORD }, 999);
    const res = mockRes();
    await deleteHandler(req, res, (err) => { throw err; });
    assert.equal(res.statusCode, 404);
  } finally {
    restoreMock();
  }
});

test('DELETE /me returns 403 with wrong password', async () => {
  installMock();
  try {
    mockPasswordHash = TEST_HASH;
    mockUserExists = true;
    const req = mockReq({ password: 'wrongpassword' }, 1);
    const res = mockRes();
    await deleteHandler(req, res, (err) => { throw err; });
    assert.equal(res.statusCode, 403);
    assert.match(res.body.error, /incorrect/i);
  } finally {
    restoreMock();
  }
});

test('DELETE /me executes cascade in correct order and returns 204', async () => {
  installMock();
  try {
    mockPasswordHash = TEST_HASH;
    mockUserExists = true;
    const req = mockReq({ password: TEST_PASSWORD }, 1);
    const res = mockRes();
    await deleteHandler(req, res, (err) => { throw err; });

    assert.equal(res.statusCode, 204);
    assert.ok(res.ended, 'response should be ended');

    // Verify the SQL cascade order
    const sqlTexts = sqlLog.map((q) => q.text);

    // 1. SELECT password_hash
    const selectIdx = sqlTexts.findIndex((t) => t.includes('SELECT password_hash'));
    assert.ok(selectIdx >= 0, 'should query password_hash');

    // 2. BEGIN
    const beginIdx = sqlTexts.indexOf('BEGIN');
    assert.ok(beginIdx > selectIdx, 'BEGIN should come after password select');

    // 3. DELETE character_state_log (before user delete)
    const logDeleteIdx = sqlTexts.findIndex((t) => t.includes('DELETE FROM character_state_log'));
    assert.ok(logDeleteIdx > beginIdx, 'character_state_log delete should come after BEGIN');

    // 4. DELETE trips (before user delete)
    const tripsDeleteIdx = sqlTexts.findIndex((t) => t.includes('DELETE FROM trips'));
    assert.ok(tripsDeleteIdx > logDeleteIdx, 'trips delete should come after log delete');

    // 5. DELETE users
    const userDeleteIdx = sqlTexts.findIndex((t) => t.includes('DELETE FROM users WHERE id'));
    assert.ok(userDeleteIdx > tripsDeleteIdx, 'users delete should come after trips delete');

    // 6. COMMIT
    const commitIdx = sqlTexts.indexOf('COMMIT');
    assert.ok(commitIdx > userDeleteIdx, 'COMMIT should come after all deletes');
  } finally {
    restoreMock();
  }
});

test('DELETE /me rolls back on transaction error', async () => {
  installMock();
  try {
    mockPasswordHash = TEST_HASH;
    mockUserExists = true;

    // Make the trips DELETE fail
    const originalMockQuery = mockPool.query;
    mockPool.query = async (text, params) => {
      sqlLog.push({ text: text.trim(), params });
      if (text.includes('SELECT password_hash')) {
        return { rows: [{ password_hash: TEST_HASH }] };
      }
      if (text.includes('DELETE FROM trips')) {
        throw new Error('FK constraint failure');
      }
      return { rows: [] };
    };
    pool.query = mockPool.query;

    const req = mockReq({ password: TEST_PASSWORD }, 1);
    const res = mockRes();

    // The handler should call next(error) on transaction failure
    let caughtError = null;
    await deleteHandler(req, res, (err) => { caughtError = err; });

    assert.ok(caughtError, 'should pass error to next()');
    assert.match(caughtError.message, /FK constraint/);

    // Verify ROLLBACK was called
    const sqlTexts = sqlLog.map((q) => q.text);
    assert.ok(sqlTexts.includes('ROLLBACK'), 'should ROLLBACK on error');
    assert.ok(!sqlTexts.includes('COMMIT'), 'should not COMMIT on error');

    // Restore the working mock
    mockPool.query = originalMockQuery;
  } finally {
    restoreMock();
  }
});
