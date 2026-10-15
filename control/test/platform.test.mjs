import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlatform } from '../web/scripts/platform.mjs';

const production = { mode: 'production', firebase: { apiKey: 'test-key', authDomain: 'test.firebaseapp.com', projectId: 'alsdevstudio', appId: 'test-app' }, apiBase: '/api' };
function account() { return { uid: 'admin', email: 'admin@example.test', getIdToken: async () => 'test-id-token' }; }
function authFixture({ user = null, redirectUser = null, redirectError = null } = {}) {
  const auth = { currentUser: user };
  let listener;
  const fixture = {
    auth, redirectUser, redirectError, calls: { results: 0, starts: 0, popups: 0 },
    sdk: {
      initializeApp: () => ({}), getAuth: () => auth,
      onIdTokenChanged: (_, cb) => { listener = cb; cb(auth.currentUser); return () => {}; },
      GoogleAuthProvider: class {},
      getRedirectResult: async () => {
        fixture.calls.results += 1;
        if (fixture.redirectError) throw fixture.redirectError;
        if (fixture.redirectUser) { auth.currentUser = fixture.redirectUser; return { user: fixture.redirectUser }; }
        return null;
      },
      signInWithRedirect: async () => { fixture.calls.starts += 1; },
      signInWithPopup: async () => { fixture.calls.popups += 1; throw new Error('No debe abrir una ventana emergente.'); },
      signOut: async () => { auth.currentUser = null; listener(null); },
    },
  };
  return fixture;
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
  const fixture = authFixture({ user: account() });
  const requests = [];
  const platform = createPlatform({ config: production, loadSdk: async () => fixture.sdk,
    fetch: async (url, options) => { requests.push([url, options]); return Response.json({ result: { ok: true } }); } });
  const sessions = [];
  platform.onSession((session) => sessions.push(session));
  await platform.command('subject.create', { name: 'Demo' }, 'stable-request-id');
  assert.equal(requests[0][0], '/api/commands');
  assert.equal(requests[0][1].headers.Authorization, 'Bearer test-id-token');
  assert.equal(JSON.parse(requests[0][1].body).requestId, 'stable-request-id');
  assert.deepEqual(sessions.at(-1), { uid: 'admin', email: 'admin@example.test' });
  assert.equal(fixture.calls.results, 1);
  assert.equal(fixture.calls.starts, 0);
  await platform.signOut();
  await assert.rejects(platform.getState(), (error) => error.code === 'unauthenticated');
  assert.equal(sessions.at(-1), null);
});

test('fallos de red y respuestas internas producen errores seguros', async () => {
  const fixture = authFixture({ user: account() });
  let network = true;
  const platform = createPlatform({ config: production, loadSdk: async () => fixture.sdk,
    fetch: async () => { if (network) throw new Error('sensitive network detail'); return new Response('<internal stack>', { status: 500 }); } });
  await assert.rejects(platform.getState(), (error) => error.code === 'network-error' && !error.message.includes('sensitive'));
  network = false;
  await assert.rejects(platform.getState(), (error) => error.status === 500 && !error.message.includes('stack'));
});

test('token vencido elimina la sesión y no intenta llamar la API', async () => {
  const fixture = authFixture({ user: account() });
  let calls = 0;
  const platform = createPlatform({ config: production, loadSdk: async () => fixture.sdk,
    fetch: async () => { calls += 1; return Response.json({}); } });
  const sessions = [];
  platform.onSession((value) => sessions.push(value));
  fixture.auth.currentUser.getIdToken = async () => { throw new Error('revoked'); };
  await assert.rejects(platform.getState(), (error) => error.code === 'session-expired' && error.status === 401);
  assert.equal(calls, 0);
  assert.equal(sessions.at(-1), null);
});

test('rechazo 401 del servidor cierra la identidad Firebase', async () => {
  const fixture = authFixture({ user: account() });
  const platform = createPlatform({ config: production, loadSdk: async () => fixture.sdk,
    fetch: async () => Response.json({ error: { code: 'unauthenticated', message: 'Ingresa nuevamente.' } }, { status: 401 }) });
  await assert.rejects(platform.getState(), (error) => error.code === 'unauthenticated' && error.status === 401);
  assert.equal(fixture.auth.currentUser, null);
});

test('Google inicia una redirección en la misma pestaña sin abrir popup ni crear una sesión', async () => {
  const fixture = authFixture();
  const platform = createPlatform({ config: production, loadSdk: async () => fixture.sdk });
  const sessions = [];
  platform.onSession(value => sessions.push(value));
  await platform.signIn();
  assert.equal(fixture.calls.results, 1);
  assert.equal(fixture.calls.starts, 1);
  assert.equal(fixture.calls.popups, 0);
  assert.equal(sessions.every(value => value === null), true);
  await assert.rejects(platform.getState(), error => error.code === 'unauthenticated');
});

test('al regresar de Google procesa el resultado y el observador restaura el acceso sin iniciar otro login', async () => {
  const fixture = authFixture({ redirectUser: account() });
  const requests = [];
  const platform = createPlatform({ config: production, loadSdk: async () => fixture.sdk,
    fetch: async (url, options) => { requests.push([url, options]); return Response.json({ products: [] }); } });
  const sessions = [];
  platform.onSession(value => sessions.push(value));
  await platform.getState();
  assert.deepEqual(sessions.at(-1), { uid: 'admin', email: 'admin@example.test' });
  assert.equal(requests[0][1].headers.Authorization, 'Bearer test-id-token');
  assert.equal(fixture.calls.results, 1);
  assert.equal(fixture.calls.starts, 0);
});

test('el resultado de redirección por sí solo no concede sesión si el observador no confirma identidad', async () => {
  const fixture = authFixture();
  fixture.sdk.getRedirectResult = async () => ({ user: account() });
  let requests = 0;
  const platform = createPlatform({ config: production, loadSdk: async () => fixture.sdk,
    fetch: async () => { requests += 1; return Response.json({}); } });
  await assert.rejects(platform.getState(), error => error.code === 'unauthenticated');
  assert.equal(requests, 0);
});

test('un error al regresar de Google se informa de forma segura y permite reintento explícito sin bucle', async () => {
  const fixture = authFixture({ redirectError: Object.assign(new Error('sensitive oauth token detail'), { code: 'auth/invalid-credential' }) });
  const platform = createPlatform({ config: production, loadSdk: async () => fixture.sdk });
  const errors = [];
  const sessions = [];
  platform.onSession(value => sessions.push(value), error => errors.push(error));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(errors.length, 1);
  assert.equal(errors[0].code, 'auth/invalid-credential');
  assert.doesNotMatch(errors[0].message, /sensitive|token detail/);
  assert.equal(sessions.every(value => value === null), true);
  assert.equal(fixture.calls.starts, 0);
  fixture.redirectError = null;
  await platform.signIn();
  assert.equal(fixture.calls.results, 2);
  assert.equal(fixture.calls.starts, 1);
  assert.equal(errors.length, 1);
});

test('un fallo al comenzar la redirección devuelve un error seguro y no anuncia acceso', async () => {
  const fixture = authFixture();
  fixture.sdk.signInWithRedirect = async () => { throw Object.assign(new Error('sensitive credential'), { code: 'auth/network-request-failed' }); };
  const platform = createPlatform({ config: production, loadSdk: async () => fixture.sdk });
  const sessions = [];
  platform.onSession(value => sessions.push(value));
  await assert.rejects(platform.signIn(), error => error.code === 'auth/network-request-failed' && !error.message.includes('sensitive'));
  assert.equal(sessions.every(value => value === null), true);
});
