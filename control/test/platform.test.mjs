import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlatform } from '../web/scripts/platform.mjs';

const production = { mode: 'production', firebase: { apiKey: 'test-key', authDomain: 'test.firebaseapp.com', projectId: 'alsdevstudio', appId: 'test-app' }, apiBase: '/api' };
function authFixture() {
  const auth = { currentUser: null };
  let listener;
  return {
    auth,
    sdk: {
      initializeApp: () => ({}), getAuth: () => auth,
      onIdTokenChanged: (_, cb) => { listener = cb; cb(null); return () => {}; },
      GoogleAuthProvider: class {},
      signInWithPopup: async () => { auth.currentUser = { uid: 'admin', email: 'admin@example.test', getIdToken: async () => 'test-id-token' }; listener(auth.currentUser); },
      signOut: async () => { auth.currentUser = null; listener(null); },
    },
  };
}

test('sin configuración informa el problema y no crea una sesión falsa', async () => {
  const platform = createPlatform({ config: { mode: 'unconfigured' } });
  assert.equal(platform.mode, 'unconfigured');
  let current = 'unknown';
  platform.onSession((session) => { current = session; });
  await assert.rejects(platform.signIn(), (error) => error.code === 'not-configured');
  assert.equal(current, null);
});

test('sesión y llamadas usan token y preservan idempotencia; cierre elimina acceso', async () => {
  const fixture = authFixture();
  const requests = [];
  const platform = createPlatform({ config: production, loadSdk: async () => fixture.sdk,
    fetch: async (url, options) => { requests.push([url, options]); return Response.json({ result: { ok: true } }); } });
  const sessions = [];
  platform.onSession((session) => sessions.push(session));
  await platform.signIn();
  await platform.command('subject.create', { name: 'Demo' }, 'stable-request-id');
  assert.equal(requests[0][0], '/api/commands');
  assert.equal(requests[0][1].headers.Authorization, 'Bearer test-id-token');
  assert.equal(JSON.parse(requests[0][1].body).requestId, 'stable-request-id');
  assert.deepEqual(sessions.at(-1), { uid: 'admin', email: 'admin@example.test' });
  await platform.signOut();
  await assert.rejects(platform.getState(), (error) => error.code === 'unauthenticated');
  assert.equal(sessions.at(-1), null);
});

test('fallos de red y respuestas internas producen errores seguros', async () => {
  const fixture = authFixture();
  let network = true;
  const platform = createPlatform({ config: production, loadSdk: async () => fixture.sdk,
    fetch: async () => { if (network) throw new Error('sensitive network detail'); return new Response('<internal stack>', { status: 500 }); } });
  await platform.signIn();
  await assert.rejects(platform.getState(), (error) => error.code === 'network-error' && !error.message.includes('sensitive'));
  network = false;
  await assert.rejects(platform.getState(), (error) => error.status === 500 && !error.message.includes('stack'));
});

test('token vencido elimina la sesión y no intenta llamar la API', async () => {
  const fixture = authFixture();
  let calls = 0;
  const platform = createPlatform({ config: production, loadSdk: async () => fixture.sdk,
    fetch: async () => { calls += 1; return Response.json({}); } });
  const sessions = [];
  platform.onSession((value) => sessions.push(value));
  await platform.signIn();
  fixture.auth.currentUser.getIdToken = async () => { throw new Error('revoked'); };
  await assert.rejects(platform.getState(), (error) => error.code === 'session-expired' && error.status === 401);
  assert.equal(calls, 0);
  assert.equal(sessions.at(-1), null);
});

test('rechazo 401 del servidor cierra la identidad Firebase', async () => {
  const fixture = authFixture();
  const platform = createPlatform({ config: production, loadSdk: async () => fixture.sdk,
    fetch: async () => Response.json({ error: { code: 'unauthenticated', message: 'Ingresa nuevamente.' } }, { status: 401 }) });
  await platform.signIn();
  await assert.rejects(platform.getState(), (error) => error.code === 'unauthenticated' && error.status === 401);
  assert.equal(fixture.auth.currentUser, null);
});
