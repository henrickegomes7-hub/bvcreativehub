import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import express from 'express';
import { apiRouter } from '../backend/routes.js';
import { getPool } from '../backend/database.js';
import { formatRequestCode } from '../backend/requestsRoutes.js';

const app = express();
app.use(express.json(), apiRouter);
let server: ReturnType<typeof app.listen>;
let origin: string;
const previousDatabaseUrl = process.env.DATABASE_URL;

before(async () => {
  process.env.DATABASE_URL = 'postgres://localhost/test';
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await getPool().end();
  if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousDatabaseUrl;
});

test('request codes keep the entire database sequence and at least three digits', () => {
  for (const [sequence, suffix] of [['1', '001'], ['999', '999'], ['1000', '1000'], ['9007199254740993', '9007199254740993']]) {
    assert.equal(formatRequestCode('2026', sequence), `BV-2026-${suffix}`);
  }
});

test('changing the configured administrator revokes listing and commenting for the prior admin session', async t => {
  const previousEmail = process.env.ADMIN_EMAIL;
  t.after(() => {
    if (previousEmail === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = previousEmail;
  });
  const user = { id: 'account-1', role: 'admin', name: 'Ana', email: 'ana@gmail.com' };
  t.mock.method(getPool(), 'query', async (sql:string) => {
    if (sql.includes('FROM app_sessions')) return { rows: [user] };
    if (sql.includes('COUNT(*)')) return { rows: [{total:0}] };
    return {rows:[]};
  });
  const headers = { cookie:'bv_hub_session=test-session','content-type':'application/json' };
  process.env.ADMIN_EMAIL=user.email;
  assert.equal((await fetch(origin+'/requests',{headers})).status,200);
  process.env.ADMIN_EMAIL='nova@gmail.com';
  assert.equal((await fetch(origin+'/requests',{headers})).status,403);
  assert.equal((await fetch(origin+'/requests/00000000-0000-4000-8000-000000000001/comments',{method:'POST',headers,body:JSON.stringify({content:'Revisado'})})).status,403);
});

for (const [route, body] of Object.entries({
  verify: { email: 'ana@gmail.com', code: '123456' },
  complete: { resetToken: 'A'.repeat(43), password: 'test-password-123' },
})) {
  test(`password reset ${route} responds with 503 when the pool cannot connect`, async t => {
    const connect = t.mock.method(getPool(), 'connect', async () => { throw new Error('Pool unavailable'); });
    t.mock.method(console, 'error', () => {});
    t.mock.method(console, 'warn', () => {});
    const response = await fetch(`${origin}/auth/password-reset/${route}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    });
    assert.equal(connect.mock.callCount(), 1);
    assert.equal(response.status, 503);
    assert.equal(typeof (await response.json()).error, 'string');
  });
}

test('authentication status retries schema initialization after a connection failure', async t => {
  const release = t.mock.fn();
  const query = t.mock.fn(async () => ({ rowCount: 1 }));
  const client = { query, release };
  const connect = t.mock.method(getPool(), 'connect', async () => client);
  connect.mock.mockImplementationOnce(async () => { throw new Error('Pool unavailable'); });
  t.mock.method(getPool(), 'query', async () => ({ rows: [{ admin_exists: true }] }));
  t.mock.method(console, 'error', () => {});
  t.mock.method(console, 'warn', () => {});

  const statusUrl = `${origin}/auth/status`;
  assert.equal((await fetch(statusUrl)).status, 503);
  const recovered = await fetch(statusUrl);
  assert.equal(recovered.status, 200);
  assert.equal((await recovered.json()).adminSetupRequired, false);
  assert.equal(connect.mock.callCount(), 2);
  assert.equal(release.mock.callCount(), 1);
});
