import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHmac } from 'node:crypto';
import { sqliteFixture } from './sarin-sqlite-fixture.mjs';

const implementation = await import('../../server/sarin/whatsapp/ingress.js').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return null;
  throw error;
});
const at = Date.parse('2026-10-17T12:00:00Z');
const secret = 'synthetic-webhook-signing-secret';
const business = '+15550000001', peer = '+15550000002';
const env = {
  SARIN_WHATSAPP_INGRESS_ENABLED: 'true', SARIN_WHATSAPP_WEBHOOK_SECRET: secret,
  SARIN_WHATSAPP_BUSINESS_PHONE: business, SARIN_WHATSAPP_WABA_ID: '123456789',
  SARIN_WHATSAPP_PILOT_PHONES: JSON.stringify([peer]),
  SARIN_WHATSAPP_CAPTURE_SINCE: '2026-10-17T11:00:00.000Z',
  SARIN_DB: { prepare() { throw new Error('unexpected DB'); }, batch() { throw new Error('unexpected DB'); } },
};
function event(kind = 'inbound', overrides = {}) {
  const message = { id: 'message-1', wamid: 'wamid.synthetic-1', wabaId: '123456789',
    from: kind === 'echo' ? business : peer, to: kind === 'echo' ? peer : business,
    sendTime: '2026-10-17T11:59:59.000Z', type: 'text', text: { body: 'Proyecto ficticio de tienda' }, ...overrides };
  return { id: 'event-1', type: kind === 'echo' ? 'whatsapp.smb.message.echoes' : 'whatsapp.inbound_message.received',
    apiVersion: 'v2', createTime: '2026-10-17T12:00:00.000Z',
    [kind === 'echo' ? 'whatsappMessage' : 'whatsappInboundMessage']: message };
}
function request(payload = event(), { signature, method = 'POST' } = {}) {
  const body = JSON.stringify(payload), timestamp = String(at / 1000);
  const digest = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return new Request('https://www.alsdevstudio.com/api/sarin/whatsapp', {
    method, headers: { 'Content-Type': 'application/json', 'YCloud-Signature': signature ?? `t=${timestamp},s=${digest}` },
    ...(method === 'POST' ? { body } : {}),
  });
}
async function handle(req, config = env, options = {}) {
  assert.equal(typeof implementation?.handleWhatsAppIngress, 'function', 'Falta el receptor durable');
  return implementation.handleWhatsAppIngress(req, config, { now: () => at, ...options });
}
const noCapture = { async capture() { assert.fail('No se debe persistir'); } };

test('deshabilitado no lee cuerpo ni toca D1 aunque existan credenciales', async () => {
  for (const value of [undefined, false, true, 'false', 'TRUE', ' true ']) {
    const req = request();
    const response = await handle(req, { ...env, SARIN_WHATSAPP_INGRESS_ENABLED: value }, { store: noCapture });
    assert.equal(response.status, 503);
    assert.equal(req.bodyUsed, false);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  }
});

test('configuración incompleta o piloto inválido cierra antes de consumir el mensaje', async () => {
  const invalid = [
    { SARIN_WHATSAPP_WEBHOOK_SECRET: '' }, { SARIN_WHATSAPP_BUSINESS_PHONE: '555' },
    { SARIN_WHATSAPP_WABA_ID: 'a' }, { SARIN_WHATSAPP_PILOT_PHONES: '[]' },
    { SARIN_WHATSAPP_PILOT_PHONES: JSON.stringify([peer, peer]) },
    { SARIN_WHATSAPP_PILOT_PHONES: JSON.stringify([business]) },
    { SARIN_WHATSAPP_PILOT_PHONES: 'null' }, { SARIN_WHATSAPP_PILOT_PHONES: '"+15550000002"' },
    { SARIN_WHATSAPP_PILOT_PHONES: JSON.stringify(Array.from({ length: 11 }, (_, i) => `+155500001${String(i).padStart(2, '0')}`)) },
    { SARIN_WHATSAPP_CAPTURE_SINCE: '2026-02-31T12:00:00.000Z' },
    { SARIN_WHATSAPP_CAPTURE_SINCE: '2026-10-17T12:01:00.000Z' }, { SARIN_DB: undefined },
  ];
  for (const change of invalid) {
    const req = request();
    assert.equal((await handle(req, { ...env, ...change }, { store: noCapture })).status, 503);
    assert.equal(req.bodyUsed, false);
  }
});

test('firma falsa y método incorrecto nunca llegan al almacén', async () => {
  assert.equal((await handle(request(event(), { signature: 't=1,s=invalid' }), env, { store: noCapture })).status, 401);
  const response = await handle(request(event(), { method: 'GET' }), env, { store: noCapture });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Allow'), 'POST');
});

test('admite sólo entrantes y ecos de la empresa, WABA y piloto configurados', async () => {
  for (const kind of ['inbound', 'echo']) {
    let captured;
    const response = await handle(request(event(kind)), env, {
      store: { async capture(value) { captured = value; return { status: 'captured', eventId: value.eventId }; } },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(captured.kind, kind);
    assert.equal(captured.wabaId, '123456789');
  }
  for (const kind of ['inbound', 'echo']) {
    for (const change of [{ from: '+15559999999' }, { to: '+15559999999' }, { wabaId: '999' }]) {
      assert.equal((await handle(request(event(kind, change)), env, { store: noCapture })).status, 200);
    }
  }
});

test('desconocidos y estados sin outbox se descartan sin atribuirlos por externalId', async () => {
  for (const payload of [
    { id: 'evt-unknown', type: 'whatsapp.smb.history', apiVersion: 'v2', createTime: '2026-10-17T12:00:00Z' },
    { id: 'evt-status', type: 'whatsapp.message.updated', apiVersion: 'v2', createTime: '2026-10-17T12:00:00Z',
      whatsappMessage: { id: 'outgoing-1', status: 'delivered', externalId: 'invented-correlation' } },
  ]) {
    const response = await handle(request(payload), env, { store: noCapture });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  }
});

test('no conserva historia importada ni mensajes con fechas fuera de la captura', async () => {
  for (const date of ['2026-10-17T10:59:59Z', '2026-10-17T12:05:01Z']) {
    assert.equal((await handle(request(event('inbound', { sendTime: date })), env, { store: noCapture })).status, 200);
    const payload = event(); payload.createTime = date;
    assert.equal((await handle(request(payload), env, { store: noCapture })).status, 200);
  }
  assert.equal((await handle(request(event('inbound', { sendTime: '2026-10-17T03:59:59Z' })),
    { ...env, SARIN_WHATSAPP_CAPTURE_SINCE: '2026-10-16T00:00:00.000Z' }, { store: noCapture })).status, 200);
});

test('ACK espera el commit durable y no genera ninguna llamada de red', async () => {
  let release, started;
  const begin = new Promise(resolve => { started = resolve; });
  const commit = new Promise(resolve => { release = resolve; });
  let finished = false;
  const oldFetch = globalThis.fetch;
  globalThis.fetch = () => { assert.fail('Ingreso no debe llamar IA ni YCloud'); };
  try {
    const result = handle(request(), env, { store: { async capture() { started(); return commit; } } });
    result.then(() => { finished = true; });
    await begin;
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(finished, false);
    release({ status: 'captured', eventId: 'event-1' });
    assert.equal((await result).status, 200);
  } finally { globalThis.fetch = oldFetch; }
});

test('commit fallido o sin confirmación jamás recibe ACK ni expone detalles SQL', async () => {
  for (const store of [
    { async capture() { throw new Error('SQL PRIVATE body phone key'); } },
    { async capture() { return undefined; } },
    { async capture() { return { status: 'pending' }; } },
  ]) {
    const response = await handle(request(), env, { store });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: { code: 'ingress_unavailable' } });
  }
});

test('commit bloqueado devuelve error reintentable sin ejecutar otra captura', async () => {
  let calls = 0;
  const response = await handle(request(), env, { commitTimeoutMs: 10, store: {
    capture() { calls++; return new Promise(() => {}); },
  } });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('Retry-After'), '10');
  assert.equal(calls, 1);
});

test('duplicado confirmado tiene el mismo ACK cerrado sin filtrar identificadores', async () => {
  const response = await handle(request(), env, { store: {
    async capture() { return { status: 'duplicate', eventId: 'private-canonical-id' }; },
  } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

test('firma auténtica y D1 real deduplican, detectan conflicto y conservan una captura', async t => {
  const f = await sqliteFixture({ history: true, whatsapp: true }); t.after(f.close);
  const config = { ...env, SARIN_DB: f.db };
  const first = await handle(request(), config);
  assert.equal(first.status, 200);
  assert.equal((await handle(request(), config)).status, 200);
  const conflicting = event('inbound', { text: { body: 'Contenido diferente' } });
  const conflict = await handle(request(conflicting), config);
  assert.equal(conflict.status, 409);
  assert.deepEqual(await conflict.json(), { error: { code: 'event_conflict' } });
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_wa_inbox').get().n, 1);
  assert.equal(f.sqlite.prepare('SELECT text FROM sarin_wa_inbox').get().text, 'Proyecto ficticio de tienda');
  for (const table of ['sarin_turns', 'sarin_reservations']) assert.equal(f.sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, 0);
});

test('cuota de recepción real devuelve 429 sin grabar el mensaje que la excede', async t => {
  const f = await sqliteFixture({ history: true, whatsapp: true }); t.after(f.close);
  const { createWhatsAppIngressStore } = await import('../../server/sarin/whatsapp/ingress-store.js');
  const store = createWhatsAppIngressStore({ db: f.db, now: () => at, limits: { perMinute: 1 } });
  assert.equal((await handle(request(), env, { store })).status, 200);
  const next = event('inbound', { id: 'message-2', wamid: 'wamid.synthetic-2' }); next.id = 'event-2';
  const response = await handle(request(next), env, { store });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '10');
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_wa_inbox').get().n, 1);
});

test('cancelación durante commit devuelve error sin reintentar ni filtrar detalles', async () => {
  const controller = new AbortController();
  const req = new Request(request(), { signal: controller.signal });
  let calls = 0;
  const response = await handle(req, env, { store: { capture() {
    calls++; controller.abort(); return new Promise(() => {});
  } } });
  assert.equal(response.status, 503);
  assert.equal(calls, 1);
});

test('recuperación impide revivir eventos anteriores aunque el proveedor los firme de nuevo', async t => {
  const f = await sqliteFixture({ history: true, whatsapp: true }); t.after(f.close);
  const { createWhatsAppIngressStore } = await import('../../server/sarin/whatsapp/ingress-store.js');
  const store = createWhatsAppIngressStore({ db: f.db, now: () => at });
  await store.recover({ maintenanceConfirmed: true, requestsDrained: true });
  const response = await handle(request(), { ...env, SARIN_DB: f.db });
  assert.equal(response.status, 200, 'Descarta sin provocar reintentos de historia restaurada');
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM sarin_wa_inbox').get().n, 0);
});
