import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAuthAuditEntry, redactEmail } from '../backend/audit.js';
import {
  normalizeEmail,
  publicUser,
  readSessionCookie,
  sessionHash,
  validPassword,
  validCredentials,
  validEmailAndPassword,
  isRoleAuthorized,
  canAccessAdmin,
} from '../backend/routes.js';

test('normalizeEmail trims and lowercases addresses', () => {
  assert.equal(normalizeEmail('  User.Name@Example.com  '), 'user.name@example.com');
  assert.equal(normalizeEmail('invalid-email'), null);
  assert.equal(normalizeEmail('user@example.com'), 'user@example.com');
});

test('validPassword enforces minimum and maximum length', () => {
  assert.equal(validPassword('123456789012'), true);
  assert.equal(validPassword('12345678901'), false);
  assert.equal(validPassword('a'.repeat(129)), false);
});

test('readSessionCookie extracts the current session token safely', () => {
  const req = {
    headers: {
      cookie: 'theme=dark; bv_hub_session=my.valid-token; other=value',
    },
  } as any;

  assert.equal(readSessionCookie(req), 'my.valid-token');
});

test('readSessionCookie ignores malformed session cookies', () => {
  const req = {
    headers: {
      cookie: 'bv_hub_session=bad cookie; theme=dark',
    },
  } as any;

  assert.equal(readSessionCookie(req), undefined);
});

test('sessionHash is stable and deterministic', () => {
  assert.equal(sessionHash('secret-token'), sessionHash('secret-token'));
  assert.notEqual(sessionHash('token-1'), sessionHash('token-2'));
});

test('publicUser removes the password hash from the response object', () => {
  const user = {
    id: '123',
    name: 'Ana',
    email: 'ana@example.com',
    role: 'admin',
    password_hash: 'hash-value',
  } as any;

  assert.deepEqual(publicUser(user), {
    id: '123',
    name: 'Ana',
    email: 'ana@example.com',
    role: 'admin',
  });
});

test('validCredentials and validEmailAndPassword centralize auth validation rules', () => {
  assert.equal(validCredentials('Ana', 'ana@example.com', '123456789012'), true);
  assert.equal(validCredentials('A', 'ana@example.com', '123456789012'), false);
  assert.equal(validEmailAndPassword('ana@example.com', '123456789012'), true);
  assert.equal(validEmailAndPassword('invalid-email', '123456789012'), false);
});

test('isRoleAuthorized allows only permitted roles', () => {
  assert.equal(isRoleAuthorized('admin', ['admin']), true);
  assert.equal(isRoleAuthorized('requester', ['admin']), false);
  assert.equal(isRoleAuthorized(undefined, ['admin']), false);
});

test('canAccessAdmin only allows the configured admin account', () => {
  const previous = process.env.ADMIN_EMAIL;
  process.env.ADMIN_EMAIL = 'admin@bv.com';

  const requester = { user: { id: 'user-1', name: 'Ana', email: 'ana@bv.com', role: 'requester' } } as any;
  const admin = { user: { id: 'user-2', name: 'Admin', email: 'admin@bv.com', role: 'admin' } } as any;

  assert.equal(canAccessAdmin(requester), false);
  assert.equal(canAccessAdmin(admin), true);

  if (previous === undefined) {
    delete process.env.ADMIN_EMAIL;
  } else {
    process.env.ADMIN_EMAIL = previous;
  }
});

test('audit helpers redact emails before logging', () => {
  assert.equal(redactEmail('ana.silva@example.com'), 'an***@example.com');
  const entry = buildAuthAuditEntry('login_failed', 'warning', { reason: 'invalid_credentials' }, 'ana.silva@example.com');
  assert.equal(entry.email, 'an***@example.com');
  assert.equal(entry.details.reason, 'invalid_credentials');
});
