import { LEAD } from './sarin-lead-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { sqliteFixture } from './sarin-sqlite-fixture.mjs';

// Claves efímeras y datos sintéticos: nunca contacta Google ni una cuenta real.
const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicJwk = { ...pair.publicKey.export({ format: 'jwk' }), kid: 'fixture-key', alg: 'RS256', use: 'sig' };
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const LOOKUP_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=fixture-firebase-public-key';
const env = () => ({
  SARIN_ADMIN_ENABLED: 'true', SARIN_FIREBASE_API_KEY: 'fixture-firebase-public-key',
  SARIN_FIREBASE_PROJECT_ID: 'alsdevstudio', SARIN_ADMIN_UID: 'fixture-owner', SARIN_ADMIN_EMAIL: 'owner@example.test',
  SARIN_ADMIN_CSRF_SECRET: 'fixture-csrf-secret-with-at-least-32-characters', SARIN_DB: { prepare() {} },
});
const id = '89a256b7-53ac-49ce-8ab8-4645c22952ff';
function jwt(overrides = {}, { alg = 'RS256', kid = 'fixture-key', key = pair.privateKey } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const claims = { iss: 'https://securetoken.google.com/alsdevstudio', aud: 'alsdevstudio', exp: now + 600, iat: now - 5, nbf: now - 5,
    auth_time: now - 5, email: 'owner@example.test', email_verified: true, sub: 'fixture-owner', firebase: { sign_in_provider: 'google.com' }, ...overrides };
  for (const name of Object.keys(claims)) if (claims[name] === undefined) delete claims[name];
  const input = `${Buffer.from(JSON.stringify({ alg, kid })).toString('base64url')}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}`;
  return `${input}.${sign('RSA-SHA256', Buffer.from(input), key).toString('base64url')}`;
}
function request(path = '/api/control-sarin/bootstrap', { token = jwt(), headers = {}, method = 'GET', body, origin = 'https://alsdevstudio.com' } = {}) {
  const combined = new Headers(headers);
  if (token) combined.set('Cookie', [combined.get('Cookie'), `__Host-sarin_admin=${token}`].filter(Boolean).join('; '));
  return new Request(`${origin}${path}`, { method, headers: combined, ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }) });
}
const account = (overrides = {}) => ({ localId: 'fixture-owner', email: 'owner@example.test', emailVerified: true,
  disabled: false, providerUserInfo: [{ providerId: 'google.com', email: 'owner@example.test' }], ...overrides });
function googleFetch({ user = account(), lookup } = {}) {
  return async (url, options) => {
    const address = String(url);
    if (address === JWKS_URL) return Response.json({ keys: [publicJwk] }, { headers: { 'Cache-Control': 'public, max-age=300' } });
    assert.equal(address, LOOKUP_URL, 'ninguna red remota');
    assert.equal(options.method, 'POST');
    const value = JSON.parse(options.body);
    assert.equal(typeof value.idToken, 'string');
    return lookup ? lookup(options) : Response.json({ users: [user] });
  };
}
async function fixture(run) {
  const original = globalThis.fetch;
  const fetched = [];
  const authFetch = googleFetch();
  globalThis.fetch = async (...args) => { fetched.push(String(args[0])); return authFetch(...args); };
  try { return await run(fetched); } finally { globalThis.fetch = original; }
}
const summary = () => ({ id, createdAt: 1792152000000, updatedAt: 1792152001000, expiresAt: 1794744000000, service: 'website', turns: 1, reviewedAt: null, blockedUntil: null, status: 'completed', outOfScopeCount: 0, errorCount: 0, usage: { reservedMicros: 100, verifiedMicros: 40, retainedMicros: 0 } });
function storeFixture() {
  const calls = [];
  return {
    calls,
    getPurgeStatus: async () => ({ lastRunAt: null, lastSuccessAt: null, lastErrorAt: null, status: 'never', remaining: false }),
    listConversations: async filters => { calls.push(['list', filters]); return { items: [{ ...summary(), tokenHash: 'fixture-session-private', ipHash: 'fixture-ip-private' }], nextCursor: null }; },
    getConversation: async value => { calls.push(['get', value]); return { ...summary(), tokenHash: 'fixture-session-private', messages: [{ id: 'message-fixture', turn: 1, role: 'user', content: '<img src=x onerror=alert(1)>', at: 1792152000000, status: 'completed', ip: '192.0.2.1' }], events: [{ id: 'event-fixture', kind: 'completed', at: 1792152001000, count: 1, secret: 'fixture-private' }], consent: { acceptedAt: 1792151990000, noticeVersion: 'fixture-v1', privacyVersion: 'fixture-v1', termsVersion: 'fixture-v1', noticeHash: 'fixture-notice-hash', method: 'checkbox_and_start', tokenHash: 'fixture-private' } }; },
    adminAction: async value => { calls.push(['action', value]); return { ok: true }; },
  };
}
const moduleUnderTest = () => import('../../server/sarin/admin.js');

test('bootstrap privado verifica firma y cuenta Firebase y entrega CSRF sin caché', async () => fixture(async fetched => {
  const { handleSarinAdmin } = await moduleUnderTest();
  const response = await handleSarinAdmin(request(), env(), { store: storeFixture() });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.adminEmail, 'owner@example.test');
  assert.ok(data.csrfToken.length > 30);
  assert.equal(data.purge.status, 'never');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow, noarchive');
  assert.ok(fetched.includes(JWKS_URL)); assert.ok(fetched.includes(LOOKUP_URL));
}));

for (const [name, token] of [
  ['ausente', null], ['falso', 'fixture.false.jwt'], ['firma ajena', jwt({}, { key: generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey })],
  ['algoritmo ajeno', jwt({}, { alg: 'HS256' })], ['clave no publicada por Google', jwt({}, { kid: 'unknown-key' })], ['vencido', jwt({ exp: 1 })], ['exp ausente', jwt({ exp: undefined })],
  ['aud ajena', jwt({ aud: 'another-project' })], ['aud substring', jwt({ aud: 'prefix-alsdevstudio-suffix' })], ['aud ausente', jwt({ aud: undefined })],
  ['iss ajeno', jwt({ iss: 'https://securetoken.google.com/other-project' })], ['iss ausente', jwt({ iss: undefined })],
  ['otro propietario', jwt({ email: 'other@example.test' })], ['email ausente', jwt({ email: undefined })], ['sub vacío', jwt({ sub: '' })],
  ['UID ajeno', jwt({ sub: 'another-owner' })], ['correo sin verificar', jwt({ email_verified: false })], ['correo verificado ausente', jwt({ email_verified: undefined })],
  ['proveedor ajeno', jwt({ firebase: { sign_in_provider: 'password' } })], ['proveedor ausente', jwt({ firebase: undefined })],
  ['auth_time ausente', jwt({ auth_time: undefined })], ['auth_time texto', jwt({ auth_time: String(Math.floor(Date.now() / 1000) - 5) })],
  ['auth_time futuro', jwt({ auth_time: Math.floor(Date.now() / 1000) + 120 })],
  ['autenticación mayor de seis horas', jwt({ auth_time: Math.floor(Date.now() / 1000) - 21601 })],
  ['exp texto', jwt({ exp: String(Math.floor(Date.now() / 1000) + 600) })], ['iat futuro', jwt({ iat: Math.floor(Date.now() / 1000) + 120 })], ['nbf futuro', jwt({ nbf: Math.floor(Date.now() / 1000) + 120 })],
]) test(`Firebase rechaza JWT ${name}`, async () => fixture(async () => {
  const { handleSarinAdmin } = await moduleUnderTest();
  const store = storeFixture();
  const response = await handleSarinAdmin(request(undefined, { token }), env(), { store });
  assert.equal(response.status, 403);
  assert.equal(response.headers.has('Location'), false);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(store.calls, []);
}));

for (const name of ['SARIN_ADMIN_ENABLED', 'SARIN_FIREBASE_API_KEY', 'SARIN_FIREBASE_PROJECT_ID', 'SARIN_ADMIN_UID', 'SARIN_ADMIN_EMAIL', 'SARIN_ADMIN_CSRF_SECRET']) test(`configuración ausente ${name} cierra antes de red`, async () => fixture(async fetched => {
  const { handleSarinAdmin } = await moduleUnderTest();
  const config = env(); delete config[name];
  assert.equal((await handleSarinAdmin(request(), config, { store: storeFixture() })).status, 503);
  assert.equal(fetched.length, 0);
}));

test('pages.dev sirve solo el shell de acceso con cabeceras privadas y sin identidad precargada', async () => fixture(async fetched => {
  const { protectSarinAdmin } = await import('../../server/sarin/access.js');
  for (const path of ['/control-sarin', '/control-sarin/', '/control-sarin/index.html', '/control-sarin/extra']) {
    let delivered = false;
    const context = { request: request(path, { origin: 'https://fixture.pages.dev', token: null, headers: { 'Cf-Access-Authenticated-User-Email': 'owner@example.test' } }), env: env(), data: {}, functionPath: '/control-sarin', waitUntil() {}, passThroughOnException() {}, next: async () => { delivered = true; return new Response('<html>login shell</html>'); } };
    const response = await protectSarinAdmin(context);
    assert.equal(response.status, 200); assert.equal(delivered, true);
    assert.equal(await response.text(), '<html>login shell</html>');
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.match(response.headers.get('X-Robots-Tag'), /noindex/);
    assert.equal(context.data.sarinAdmin, undefined);
  }
  assert.equal(fetched.length, 0);
}));

test('HTML de acceso aplica CSP Firebase y cabeceras privadas aun con CSP heredada', async () => fixture(async () => {
  const { protectSarinAdmin } = await import('../../server/sarin/access.js');
  const response = await protectSarinAdmin({ request: request('/control-sarin/'), env: env(), data: {}, functionPath: '/control-sarin', waitUntil() {}, passThroughOnException() {}, next: async () => new Response('<html>fixture</html>', { headers: { 'Content-Security-Policy': "default-src 'self'" } }) });
  assert.equal(response.status, 200); assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const policy = response.headers.get('Content-Security-Policy');
  assert.match(policy, /frame-ancestors 'none'/); assert.match(policy, /identitytoolkit\.googleapis\.com/);
  assert.match(policy, /alsdevstudio\.firebaseapp\.com/); assert.ok(!policy.includes("script-src 'unsafe-inline'"));
}));

test('lista y detalle proyectan solo campos públicos; el contenido XSS sigue siendo JSON inerte', async () => fixture(async () => {
  const { handleSarinAdmin } = await moduleUnderTest(); const store = storeFixture();
  const list = await handleSarinAdmin(request('/api/control-sarin/conversations?limit=12&service=website&state=reviewed&from=1790802000000&to=1792213199999'), env(), { store });
  assert.equal(list.status, 200); const listBody = await list.json(); assert.equal(listBody.items[0].id, id); assert.equal(listBody.items[0].tokenHash, undefined);
  assert.equal(store.calls[0][1].limit, 12); assert.equal(store.calls[0][1].state, 'reviewed');
  const detail = await handleSarinAdmin(request(`/api/control-sarin/conversations/${id}`), env(), { store });
  assert.equal(detail.headers.get('Content-Type'), 'application/json; charset=utf-8');
  const text = await detail.text(); assert.ok(!/fixture-session-private|fixture-ip-private|fixture-private|192\.0\.2\.1/.test(text));
  const body = JSON.parse(text); assert.equal(body.messages[0].content, '<img src=x onerror=alert(1)>');
}));

for (const query of ['limit=0', 'limit=51', 'limit=2.5', 'limit=1&limit=2', 'wat=1', 'service=unknown', 'state=unknown', 'from=bad', 'from=2026-02-30', 'from=2026-10-16', 'from=1792213199999&to=1790802000000', 'from=-1', 'from=1.5', 'from=9999999999999999', 'cursor=%3Cscript%3E']) test(`rechaza filtros inválidos ${query}`, async () => fixture(async () => {
  const { handleSarinAdmin } = await moduleUnderTest(); const store = storeFixture();
  assert.equal((await handleSarinAdmin(request(`/api/control-sarin/conversations?${query}`), env(), { store })).status, 400);
  assert.deepEqual(store.calls, []);
}));

test('acciones exigen CSRF firmado, origen exacto y JSON cerrado; actor solo hash', async () => fixture(async () => {
  const { handleSarinAdmin } = await moduleUnderTest(); const store = storeFixture();
  const bootstrap = await (await handleSarinAdmin(request(), env(), { store })).json();
  const path = `/api/control-sarin/conversations/${id}`;
  const good = { method: 'POST', headers: { Origin: 'https://alsdevstudio.com', 'Content-Type': 'application/json', 'X-Sarin-CSRF': bootstrap.csrfToken }, body: { action: 'review' } };
  for (const options of [ { ...good, headers: { ...good.headers, Origin: 'https://evil.test' } }, { ...good, headers: { ...good.headers, Origin: '' } }, { ...good, headers: { ...good.headers, 'Content-Type': 'text/plain' } }, { ...good, headers: { ...good.headers, 'X-Sarin-CSRF': '' } }, { ...good, headers: { ...good.headers, 'X-Sarin-CSRF': `${bootstrap.csrfToken}x` } }, { ...good, body: { action: 'delete', extra: 'forbidden' } }, { ...good, body: { action: 'unknown' } } ]) {
    assert.ok([400, 403].includes((await handleSarinAdmin(request(path, options), env(), { store })).status));
  }
  assert.deepEqual(store.calls, []);
  for (const action of ['review', 'block', 'unblock', 'delete']) assert.equal((await handleSarinAdmin(request(path, { ...good, body: { action } }), env(), { store })).status, 200);
  for (const [, value] of store.calls) { assert.match(value.actor, /^[a-f0-9]{64}$/); assert.ok(!JSON.stringify(value).includes('owner@example.test')); }
}));

test('CSRF caduca, depende de la identidad y no usa SARIN_IP_SECRET', async () => fixture(async () => {
  const { handleSarinAdmin } = await moduleUnderTest(); const store = storeFixture(); const clock = Date.now();
  const token = jwt({ exp: Math.floor(clock / 1000) + 3600 });
  const csrf = (await (await handleSarinAdmin(request(undefined, { token }), env(), { store, now: () => clock })).json()).csrfToken;
  const options = { token, method: 'POST', headers: { Origin: 'https://alsdevstudio.com', 'Content-Type': 'application/json', 'X-Sarin-CSRF': csrf }, body: { action: 'review' } };
  assert.equal((await handleSarinAdmin(request(`/api/control-sarin/conversations/${id}`, options), env(), { store, now: () => clock + 16 * 60 * 1000 })).status, 403);
  const alternateConfig = { ...env(), SARIN_ADMIN_UID: 'another-sub' }, alternateToken = jwt({ sub: 'another-sub' });
  const alternateOptions = { store, authFetch: googleFetch({ user: account({ localId: 'another-sub' }) }) };
  assert.equal((await handleSarinAdmin(request(undefined, { token: alternateToken }), alternateConfig, alternateOptions)).status, 200);
  assert.equal((await handleSarinAdmin(request(`/api/control-sarin/conversations/${id}`, { ...options, token: alternateToken }), alternateConfig, alternateOptions)).status, 403);
  assert.deepEqual(store.calls, []);
}));

test('firma CSRF rechaza payload alterado, secreto ajeno y cuerpo fuera del límite', async () => fixture(async () => {
  const { handleSarinAdmin } = await moduleUnderTest(); const store = storeFixture();
  const bootstrap = await (await handleSarinAdmin(request(), env(), { store })).json();
  const headers = { Origin: 'https://alsdevstudio.com', 'Content-Type': 'application/json', 'X-Sarin-CSRF': bootstrap.csrfToken };
  const path = `/api/control-sarin/conversations/${id}`;
  const [payload, signature] = bootstrap.csrfToken.split('.');
  const changed = JSON.parse(Buffer.from(payload, 'base64url').toString()); changed.exp += 60;
  const forged = `${Buffer.from(JSON.stringify(changed)).toString('base64url')}.${signature}`;
  const response = await handleSarinAdmin(request(path, { method: 'POST', headers: { ...headers, 'X-Sarin-CSRF': forged }, body: { action: 'delete' } }), env(), { store });
  assert.equal(response.status, 403);
  const otherSecret = { ...env(), SARIN_ADMIN_CSRF_SECRET: 'another-fixture-secret-at-least-32-characters' };
  assert.equal((await handleSarinAdmin(request(path, { method: 'POST', headers, body: { action: 'delete' } }), otherSecret, { store })).status, 403);
  for (const body of ['{', 'null', '[]', '{"action":1}', '{"action":"review"}' + ' '.repeat(257)]) {
    const result = await handleSarinAdmin(request(path, { method: 'POST', headers, body }), env(), { store });
    assert.equal(result.status, body.length > 256 ? 413 : 400);
  }
  assert.equal((await handleSarinAdmin(request(path, { method: 'POST', headers: { ...headers, 'Content-Encoding': 'gzip' }, body: { action: 'review' } }), env(), { store })).status, 400);
  assert.deepEqual(store.calls, []);
}));

test('fechas epochms conservan el intervalo Colombia definido por la UI', async () => fixture(async () => {
  const { handleSarinAdmin } = await moduleUnderTest(); const store = storeFixture();
  const response = await handleSarinAdmin(request('/api/control-sarin/conversations?from=1792126800000&to=1792213199999'), env(), { store });
  assert.equal(response.status, 200);
  assert.equal(store.calls[0][1].from, 1792126800000); assert.equal(store.calls[0][1].to, 1792213199999);
}));

for (const [name, changes] of [
  ['apagada', { SARIN_ADMIN_ENABLED: 'false' }], ['proyecto malformado', { SARIN_FIREBASE_PROJECT_ID: 'https://evil.test' }],
  ['UID vacío', { SARIN_ADMIN_UID: '' }], ['secreto CSRF corto', { SARIN_ADMIN_CSRF_SECRET: 'short' }],
]) test(`configuración ${name} nunca consulta Google`, async () => fixture(async fetched => {
  const { handleSarinAdmin } = await moduleUnderTest();
  assert.equal((await handleSarinAdmin(request(), { ...env(), ...changes }, { store: storeFixture() })).status, 503);
  assert.equal(fetched.length, 0);
}));

for (const [name, value] of [['service token', { sub: '', email: undefined }], ['Google verificado como texto', { email_verified: 'true' }], ['iat ausente', { iat: undefined }], ['nbf texto', { nbf: '0' }], ['aud objeto', { aud: { includes: true } }]]) test(`claims inválidos con firma real: ${name}`, async () => fixture(async () => {
  const { handleSarinAdmin } = await moduleUnderTest();
  assert.equal((await handleSarinAdmin(request(undefined, { token: jwt(value) }), env(), { store: storeFixture() })).status, 403);
}));

test('caída de JWKS falla cerrada sin exponer excepción', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('fixture-private-network'); };
  try {
    const { handleSarinAdmin } = await moduleUnderTest();
    const response = await handleSarinAdmin(request(), env(), { store: storeFixture() });
    assert.equal(response.status, 503); assert.ok(!(await response.text()).includes('fixture-private-network'));
  } finally { globalThis.fetch = original; }
});

test('sin binding D1 el admin no crea un store público', async () => fixture(async () => {
  const { handleSarinAdmin } = await moduleUnderTest(); const config = env(); delete config.SARIN_DB;
  assert.equal((await handleSarinAdmin(request(), config)).status, 503);
}));

// Regresión de configuración sobre comportamiento existente: no modifica producción.
test('administración habilitada funciona vacía con chat e historial apagados sin admitir sesiones públicas', async t => fixture(async fetched => {
  const database = await sqliteFixture({ history: true }); t.after(database.close);
  const { handleSarinAdmin } = await moduleUnderTest();
  const { handleSarinSession } = await import('../../server/sarin/sessions.js');
  const { NOTICE_VERSION, PRIVACY_VERSION, TERMS_VERSION } = await import('../../scripts/modules/sarin-consent.js');
  const config = { ...env(), SARIN_DB: database.db, SARIN_ADMIN_ENABLED: 'true',
    SARIN_ENABLED: 'false', SARIN_HISTORY_ENABLED: 'false', SARIN_IP_SECRET: 'fixture-ip-secret-with-at-least-32-characters' };
  // Sin clave de inferencia: el panel solo requiere identidad Firebase, CSRF y D1.
  const bootstrap = await handleSarinAdmin(request(), config);
  assert.equal(bootstrap.status, 200);
  assert.equal(bootstrap.headers.get('Cache-Control'), 'no-store');
  const body = await bootstrap.json();
  assert.equal(body.adminEmail, 'owner@example.test');
  assert.ok(body.csrfToken.length > 30);
  assert.deepEqual(body.purge, { lastRunAt: null, lastSuccessAt: null, lastErrorAt: null, status: 'never', remaining: false });
  const list = await handleSarinAdmin(request('/api/control-sarin/conversations'), config);
  assert.equal(list.status, 200);
  assert.deepEqual(await list.json(), { items: [], nextCursor: null });
  const session = await handleSarinSession(request('/api/sarin/session', { token: null, method: 'POST',
    headers: { Origin: 'https://alsdevstudio.com', 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1' },
    body: { lead: LEAD, consent: { accepted: true, noticeVersion: NOTICE_VERSION, privacyVersion: PRIVACY_VERSION, termsVersion: TERMS_VERSION } } }), config);
  assert.equal(session.status, 503);
  assert.equal(session.headers.has('Set-Cookie'), false);
  for (const table of ['sarin_conversations', 'sarin_consents', 'sarin_turns', 'sarin_messages', 'sarin_counters', 'sarin_reservations', 'sarin_admin_audit']) {
    assert.equal(database.sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, 0, table);
  }
  assert.ok(fetched.length > 0);
  assert.ok(fetched.every(url => url === JWKS_URL || url === LOOKUP_URL));
}));

test('API integra SQL real: lista paginada, detalle fiel, revisión, bloqueo 24h, desbloqueo y borrado', async t => fixture(async () => {
  const database = await sqliteFixture({ history: true }); t.after(database.close);
  const { createHistoryStore } = await import('../../server/sarin/history.js');
  const { handleSarinAdmin } = await moduleUnderTest();
  const clock = Date.now(); const config = { ...env(), SARIN_DB: database.db }; const options = { now: () => clock };
  const store = createHistoryStore({ db: database.db, now: () => clock });
  const consent = { noticeVersion: 'fixture-v1', privacyVersion: 'fixture-v1', termsVersion: 'fixture-v1', noticeHash: 'd'.repeat(64), method: 'checkbox_and_start' };
  const chats = [];
  for (let index = 0; index < 3; index++) chats.push(await store.createSession({ tokenHash: String(index + 1).repeat(64), identity: 'e'.repeat(64), consent, lead: LEAD }));
  const conversationId = chats[0].conversationId;
  await store.beginTurn({ tokenHash: '1'.repeat(64), requestId: id, message: 'Necesito una tienda. <script>fixture</script>' });
  await store.finishTurn({ tokenHash: '1'.repeat(64), requestId: id, body: { reply: 'Puedo orientar tu tienda.', service: 'store', examples: [], brief: {} }, outcome: 'completed', status: 200 });
  const first = await (await handleSarinAdmin(request('/api/control-sarin/conversations?limit=1'), config, options)).json();
  assert.equal(first.items.length, 1); assert.ok(first.nextCursor);
  assert.deepEqual(first.items[0].lead, LEAD);
  const nextResponse = await handleSarinAdmin(request(`/api/control-sarin/conversations?limit=2&cursor=${encodeURIComponent(first.nextCursor)}`), config, options);
  assert.equal(nextResponse.status, 200); const next = await nextResponse.json(); assert.equal(next.items.length, 2);
  const transcript = await (await handleSarinAdmin(request(`/api/control-sarin/conversations/${conversationId}`), config, options)).json();
  assert.deepEqual(transcript.lead, LEAD);
  assert.equal(transcript.messages[0].content, 'Necesito una tienda. <script>fixture</script>'); assert.equal(transcript.messages[1].content, 'Puedo orientar tu tienda.');
  assert.deepEqual(Object.keys(transcript.consent).sort(), ['acceptedAt', 'method', 'noticeHash', 'noticeVersion', 'privacyVersion', 'termsVersion'].sort());
  const csrfToken = (await (await handleSarinAdmin(request(), config, options)).json()).csrfToken;
  const mutate = action => handleSarinAdmin(request(`/api/control-sarin/conversations/${conversationId}`, { method: 'POST', headers: { Origin: 'https://alsdevstudio.com', 'Content-Type': 'application/json', 'X-Sarin-CSRF': csrfToken }, body: { action } }), config, options);
  for (const action of ['review', 'block']) assert.equal((await mutate(action)).status, 200);
  const blocked = await store.getConversation(conversationId); assert.equal(blocked.status, 'blocked'); assert.equal(blocked.reviewedAt, clock); assert.equal(blocked.blockedUntil, clock + 86400000);
  assert.equal((await mutate('unblock')).status, 200); assert.equal((await store.getConversation(conversationId)).blockedUntil, null);
  assert.equal((await mutate('delete')).status, 200);
  assert.equal((await handleSarinAdmin(request(`/api/control-sarin/conversations/${conversationId}`), config, options)).status, 404);
  const audits = database.sqlite.prepare('SELECT actor,action FROM sarin_admin_audit').all();
  assert.equal(audits.length, 4); for (const row of audits) assert.match(row.actor, /^[a-f0-9]{64}$/);
  assert.equal((await handleSarinAdmin(request('/api/control-sarin/conversations?cursor=aaa'), config, options)).status, 400);
}));

test('métodos, rutas y errores de DB no filtran datos ni ejecutan acciones', async () => fixture(async () => {
  const { handleSarinAdmin } = await moduleUnderTest(); const store = storeFixture();
  for (const method of ['PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']) assert.equal((await handleSarinAdmin(request(`/api/control-sarin/conversations/${id}`, { method }), env(), { store })).status, 405);
  for (const path of ['/api/control-sarin/unknown', '/api/control-sarin/conversations/no-uuid', `/api/control-sarin/conversations/${id}/extra`]) assert.equal((await handleSarinAdmin(request(path), env(), { store })).status, 404);
  store.listConversations = async () => { throw new Error('fixture-private-error-with-192.0.2.1'); };
  const response = await handleSarinAdmin(request('/api/control-sarin/conversations'), env(), { store });
  assert.equal(response.status, 503); assert.ok(!(await response.text()).includes('fixture-private'));
}));

async function privateChatFixture(t) {
  const database = await sqliteFixture({ history: true }); t.after(database.close);
  const { handleSarinAdmin } = await moduleUnderTest();
  const { NOTICE_VERSION, PRIVACY_VERSION, TERMS_VERSION } = await import('../../scripts/modules/sarin-consent.js');
  const clock = Date.now(), calls = [];
  const token = jwt({ exp: Math.floor(clock / 1000) + 3600 });
  const config = { ...env(), SARIN_DB: database.db, SARIN_PRIVATE_TEST_ENABLED: 'true', SARIN_ENABLED: 'false', SARIN_HISTORY_ENABLED: 'false',
    SARIN_IP_SECRET: 'fixture-private-ip-secret-at-least-32-characters', DEEPSEEK_API_KEY: 'fixture-private-api-key',
    SARIN_INPUT_PRICE_MICROS: '300000', SARIN_OUTPUT_PRICE_MICROS: '1200000', SARIN_DAILY_BUDGET_MICROS: '1000000', SARIN_MONTHLY_BUDGET_MICROS: '10000000' };
  const options = { now: () => clock, authFetch: globalThis.fetch, fetch: async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    assert.equal(url, 'https://api.deepseek.com/chat/completions');
    return Response.json({ choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: '{"inScope":false}' } }],
      usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 } });
  } };
  const bootstrap = await handleSarinAdmin(request(undefined, { token }), config, options);
  assert.equal(bootstrap.status, 200); const data = await bootstrap.json();
  const consent = { accepted: true, noticeVersion: NOTICE_VERSION, privacyVersion: PRIVACY_VERSION, termsVersion: TERMS_VERSION };
  const headers = { Origin: 'https://alsdevstudio.com', 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1', 'X-Sarin-CSRF': data.csrfToken };
  const post = (path, body, extra = {}) => handleSarinAdmin(request(path, { token, method: 'POST', body, headers, ...extra }), config, options);
  const empty = () => {
    for (const table of ['sarin_conversations','sarin_consents','sarin_turns','sarin_messages','sarin_counters','sarin_reservations']) assert.equal(database.sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, 0, table);
    assert.equal(calls.length, 0);
  };
  return { ...database, handleSarinAdmin, config, options, token, data, headers, consent, calls, post, empty, clock };
}

test('prueba privada anuncia disponibilidad y exige flag exacto antes de crear sesión o inferir', async t => fixture(async () => {
  const f = await privateChatFixture(t);
  assert.equal(f.data.privateTestEnabled, true);
  for (const flag of [undefined, 'false', false, true, 'TRUE']) {
    f.config.SARIN_PRIVATE_TEST_ENABLED = flag;
    const bootstrap = await f.handleSarinAdmin(request(undefined, { token: f.token }), f.config, f.options);
    assert.equal((await bootstrap.json()).privateTestEnabled, false);
    for (const [path, body] of [['session',{ consent: f.consent, lead: LEAD }],['message',{ message: 'Una tienda', requestId: id }]]) {
      const response = await f.post(`/api/control-sarin/test/${path}`, body);
      assert.equal(response.status, 503); assert.equal(response.headers.has('Set-Cookie'), false);
    }
  }
  f.empty();
}));

test('prueba privada del titular admite sesión y mensaje mayor que 256 bytes con cuotas reales sin activar público', async t => fixture(async () => {
  const f = await privateChatFixture(t);
  const session = await f.post('/api/control-sarin/test/session', { consent: f.consent, lead: LEAD });
  assert.equal(session.status, 200);
  const cookie = session.headers.get('Set-Cookie');
  assert.match(cookie, /^__Host-sarin-test-session=[a-f0-9]{64};/);
  for (const attribute of ['HttpOnly','Secure','SameSite=Strict','Path=/','Max-Age=86400']) assert.ok(cookie.includes(attribute));
  assert.equal(session.headers.get('Cache-Control'), 'no-store');
  assert.equal(session.headers.get('X-Robots-Tag'), 'noindex, nofollow, noarchive');
  const created = await session.json(), message = 'Una tienda ficticia. ' + 'a'.repeat(300);
  assert.equal(f.calls.length, 0);
  const response = await f.post('/api/control-sarin/test/message', { message, requestId: id }, { headers: { ...f.headers, Cookie: cookie.split(';')[0] } });
  assert.equal(response.status, 200); const body = await response.json();
  assert.equal(body.conversationId, created.conversationId); assert.equal(body.turn, 1);
  assert.equal(f.calls.length, 1); assert.deepEqual(JSON.parse(f.calls[0].body.messages[1].content), { message, history: [] });
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_messages').get().n, 2);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_reservations WHERE actual_micros > 0').get().n, 1);
  assert.equal(f.config.SARIN_ENABLED, 'false'); assert.equal(f.config.SARIN_HISTORY_ENABLED, 'false');
  const { handleSarinSession } = await import('../../server/sarin/sessions.js');
  const publicSession = await handleSarinSession(request('/api/sarin/session', { token: null, method: 'POST', headers: f.headers, body: { consent: f.consent, lead: LEAD } }), f.config, f.options);
  assert.equal(publicSession.status, 503); assert.equal(publicSession.headers.has('Set-Cookie'), false);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_conversations').get().n, 1);
}));

test('prueba privada nunca omite Firebase ni propietario aunque su flag esté activo', async t => fixture(async () => {
  const f = await privateChatFixture(t);
  for (const token of [null, 'fixture.false.jwt', jwt({ email: 'other@example.test' }), jwt({ exp: 1 })]) {
    for (const [path, body] of [['session',{ consent: f.consent, lead: LEAD }],['message',{ message: 'Una tienda', requestId: id }]]) {
      const response = await f.post(`/api/control-sarin/test/${path}`, body, { token });
      assert.equal(response.status, 403); assert.equal(response.headers.get('Cache-Control'), 'no-store');
      assert.equal(response.headers.has('Set-Cookie'), false);
    }
  }
  f.empty();
}));

test('prueba privada exige CSRF, origen, JSON y límites antes de persistir o llamar al proveedor', async t => fixture(async () => {
  const f = await privateChatFixture(t);
  for (const [headers, expected] of [[{ ...f.headers, 'X-Sarin-CSRF': '' },403],[{ ...f.headers, 'X-Sarin-CSRF': f.data.csrfToken + 'x' },403],
    [{ ...f.headers, Origin: 'https://evil.test' },403],[{ ...f.headers, 'Content-Type': 'text/plain' },400],
    [{ ...f.headers, 'Content-Encoding': 'gzip' },400],[{ ...f.headers, 'Content-Length': '16385' },413]]) {
    for (const [path, body] of [['session',{ consent: f.consent, lead: LEAD }],['message',{ message: 'Una tienda', requestId: id }]]) assert.equal((await f.post(`/api/control-sarin/test/${path}`, body, { headers })).status, expected);
  }
  for (const path of ['session','message']) {
    const response = await f.handleSarinAdmin(request(`/api/control-sarin/test/${path}`, { token: f.token }), f.config, f.options);
    assert.equal(response.status, 405); assert.equal(response.headers.get('Allow'), 'POST');
  }
  const expired = await f.handleSarinAdmin(request('/api/control-sarin/test/session', { token: f.token, method: 'POST', headers: f.headers, body: { consent: f.consent, lead: LEAD } }), f.config, { ...f.options, now: () => f.clock + 16 * 60000 });
  assert.equal(expired.status, 403);
  assert.equal((await f.post('/api/control-sarin/test/session', '{' + ' '.repeat(16384))).status, 413);
  f.empty();
}));

test('prueba privada y chat público rechazan cookies cruzadas aunque ambos motores internos estén habilitados', async t => fixture(async () => {
  const f = await privateChatFixture(t);
  const { handleSarinSession } = await import('../../server/sarin/sessions.js');
  const { handleSarin } = await import('../../server/sarin/handler.js');
  const privateSession = await f.post('/api/control-sarin/test/session', { consent: f.consent, lead: LEAD });
  assert.equal(privateSession.status, 200); const privateCookie = privateSession.headers.get('Set-Cookie').split(';')[0];
  const publicEnv = { ...f.config, SARIN_ENABLED: 'true', SARIN_HISTORY_ENABLED: 'true' };
  const publicSession = await handleSarinSession(request('/api/sarin/session', { token: null, method: 'POST', headers: f.headers, body: { consent: f.consent, lead: LEAD } }), publicEnv, f.options);
  assert.equal(publicSession.status, 200); const publicCookie = publicSession.headers.get('Set-Cookie').split(';')[0];
  assert.match(publicCookie, /^__Host-sarin-session=/);
  assert.equal((await f.post('/api/control-sarin/test/message', { message: 'Una tienda', requestId: id }, { headers: { ...f.headers, Cookie: publicCookie } })).status, 401);
  const publicMessage = await handleSarin(request('/api/sarin', { token: null, method: 'POST', headers: { ...f.headers, Cookie: privateCookie }, body: { message: 'Una tienda', requestId: id } }), publicEnv, f.options);
  assert.equal(publicMessage.status, 401); assert.equal(f.calls.length, 0);
  const renamedPrivateCookie = '__Host-sarin-session=' + privateCookie.slice(privateCookie.indexOf('=') + 1);
  const renamedPublicCookie = '__Host-sarin-test-session=' + publicCookie.slice(publicCookie.indexOf('=') + 1);
  assert.equal((await handleSarin(request('/api/sarin', { token: null, method: 'POST', headers: { ...f.headers, Cookie: renamedPrivateCookie }, body: { message: 'Una tienda', requestId: id } }), publicEnv, f.options)).status, 401);
  assert.equal((await f.post('/api/control-sarin/test/message', { message: 'Una tienda', requestId: id }, { headers: { ...f.headers, Cookie: renamedPublicCookie } })).status, 401);
  assert.equal(f.calls.length, 0);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_turns').get().n, 0);
}));

test('prueba privada mantiene contratos cerrados y no admite configuración desde URL o cuerpo', async t => fixture(async () => {
  const f = await privateChatFixture(t);
  for (const [path, body] of [['/api/control-sarin/test/session?sessionCookie=__Host-sarin-session',{ consent: f.consent, lead: LEAD }],
    ['/api/control-sarin/test/session',{ consent: f.consent, lead: LEAD, sessionCookie: '__Host-sarin-session' }],
    ['/api/control-sarin/test/message',{ message: 'Una tienda', requestId: id, history: [] }]]) assert.equal((await f.post(path, body)).status, 400);
  assert.equal((await f.post('/api/control-sarin/test/session', { consent: { ...f.consent, accepted: false }, lead: LEAD })).status, 403);
  f.empty();
}));

test('configuración de acceso Google pública no entrega identidad, secretos ni consultas al historial', async () => fixture(async fetched => {
  const { handleSarinAdmin } = await moduleUnderTest(); const store = storeFixture();
  const response = await handleSarinAdmin(request('/api/control-sarin/auth/config', { token: null }), env(), { store });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { firebase: { apiKey: 'fixture-firebase-public-key', authDomain: 'alsdevstudio.firebaseapp.com', projectId: 'alsdevstudio' } });
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.match(response.headers.get('X-Robots-Tag'), /noindex/);
  assert.deepEqual(store.calls, []); assert.deepEqual(fetched, []);
}));

test('entrada Google valida JWT y cuenta antes de emitir cookie HttpOnly y permite bootstrap sin bearer', async () => fixture(async () => {
  const { handleSarinAdmin } = await moduleUnderTest(); const store = storeFixture(); const token = jwt();
  const response = await handleSarinAdmin(request('/api/control-sarin/auth/session', { token: null, method: 'POST',
    headers: { Origin: 'https://alsdevstudio.com', 'Content-Type': 'application/json' }, body: { idToken: token } }), env(), { store });
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { ok: true });
  const cookie = response.headers.get('Set-Cookie'); assert.ok(cookie.startsWith(`__Host-sarin_admin=${token};`));
  for (const attribute of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/']) assert.ok(cookie.includes(attribute));
  assert.equal(/Domain=/i.test(cookie), false);
  const maxAge = Number(/Max-Age=(\d+)/.exec(cookie)?.[1]); assert.ok(maxAge > 0 && maxAge <= 600);
  assert.deepEqual(store.calls, []);
  const bootstrap = await handleSarinAdmin(request(undefined, { token: null, headers: { Cookie: cookie.split(';')[0] } }), env(), { store });
  assert.equal(bootstrap.status, 200); assert.equal((await bootstrap.json()).adminEmail, 'owner@example.test');
}));

test('renovación admite token nuevo con auth_time reciente pero no extiende autenticación mayor de seis horas', async () => fixture(async () => {
  const { handleSarinAdmin } = await moduleUnderTest(); const clock = Date.now(); const seconds = Math.floor(clock / 1000);
  const headers = { Origin: 'https://alsdevstudio.com', 'Content-Type': 'application/json' };
  const send = token => handleSarinAdmin(request('/api/control-sarin/auth/session', { token: null, method: 'POST', headers, body: { idToken: token } }), env(), { now: () => clock });
  for (const iat of [seconds - 120, seconds]) {
    const response = await send(jwt({ iat, auth_time: seconds - 300, exp: seconds + 3600 }));
    assert.equal(response.status, 200); assert.ok(response.headers.has('Set-Cookie'));
  }
  const stale = await send(jwt({ iat: seconds, auth_time: seconds - 21601, exp: seconds + 3600 }));
  assert.equal(stale.status, 403); assert.equal(stale.headers.has('Set-Cookie'), false);
}));

for (const [name, options, expected] of [
  ['origen ajeno', { headers: { Origin: 'https://evil.test', 'Content-Type': 'application/json' }, body: { idToken: jwt() } }, 403],
  ['sin origen', { headers: { 'Content-Type': 'application/json' }, body: { idToken: jwt() } }, 403],
  ['tipo incorrecto', { headers: { Origin: 'https://alsdevstudio.com', 'Content-Type': 'text/plain' }, body: { idToken: jwt() } }, 400],
  ['JSON roto', { body: '{' }, 400], ['campo ajeno', { body: { idToken: jwt(), uid: 'fixture-owner' } }, 400],
  ['token ausente', { body: {} }, 400], ['JWT falso', { body: { idToken: 'fixture.false.jwt' } }, 403],
  ['cuerpo demasiado grande', { body: '{' + ' '.repeat(16384) }, 413],
  ['codificación ajena', { headers: { Origin: 'https://alsdevstudio.com', 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' }, body: { idToken: jwt() } }, 400],
]) test(`entrada Google rechaza ${name} sin crear cookie ni tocar historial`, async () => fixture(async () => {
  const { handleSarinAdmin } = await moduleUnderTest(); const store = storeFixture();
  const response = await handleSarinAdmin(request('/api/control-sarin/auth/session', { token: null, method: 'POST',
    headers: { Origin: 'https://alsdevstudio.com', 'Content-Type': 'application/json' }, ...options }), env(), { store });
  assert.equal(response.status, expected); assert.equal(response.headers.has('Set-Cookie'), false); assert.deepEqual(store.calls, []);
}));

test('salida borra cookie con sesión ausente o inválida aun si la administración no está configurada', async () => fixture(async fetched => {
  const { handleSarinAdmin } = await moduleUnderTest();
  for (const token of [null, 'fixture.false.jwt']) {
    const response = await handleSarinAdmin(request('/api/control-sarin/auth/logout', { token, method: 'POST',
      headers: { Origin: 'https://alsdevstudio.com', 'Content-Type': 'application/json' }, body: {} }), {});
    assert.equal(response.status, 200); assert.deepEqual(await response.json(), { ok: true });
    const cookie = response.headers.get('Set-Cookie'); assert.match(cookie, /^__Host-sarin_admin=;/); assert.match(cookie, /Max-Age=0/);
    for (const attribute of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/']) assert.ok(cookie.includes(attribute));
  }
  assert.deepEqual(fetched, []);
}));

test('salida exige origen propio y cuerpo cerrado sin exigir que el token siga válido', async () => fixture(async () => {
  const { handleSarinAdmin } = await moduleUnderTest();
  for (const [headers, body, expected] of [
    [{ Origin: 'https://evil.test', 'Content-Type': 'application/json' }, {}, 403],
    [{ 'Content-Type': 'application/json' }, {}, 403],
    [{ Origin: 'https://alsdevstudio.com', 'Content-Type': 'application/json' }, { extra: true }, 400],
    [{ Origin: 'https://alsdevstudio.com', 'Content-Type': 'application/json' }, '{' + ' '.repeat(256), 413],
  ]) {
    const response = await handleSarinAdmin(request('/api/control-sarin/auth/logout', { token: null, method: 'POST', headers, body }), {});
    assert.equal(response.status, expected); assert.equal(response.headers.has('Set-Cookie'), false);
  }
}));

test('endpoints de autenticación rechazan métodos ajenos y parámetros no previstos', async () => fixture(async () => {
  const { handleSarinAdmin } = await moduleUnderTest();
  for (const [path, method] of [['config', 'POST'], ['session', 'GET'], ['logout', 'GET']]) {
    const response = await handleSarinAdmin(request(`/api/control-sarin/auth/${path}`, { token: null, method }), env());
    assert.equal(response.status, 405); assert.equal(response.headers.has('Set-Cookie'), false);
  }
  for (const [path, body] of [['config', undefined], ['session', { idToken: jwt() }], ['logout', {}]]) {
    const response = await handleSarinAdmin(request(`/api/control-sarin/auth/${path}?uid=another-owner`, { token: null,
      method: path === 'config' ? 'GET' : 'POST', headers: { Origin: 'https://alsdevstudio.com', 'Content-Type': 'application/json' }, body }), env());
    assert.equal(response.status, 400); assert.equal(response.headers.has('Set-Cookie'), false);
  }
}));

test('cabeceras Access o bearer nunca sustituyen la cookie Firebase del administrador en ningún dominio', async () => fixture(async () => {
  const { handleSarinAdmin } = await moduleUnderTest(); const store = storeFixture();
  for (const origin of ['https://alsdevstudio.com', 'https://www.alsdevstudio.com', 'https://fixture.alsdevstudio.pages.dev']) {
    const response = await handleSarinAdmin(request(undefined, { token: null, origin, headers: { 'Cf-Access-Jwt-Assertion': jwt(),
      'Cf-Access-Authenticated-User-Email': 'owner@example.test', Authorization: `Bearer ${jwt()}` } }), env(), { store });
    assert.equal(response.status, 403);
  }
  assert.deepEqual(store.calls, []);
}));

test('cookie administrativa rechaza duplicados, nombres parecidos y valores demasiado grandes', async () => fixture(async () => {
  const { handleSarinAdmin } = await moduleUnderTest(); const store = storeFixture(); const token = jwt();
  for (const cookie of [`__Host-sarin_admin=${token}; __Host-sarin_admin=${token}`, `sarin_admin=${token}`, `__Host-sarin_admin=${'a'.repeat(3801)}`]) {
    const response = await handleSarinAdmin(request(undefined, { token: null, headers: { Cookie: cookie } }), env(), { store });
    assert.equal(response.status, 403);
  }
  assert.deepEqual(store.calls, []);
}));

for (const [name, user] of [
  ['deshabilitada', account({ disabled: true })], ['disabled malformado', account({ disabled: 'false' })],
  ['UID diferente', account({ localId: 'another-owner' })], ['correo diferente', account({ email: 'other@example.test' })],
  ['correo sin verificar', account({ emailVerified: false })], ['verificación de correo ausente', account({ emailVerified: undefined })],
  ['validSince malformado', account({ validSince: 'invalid' })],
  ['sesión revocada', () => account({ validSince: String(Math.floor(Date.now() / 1000)) })],
]) test(`estado Firebase ${name} cierra antes de consultar historial`, async () => fixture(async () => {
  const { handleSarinAdmin } = await moduleUnderTest(); const store = storeFixture();
  const response = await handleSarinAdmin(request(), env(), { store, authFetch: googleFetch({ user: typeof user === 'function' ? user() : user }) });
  assert.equal(response.status, 403); assert.deepEqual(store.calls, []); assert.equal(response.headers.has('Set-Cookie'), false);
}));

test('lookup permite disabled y validSince omitidos y vuelve a comprobar revocación en cada consulta', async () => fixture(async () => {
  const { handleSarinAdmin } = await moduleUnderTest(); const store = storeFixture();
  let lookupCount = 0;
  const user = account(); delete user.disabled;
  const authFetch = googleFetch({ lookup: async () => { lookupCount++; return Response.json({ users: [{ ...user, ...(lookupCount > 1 ? { disabled: true } : {}) }] }); } });
  const options = { store, authFetch };
  assert.equal((await handleSarinAdmin(request(), env(), options)).status, 200);
  assert.equal((await handleSarinAdmin(request('/api/control-sarin/conversations'), env(), options)).status, 403);
  assert.equal(lookupCount, 2); assert.deepEqual(store.calls, []);
}));

test('revocación compara auth_time y no acepta renovación con iat posterior al cierre de sesiones', async () => fixture(async () => {
  const { handleSarinAdmin } = await moduleUnderTest(); const store = storeFixture();
  const seconds = Math.floor(Date.now() / 1000); const authFetch = googleFetch({ user: account({ validSince: String(seconds - 60) }) });
  const refreshed = jwt({ auth_time: seconds - 120, iat: seconds, exp: seconds + 3600 });
  assert.equal((await handleSarinAdmin(request(undefined, { token: refreshed }), env(), { store, authFetch })).status, 403);
  const signedInAgain = jwt({ auth_time: seconds - 30, iat: seconds, exp: seconds + 3600 });
  assert.equal((await handleSarinAdmin(request(undefined, { token: signedInAgain }), env(), { store, authFetch })).status, 200);
  assert.deepEqual(store.calls, []);
}));

// La indisponibilidad es reintentable; una identidad inválida sigue siendo 403.
for (const [name, lookup, expected] of [
  ['sin cuenta', () => Response.json({ users: [] }), 403], ['cuerpo malformado', () => Response.json({ users: 'not-an-array' }), 403],
  ['JSON roto', () => new Response('{', { headers: { 'Content-Type': 'application/json' } }), 503],
  ['servicio caído', () => Response.json({ error: { message: 'fixture-private-error' } }, { status: 503 }), 503],
  ['respuesta excesiva', () => new Response(' '.repeat(65537), { headers: { 'Content-Type': 'application/json' } }), 503],
  ['error de transporte', () => { throw new Error('fixture-private-network'); }, 503],
]) test(`lookup ${name} falla cerrado y no filtra errores ni mensajes`, async () => fixture(async () => {
  const { handleSarinAdmin } = await moduleUnderTest(); const store = storeFixture();
  const response = await handleSarinAdmin(request(), env(), { store, authFetch: googleFetch({ lookup }) });
  assert.equal(response.status, expected); assert.deepEqual(store.calls, []); assert.ok(!(await response.text()).includes('fixture-private'));
}));

test('lookup con timeout cancela la petición y falla cerrado antes de consultar historial', { timeout: 15000 }, async () => fixture(async () => {
  const { handleSarinAdmin } = await moduleUnderTest(); const store = storeFixture(); let aborted = false;
  const authFetch = googleFetch({ lookup: options => new Promise((resolve, reject) => {
    const stop = () => { aborted = true; reject(new DOMException('fixture-private-timeout', 'AbortError')); };
    if (options.signal?.aborted) stop(); else options.signal?.addEventListener('abort', stop, { once: true });
  }) });
  const response = await handleSarinAdmin(request(), env(), { store, authFetch });
  assert.equal(response.status, 503); assert.equal(aborted, true); assert.deepEqual(store.calls, []);
  assert.ok(!(await response.text()).includes('fixture-private'));
}));

test('rotación JWKS respeta cooldown, recarga una vez por kid desconocido y no recarga por firma inválida', async () => fixture(async fetched => {
  const { handleSarinAdmin } = await moduleUnderTest(); const store = storeFixture();
  const rotatedPair = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const rotatedJwk = { ...rotatedPair.publicKey.export({ format: 'jwk' }), kid: 'fixture-rotated-key', alg: 'RS256', use: 'sig' };
  const start = Math.floor(Date.now() / 1000);
  const claims = { iat: start - 5, auth_time: start - 5, nbf: start - 5, exp: start + 600 };
  let clock = start, published = [publicJwk], downloads = 0, lookups = 0;
  const authFetch = async (url, options) => {
    if (String(url) === JWKS_URL) {
      downloads++;
      return Response.json({ keys: published }, { headers: { 'Cache-Control': 'public, max-age=300' } });
    }
    assert.equal(String(url), LOOKUP_URL, 'ninguna red remota');
    assert.equal(options.method, 'POST'); lookups++;
    return Response.json({ users: [account()] });
  };
  const bootstrap = token => handleSarinAdmin(request(undefined, { token }), env(), { store, authFetch, now: () => clock * 1000 });
  assert.equal((await bootstrap(jwt(claims))).status, 200); assert.equal(downloads, 1); assert.equal(lookups, 1);

  published = [rotatedJwk];
  const rotatedToken = jwt(claims, { kid: rotatedJwk.kid, key: rotatedPair.privateKey });
  clock = start + 29;
  assert.equal((await bootstrap(rotatedToken)).status, 403); assert.equal(downloads, 1); assert.equal(lookups, 1);
  clock = start + 30;
  assert.equal((await bootstrap(rotatedToken)).status, 200); assert.equal(downloads, 2); assert.equal(lookups, 2);

  // Tras el cooldown, una firma incorrecta con kid conocido sigue sin provocar red adicional.
  clock = start + 61;
  assert.equal((await bootstrap(jwt(claims, { kid: rotatedJwk.kid }))).status, 403);
  assert.equal(downloads, 2); assert.equal(lookups, 2);
  const missingToken = jwt(claims, { kid: 'fixture-unpublished-key', key: rotatedPair.privateKey });
  assert.equal((await bootstrap(missingToken)).status, 403); assert.equal(downloads, 3);
  // La nueva descarga no contiene ese kid: se rechaza sin bucle y reinicia el cooldown.
  assert.equal((await bootstrap(missingToken)).status, 403); assert.equal(downloads, 3); assert.equal(lookups, 2);
  assert.deepEqual(store.calls, []); assert.deepEqual(fetched, []);
}));

test('fetch nativo de autenticación conserva globalThis y reutiliza la caché JWKS entre peticiones', async () => fixture(async () => {
  const { handleSarinAdmin } = await moduleUnderTest(); const store = storeFixture();
  const delegate = googleFetch(), calls = [];
  globalThis.fetch = async function (url, options) {
    assert.equal(this, globalThis, 'el fetch del runtime exige su receptor global');
    calls.push(String(url)); return delegate(url, options);
  };
  for (let index = 0; index < 2; index++) {
    const response = await handleSarinAdmin(request(), env(), { store });
    assert.equal(response.status, 200);
  }
  assert.equal(calls.filter(url => url === JWKS_URL).length, 1);
  assert.equal(calls.filter(url => url === LOOKUP_URL).length, 2);
  assert.deepEqual(store.calls, []);
}));

test('authFetch inyectado conserva this indefinido y no pasa por fetch global', async () => fixture(async fetched => {
  const { handleSarinAdmin } = await moduleUnderTest(); const store = storeFixture();
  const delegate = googleFetch(), calls = [];
  const authFetch = async function (url, options) {
    assert.equal(this, undefined, 'la dependencia interna se invoca sin receptor');
    calls.push(String(url)); return delegate(url, options);
  };
  for (let index = 0; index < 2; index++) {
    const response = await handleSarinAdmin(request(), env(), { store, authFetch });
    assert.equal(response.status, 200);
  }
  assert.equal(calls.filter(url => url === JWKS_URL).length, 1);
  assert.equal(calls.filter(url => url === LOOKUP_URL).length, 2);
  assert.deepEqual(store.calls, []); assert.deepEqual(fetched, []);
}));

test('transporte Firebase admite runtime que rechaza redirect error antes de I/O', async () => fixture(async () => {
  const { handleSarinAdmin } = await moduleUnderTest(); const store = storeFixture();
  const delegate = googleFetch(), calls = [];
  const authFetch = async (url, init) => {
    if (init.redirect === 'error') throw new TypeError('Unsupported redirect mode');
    assert.equal(init.redirect, 'manual'); calls.push(String(url));
    return delegate(url, init);
  };
  const response = await handleSarinAdmin(request(), env(), { store, authFetch });
  assert.equal(response.status, 200); assert.deepEqual(calls, [JWKS_URL, LOOKUP_URL]);
  assert.deepEqual(store.calls, []);
}));

test('firma Firebase ajena sigue siendo 403 en runtime sin redirect error y no consulta la cuenta', async () => fixture(async () => {
  const { handleSarinAdmin } = await moduleUnderTest(); const store = storeFixture();
  const otherPair = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const delegate = googleFetch(), calls = [];
  const authFetch = async (url, init) => {
    if (init.redirect === 'error') throw new TypeError('Unsupported redirect mode');
    assert.equal(init.redirect, 'manual'); calls.push(String(url)); return delegate(url, init);
  };
  const response = await handleSarinAdmin(request(undefined, { token: jwt({}, { key: otherPair.privateKey }) }), env(), { store, authFetch });
  assert.equal(response.status, 403); assert.deepEqual(calls, [JWKS_URL]);
  assert.equal(response.headers.has('Set-Cookie'), false); assert.deepEqual(store.calls, []);
}));

for (const endpoint of ['jwks', 'lookup']) test(`redirección Firebase ${endpoint} se rechaza sin seguir Location ni emitir cookie`, async () => fixture(async () => {
  const { handleSarinAdmin } = await moduleUnderTest(); const store = storeFixture();
  const delegate = googleFetch(), calls = [];
  const authFetch = async (url, init) => {
    assert.equal(init.redirect, 'manual'); calls.push(String(url));
    if ((endpoint === 'jwks' && String(url) === JWKS_URL) || (endpoint === 'lookup' && String(url) === LOOKUP_URL)) {
      return new Response('', { status: 307, headers: { Location: 'https://unapproved.invalid/' } });
    }
    return delegate(url, init);
  };
  const response = await handleSarinAdmin(request(), env(), { store, authFetch });
  assert.equal(response.status, 503); assert.deepEqual(calls, endpoint === 'jwks' ? [JWKS_URL] : [JWKS_URL, LOOKUP_URL]);
  assert.equal(response.headers.has('Set-Cookie'), false); assert.deepEqual(store.calls, []);
}));
