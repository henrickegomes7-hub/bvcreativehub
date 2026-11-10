import test from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';

import { canAccessAdmin, requireUser } from '../backend/routes.js';

test('requireUser rejects requests without a valid session cookie', async () => {
  const req = {
    headers: {},
  } as unknown as Request;

  const res = {
    statusCode: 200,
    payload: undefined as Record<string, unknown> | undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: Record<string, unknown>) {
      this.payload = payload;
      return this;
    },
  } as Response & { statusCode: number; payload?: Record<string, unknown> };

  let nextCalled = false;
  await requireUser(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.payload, { error: 'Faça login para continuar.' });
});

test('canAccessAdmin blocks non-admin users', () => {
  const req = {
    user: {
      id: 'user-1',
      name: 'Ana',
      email: 'ana@bv.com',
      role: 'requester',
    },
  } as any;

  const previous = process.env.ADMIN_EMAIL;
  process.env.ADMIN_EMAIL = 'admin@bv.com';

  try {
    assert.equal(canAccessAdmin(req), false);
  } finally {
    if (previous === undefined) {
      delete process.env.ADMIN_EMAIL;
    } else {
      process.env.ADMIN_EMAIL = previous;
    }
  }
});

test('canAccessAdmin allows the configured admin account', () => {
  const req = {
    user: {
      id: 'user-2',
      name: 'Admin',
      email: 'admin@bv.com',
      role: 'admin',
    },
  } as any;

  const previous = process.env.ADMIN_EMAIL;
  process.env.ADMIN_EMAIL = 'admin@bv.com';

  try {
    assert.equal(canAccessAdmin(req), true);
  } finally {
    if (previous === undefined) {
      delete process.env.ADMIN_EMAIL;
    } else {
      process.env.ADMIN_EMAIL = previous;
    }
  }
});
