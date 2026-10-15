import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApi } from '../src/api.mjs';

const origin = 'http://127.0.0.1:8788';
const owner = { uid: 'owner-uid-123', email: 'andres.san1404@gmail.com' };
const envelope = { requestId: 'request-12345678', action: 'subject.create', payload: { kind: 'person', name: 'Persona de prueba', email: 'test@example.com' } };
function setup(extra = {}) {
  const calls = [];
  const handler = createApi({
    config: { environment: 'demo', allowedOrigins: [origin], maxRequestsPerMinute: 120, ...extra },
    verifyToken: async value => {
      if (value !== 'valid-token') throw Object.assign(new Error('Sesion invalida'), { name: 'AuthError', status: 401, code: 'unauthenticated' });
      return owner;
    },
    service: {
      getState: async admin => ({ products: [], subjects: [], admin, payments: [], subscriptions: [], auditEvents: [], commands: [], serverTime: new Date().toISOString() }),
      execute: async (command, admin) => { calls.push({ command, admin }); return { result: { id: 'subject-created' } }; },
    },
  });
  return { handler, calls };
}
function request(path = '/api/state', options = {}) {
  const { headers = {}, ...rest } = options;
  return new Request(`${origin}${path}`, { headers: { authorization: 'Bearer valid-token', origin, ...headers }, ...rest });
}

test('snapshot requiere sesion y entrega cabeceras privadas', async () => {
  const { handler } = setup();
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).admin.uid, owner.uid);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
  const missing = await handler(new Request(`${origin}/api/state`));
  assert.equal(missing.status, 401);
});

test('no ejecuta mutaciones cuando el token es invalido', async () => {
  const { handler, calls } = setup();
  const response = await handler(request('/api/commands', { method: 'POST', headers: { authorization: 'Bearer invalid', 'content-type': 'application/json' }, body: JSON.stringify(envelope) }));
  assert.equal(response.status, 401);
  assert.equal(calls.length, 0);
});

test('transporta la accion con el actor verificado, no con datos del navegador', async () => {
  const { handler, calls } = setup();
  const response = await handler(request('/api/commands', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(envelope) }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { result: { id: 'subject-created' } });
  assert.deepEqual(calls, [{ command: envelope, admin: owner }]);
});

test('rechaza origen externo sin habilitar CORS', async () => {
  const { handler, calls } = setup();
  const response = await handler(request('/api/commands', { method: 'POST', headers: { origin: 'https://attacker.example', 'content-type': 'application/json' }, body: JSON.stringify(envelope) }));
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  assert.equal(calls.length, 0);
});

test('preflight admite solo metodos y cabeceras del contrato', async () => {
  const { handler } = setup();
  const good = await handler(request('/api/commands', { method: 'OPTIONS', headers: { 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization,content-type' } }));
  assert.equal(good.status, 204);
  const bad = await handler(request('/api/commands', { method: 'OPTIONS', headers: { 'access-control-request-method': 'DELETE' } }));
  assert.equal(bad.status, 405);
});

test('rechaza contenido no JSON, cuerpo grande y envolturas invalidas', async () => {
  const { handler, calls } = setup();
  const cases = [
    { body: JSON.stringify(envelope), headers: { 'content-type': 'text/plain' }, status: 415 },
    { body: '{', headers: { 'content-type': 'application/json' }, status: 400 },
    { body: 'x'.repeat(32769), headers: { 'content-type': 'application/json' }, status: 413 },
    { body: JSON.stringify({ ...envelope, actor: owner }), headers: { 'content-type': 'application/json' }, status: 400 },
    { body: JSON.stringify({ ...envelope, payload: [] }), headers: { 'content-type': 'application/json' }, status: 400 },
  ];
  for (const entry of cases) {
    const response = await handler(request('/api/commands', { method: 'POST', headers: entry.headers, body: entry.body }));
    assert.equal(response.status, entry.status);
  }
  assert.equal(calls.length, 0);
});

test('limita solicitudes y diferencia rutas y metodos inexistentes', async () => {
  const { handler } = setup({ maxRequestsPerMinute: 2 });
  assert.equal((await handler(request())).status, 200);
  assert.equal((await handler(request())).status, 200);
  const limited = await handler(request());
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
  const fresh = setup().handler;
  assert.equal((await fresh(request('/api/missing'))).status, 404);
  assert.equal((await fresh(request('/api/state', { method: 'POST' }))).status, 405);
});

test('errores inesperados no publican mensajes internos ni credenciales', async () => {
  const handler = createApi({ config: { allowedOrigins: [origin] }, verifyToken: async () => owner, service: { getState: async () => { throw new Error('SECRET DATABASE PATH'); } } });
  const response = await handler(request());
  assert.equal(response.status, 500);
  const body = await response.text();
  assert.equal(body.includes('SECRET'), false);
  assert.equal(body.includes('DATABASE'), false);
});
