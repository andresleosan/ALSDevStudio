import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { sqliteFixture } from './sarin-sqlite-fixture.mjs';

// Claves efímeras y datos sintéticos: nunca contacta Access ni una cuenta real.
const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicJwk = { ...pair.publicKey.export({ format: 'jwk' }), kid: 'fixture-key', alg: 'RS256', use: 'sig' };
const env = () => ({
  SARIN_ADMIN_ENABLED: 'true', SARIN_ACCESS_DOMAIN: 'https://fixture.cloudflareaccess.com',
  SARIN_ACCESS_AUD: 'fixture-admin-audience', SARIN_ADMIN_EMAIL: 'owner@example.test',
  SARIN_ADMIN_CSRF_SECRET: 'fixture-csrf-secret-with-at-least-32-characters', SARIN_DB: { prepare() {} },
});
const id = '89a256b7-53ac-49ce-8ab8-4645c22952ff';
function jwt(overrides = {}, { alg = 'RS256', key = pair.privateKey } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const claims = { iss: env().SARIN_ACCESS_DOMAIN, aud: [env().SARIN_ACCESS_AUD], exp: now + 600, iat: now - 5, nbf: now - 5, email: 'owner@example.test', sub: 'fixture-owner', type: 'app', ...overrides };
  for (const name of Object.keys(claims)) if (claims[name] === undefined) delete claims[name];
  const input = `${Buffer.from(JSON.stringify({ alg, kid: 'fixture-key' })).toString('base64url')}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}`;
  return `${input}.${sign('RSA-SHA256', Buffer.from(input), key).toString('base64url')}`;
}
function request(path = '/api/control-sarin/bootstrap', { token = jwt(), headers = {}, method = 'GET', body, origin = 'https://alsdevstudio.com' } = {}) {
  return new Request(`${origin}${path}`, { method, headers: { ...(token ? { 'Cf-Access-Jwt-Assertion': token } : {}), ...headers }, ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }) });
}
async function fixture(run) {
  const original = globalThis.fetch;
  const fetched = [];
  globalThis.fetch = async url => {
    fetched.push(String(url));
    assert.equal(String(url), 'https://fixture.cloudflareaccess.com/cdn-cgi/access/certs', 'ninguna red remota');
    return Response.json({ keys: [publicJwk] });
  };
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

test('bootstrap privado usa el plugin real y entrega CSRF sin caché', async () => fixture(async fetched => {
  const { handleSarinAdmin } = await moduleUnderTest();
  const response = await handleSarinAdmin(request(), env(), { store: storeFixture() });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.adminEmail, 'owner@example.test');
  assert.ok(data.csrfToken.length > 30);
  assert.equal(data.purge.status, 'never');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow, noarchive');
  assert.equal(fetched.length, 1);
}));

for (const [name, token] of [
  ['ausente', null], ['falso', 'fixture.false.jwt'], ['firma ajena', jwt({}, { key: generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey })],
  ['algoritmo ajeno', jwt({}, { alg: 'HS256' })], ['vencido', jwt({ exp: 1 })], ['exp ausente', jwt({ exp: undefined })],
  ['aud ajena', jwt({ aud: ['another-audience'] })], ['aud substring', jwt({ aud: 'prefix-fixture-admin-audience-suffix' })], ['aud ausente', jwt({ aud: undefined })],
  ['iss ajeno', jwt({ iss: 'https://other.cloudflareaccess.com' })], ['iss ausente', jwt({ iss: undefined })],
  ['otro propietario', jwt({ email: 'other@example.test' })], ['email ausente', jwt({ email: undefined })], ['sub vacío', jwt({ sub: '' })],
  ['exp texto', jwt({ exp: String(Math.floor(Date.now() / 1000) + 600) })], ['iat futuro', jwt({ iat: Math.floor(Date.now() / 1000) + 120 })], ['nbf futuro', jwt({ nbf: Math.floor(Date.now() / 1000) + 120 })],
]) test(`Access rechaza JWT ${name}`, async () => fixture(async () => {
  const { handleSarinAdmin } = await moduleUnderTest();
  const store = storeFixture();
  const response = await handleSarinAdmin(request(undefined, { token }), env(), { store });
  assert.equal(response.status, 403);
  assert.equal(response.headers.has('Location'), false);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(store.calls, []);
}));

for (const name of ['SARIN_ADMIN_ENABLED', 'SARIN_ACCESS_DOMAIN', 'SARIN_ACCESS_AUD', 'SARIN_ADMIN_EMAIL', 'SARIN_ADMIN_CSRF_SECRET']) test(`configuración ausente ${name} cierra antes de red`, async () => fixture(async fetched => {
  const { handleSarinAdmin } = await moduleUnderTest();
  const config = env(); delete config[name];
  assert.equal((await handleSarinAdmin(request(), config, { store: storeFixture() })).status, 503);
  assert.equal(fetched.length, 0);
}));

test('pages.dev y HTML alternativo exigen JWT; nunca confían en email de cabecera', async () => fixture(async () => {
  const { protectSarinAdmin } = await import('../../server/sarin/access.js');
  for (const path of ['/control-sarin', '/control-sarin/', '/control-sarin/index.html', '/control-sarin/extra']) {
    let delivered = false;
    const context = { request: request(path, { origin: 'https://fixture.pages.dev', token: null, headers: { 'Cf-Access-Authenticated-User-Email': 'owner@example.test' } }), env: env(), data: {}, functionPath: '/control-sarin', waitUntil() {}, passThroughOnException() {}, next: async () => { delivered = true; return new Response('private fixture'); } };
    const response = await protectSarinAdmin(context);
    assert.equal(response.status, 403); assert.equal(delivered, false);
  }
}));

test('HTML autorizado conserva CSP funcional pero añade cabeceras privadas', async () => fixture(async () => {
  const { protectSarinAdmin } = await import('../../server/sarin/access.js');
  const response = await protectSarinAdmin({ request: request('/control-sarin/'), env: env(), data: {}, functionPath: '/control-sarin', waitUntil() {}, passThroughOnException() {}, next: async () => new Response('<html>fixture</html>', { headers: { 'Content-Security-Policy': "default-src 'self'" } }) });
  assert.equal(response.status, 200); assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Content-Security-Policy'), "default-src 'self'");
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
  assert.equal((await handleSarinAdmin(request(`/api/control-sarin/conversations/${id}`, { ...options, token: jwt({ sub: 'another-sub' }) }), env(), { store })).status, 403);
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
  ['apagada', { SARIN_ADMIN_ENABLED: 'false' }], ['dominio arbitrario', { SARIN_ACCESS_DOMAIN: 'https://evil.test' }],
  ['ruta en dominio', { SARIN_ACCESS_DOMAIN: 'https://fixture.cloudflareaccess.com/path' }], ['secreto CSRF corto', { SARIN_ADMIN_CSRF_SECRET: 'short' }],
]) test(`configuración ${name} nunca consulta Access`, async () => fixture(async fetched => {
  const { handleSarinAdmin } = await moduleUnderTest();
  assert.equal((await handleSarinAdmin(request(), { ...env(), ...changes }, { store: storeFixture() })).status, 503);
  assert.equal(fetched.length, 0);
}));

for (const [name, value] of [['service token', { sub: '', email: undefined }], ['tipo service', { type: 'service' }], ['iat ausente', { iat: undefined }], ['nbf texto', { nbf: '0' }], ['aud objeto', { aud: { includes: true } }]]) test(`claims inválidos con firma real: ${name}`, async () => fixture(async () => {
  const { handleSarinAdmin } = await moduleUnderTest();
  assert.equal((await handleSarinAdmin(request(undefined, { token: jwt(value) }), env(), { store: storeFixture() })).status, 403);
}));

test('caída de JWKS falla cerrada sin exponer excepción', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('fixture-private-network'); };
  try {
    const { handleSarinAdmin } = await moduleUnderTest();
    const response = await handleSarinAdmin(request(), env(), { store: storeFixture() });
    assert.equal(response.status, 403); assert.ok(!(await response.text()).includes('fixture-private-network'));
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
  // Sin clave de inferencia: el panel solo requiere identidad Access, CSRF y D1.
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
    body: { consent: { accepted: true, noticeVersion: NOTICE_VERSION, privacyVersion: PRIVACY_VERSION, termsVersion: TERMS_VERSION } } }), config);
  assert.equal(session.status, 503);
  assert.equal(session.headers.has('Set-Cookie'), false);
  for (const table of ['sarin_conversations', 'sarin_consents', 'sarin_turns', 'sarin_messages', 'sarin_counters', 'sarin_reservations', 'sarin_admin_audit']) {
    assert.equal(database.sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, 0, table);
  }
  assert.ok(fetched.length > 0);
  assert.ok(fetched.every(url => url === 'https://fixture.cloudflareaccess.com/cdn-cgi/access/certs'));
}));

test('API integra SQL real: lista paginada, detalle fiel, revisión, bloqueo 24h, desbloqueo y borrado', async t => fixture(async () => {
  const database = await sqliteFixture({ history: true }); t.after(database.close);
  const { createHistoryStore } = await import('../../server/sarin/history.js');
  const { handleSarinAdmin } = await moduleUnderTest();
  const clock = Date.now(); const config = { ...env(), SARIN_DB: database.db }; const options = { now: () => clock };
  const store = createHistoryStore({ db: database.db, now: () => clock });
  const consent = { noticeVersion: 'fixture-v1', privacyVersion: 'fixture-v1', termsVersion: 'fixture-v1', noticeHash: 'd'.repeat(64), method: 'checkbox_and_start' };
  const chats = [];
  for (let index = 0; index < 3; index++) chats.push(await store.createSession({ tokenHash: String(index + 1).repeat(64), identity: 'e'.repeat(64), consent }));
  const conversationId = chats[0].conversationId;
  await store.beginTurn({ tokenHash: '1'.repeat(64), requestId: id, message: 'Necesito una tienda. <script>fixture</script>' });
  await store.finishTurn({ tokenHash: '1'.repeat(64), requestId: id, body: { reply: 'Puedo orientar tu tienda.', service: 'store', examples: [], brief: {} }, outcome: 'completed', status: 200 });
  const first = await (await handleSarinAdmin(request('/api/control-sarin/conversations?limit=1'), config, options)).json();
  assert.equal(first.items.length, 1); assert.ok(first.nextCursor);
  const nextResponse = await handleSarinAdmin(request(`/api/control-sarin/conversations?limit=2&cursor=${encodeURIComponent(first.nextCursor)}`), config, options);
  assert.equal(nextResponse.status, 200); const next = await nextResponse.json(); assert.equal(next.items.length, 2);
  const transcript = await (await handleSarinAdmin(request(`/api/control-sarin/conversations/${conversationId}`), config, options)).json();
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
  const options = { now: () => clock, fetch: async (url, init) => {
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
    for (const [path, body] of [['session',{ consent: f.consent }],['message',{ message: 'Una tienda', requestId: id }]]) {
      const response = await f.post(`/api/control-sarin/test/${path}`, body);
      assert.equal(response.status, 503); assert.equal(response.headers.has('Set-Cookie'), false);
    }
  }
  f.empty();
}));

test('prueba privada del titular admite sesión y mensaje mayor que 256 bytes con cuotas reales sin activar público', async t => fixture(async () => {
  const f = await privateChatFixture(t);
  const session = await f.post('/api/control-sarin/test/session', { consent: f.consent });
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
  const publicSession = await handleSarinSession(request('/api/sarin/session', { token: null, method: 'POST', headers: f.headers, body: { consent: f.consent } }), f.config, f.options);
  assert.equal(publicSession.status, 503); assert.equal(publicSession.headers.has('Set-Cookie'), false);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_conversations').get().n, 1);
}));

test('prueba privada nunca omite Access ni propietario aunque su flag esté activo', async t => fixture(async () => {
  const f = await privateChatFixture(t);
  for (const token of [null, 'fixture.false.jwt', jwt({ email: 'other@example.test' }), jwt({ exp: 1 })]) {
    for (const [path, body] of [['session',{ consent: f.consent }],['message',{ message: 'Una tienda', requestId: id }]]) {
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
    for (const [path, body] of [['session',{ consent: f.consent }],['message',{ message: 'Una tienda', requestId: id }]]) assert.equal((await f.post(`/api/control-sarin/test/${path}`, body, { headers })).status, expected);
  }
  for (const path of ['session','message']) {
    const response = await f.handleSarinAdmin(request(`/api/control-sarin/test/${path}`, { token: f.token }), f.config, f.options);
    assert.equal(response.status, 405); assert.equal(response.headers.get('Allow'), 'POST');
  }
  const expired = await f.handleSarinAdmin(request('/api/control-sarin/test/session', { token: f.token, method: 'POST', headers: f.headers, body: { consent: f.consent } }), f.config, { ...f.options, now: () => f.clock + 16 * 60000 });
  assert.equal(expired.status, 403);
  assert.equal((await f.post('/api/control-sarin/test/session', '{' + ' '.repeat(16384))).status, 413);
  f.empty();
}));

test('prueba privada y chat público rechazan cookies cruzadas aunque ambos motores internos estén habilitados', async t => fixture(async () => {
  const f = await privateChatFixture(t);
  const { handleSarinSession } = await import('../../server/sarin/sessions.js');
  const { handleSarin } = await import('../../server/sarin/handler.js');
  const privateSession = await f.post('/api/control-sarin/test/session', { consent: f.consent });
  assert.equal(privateSession.status, 200); const privateCookie = privateSession.headers.get('Set-Cookie').split(';')[0];
  const publicEnv = { ...f.config, SARIN_ENABLED: 'true', SARIN_HISTORY_ENABLED: 'true' };
  const publicSession = await handleSarinSession(request('/api/sarin/session', { token: null, method: 'POST', headers: f.headers, body: { consent: f.consent } }), publicEnv, f.options);
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
  for (const [path, body] of [['/api/control-sarin/test/session?sessionCookie=__Host-sarin-session',{ consent: f.consent }],
    ['/api/control-sarin/test/session',{ consent: f.consent, sessionCookie: '__Host-sarin-session' }],
    ['/api/control-sarin/test/message',{ message: 'Una tienda', requestId: id, history: [] }]]) assert.equal((await f.post(path, body)).status, 400);
  assert.equal((await f.post('/api/control-sarin/test/session', { consent: { ...f.consent, accepted: false } })).status, 403);
  f.empty();
}));
