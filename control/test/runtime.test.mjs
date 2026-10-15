import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { createLocalServer } from '../scripts/local-server.mjs';
import { emulatorEnvironment } from '../scripts/config.mjs';

test('el proceso de emuladores no hereda credenciales ajenas ni depuración', () => {
  process.env.CONTROL_TEST_UNRELATED_TOKEN = 'must-not-leak';
  try {
    const environment = emulatorEnvironment();
    assert.equal(environment.CONTROL_TEST_UNRELATED_TOKEN, undefined);
    assert.equal(environment.DEBUG, '');
    assert.equal(environment.GCLOUD_PROJECT, 'demo-alsdevstudio');
  } finally { delete process.env.CONTROL_TEST_UNRELATED_TOKEN; }
});

test('el servidor solo escucha loopback y no expone rutas fuera del build', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'als-control-'));
  await writeFile(join(directory, 'index.html'), '<h1>Panel</h1>');
  assert.throws(() => createLocalServer({ root: directory, host: '0.0.0.0' }));
  const server = createLocalServer({ root: directory, createSession: async () => ({ token: 'synthetic-test' }) });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const page = await fetch(origin);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal((await fetch(`${origin}/package.json`)).status, 404);
    assert.equal((await fetch(`${origin}/%2e%2e/package.json`)).status, 404);
    assert.equal((await fetch(`${origin}/__dev/session`, { method: 'POST' })).status, 403);
    assert.equal((await fetch(`${origin}/__dev/session`, { method: 'POST', headers: { Origin: 'https://evil.example' } })).status, 403);
    const session = await fetch(`${origin}/__dev/session`, { method: 'POST', headers: { Origin: origin } });
    assert.deepEqual(await session.json(), { token: 'synthetic-test' });
    assert.equal(session.headers.get('cache-control'), 'no-store');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    assert.ok(resolve(directory).startsWith(`${resolve(tmpdir())}${sep}als-control-`));
    await rm(directory, { recursive: true, force: true });
  }
});
