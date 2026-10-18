import test from 'node:test';
import assert from 'node:assert/strict';
import { createYCloudClient, YCloudClientError } from '../../server/sarin/whatsapp/ycloud-client.js';

const config = { apiKey: 'synthetic-key', businessPhone: '+12025550101', sendEnabled: true };
const message = { to: '+12025550102', text: 'Podemos orientar tu sitio.', externalId: 'sarin_out_0001' };
const json = (value, init = {}) => new Response(JSON.stringify(value), {
  ...init, headers: { 'Content-Type': 'application/json', ...init.headers },
});
const accepted = () => json({ id: 'yc_out_0001', status: 'accepted' });
function setup(fetcher = async () => accepted(), overrides = {}) {
  const calls = [];
  const client = createYCloudClient({ ...config, ...overrides, fetcher: (url, init) => {
    calls.push({ url, init });
    return fetcher(url, init);
  } });
  return { client, calls };
}
function errorIs(code, deliveryState) {
  return error => {
    assert.ok(error instanceof YCloudClientError);
    assert.equal(error.code, code);
    assert.equal(error.deliveryState, deliveryState);
    assert.equal(error.message, code);
    assert.equal(error.cause, undefined);
    assert.doesNotMatch(JSON.stringify(error), /synthetic-key|private-detail|12025550102/);
    return true;
  };
}

test('envía una sola petición a la API fija, desde el número configurado, y conserva accepted', async () => {
  const s = setup();
  assert.deepEqual(await s.client.sendText({ ...message, from: '+12025550199' }), {
    providerId: 'yc_out_0001', status: 'accepted',
  });
  assert.equal(s.calls.length, 1);
  const { url, init } = s.calls[0];
  assert.equal(url, 'https://api.ycloud.com/v2/whatsapp/messages');
  assert.equal(init.method, 'POST');
  assert.equal(init.redirect, 'manual');
  assert.deepEqual(init.headers, { 'Content-Type': 'application/json', 'X-API-Key': 'synthetic-key' });
  assert.deepEqual(JSON.parse(init.body), {
    from: '+12025550101', to: '+12025550102', type: 'text',
    text: { body: 'Podemos orientar tu sitio.', preview_url: false }, externalId: 'sarin_out_0001',
  });
});

for (const sendEnabled of [undefined, false, 'true', 1]) {
  test(`envío requiere booleano true explícito: ${String(sendEnabled)}`, async () => {
    const s = setup(undefined, { sendEnabled });
    await assert.rejects(s.client.sendText(message), errorIs('send_disabled', 'not_sent'));
    assert.equal(s.calls.length, 0);
  });
}

for (const invalid of [
  { apiKey: '' }, { apiKey: undefined }, { apiKey: 'secret\r\nInjected: yes' },
  { apiKey: 'secret\0key' }, { apiKey: 'secret\tkey' }, { apiKey: 'key\u007f' },
  { businessPhone: '12025550101' }, { businessPhone: '+0123456' },
  { businessPhone: '+1234567890123456' }, { timeoutMs: 0 }, { timeoutMs: Infinity },
  { timeoutMs: 30001 }, { timeoutMs: 1.5 }, { fetcher: null },
]) {
  test(`rechaza configuración inválida sin exponerla: ${Object.keys(invalid)[0]}`, () => {
    assert.throws(() => createYCloudClient({ ...config, fetcher: async () => accepted(), ...invalid }),
      errorIs('invalid_config', 'not_sent'));
  });
}

for (const invalid of [
  { to: '12025550102' }, { to: '+12025550102/path' }, { to: '+0123' },
  { text: '' }, { text: '   ' }, { text: 'x'.repeat(1201) }, { text: null },
  { externalId: '' }, { externalId: 'x'.repeat(129) }, { externalId: 'bad\r\nid' },
]) {
  test(`valida ${Object.keys(invalid)[0]} antes de iniciar el transporte`, async () => {
    const s = setup();
    await assert.rejects(s.client.sendText({ ...message, ...invalid }), errorIs('invalid_request', 'not_sent'));
    assert.equal(s.calls.length, 0);
  });
}

test('acepta exactamente 1200 caracteres y correlaciones coincidentes sin trasladar datos extra', async () => {
  const s = setup(async () => json({ id: 'yc_out_0001', status: 'sent',
    from: config.businessPhone, to: message.to, externalId: message.externalId, text: 'private-detail' }));
  assert.deepEqual(await s.client.sendText({ ...message, text: 'á'.repeat(1200) }), {
    providerId: 'yc_out_0001', status: 'sent',
  });
});

test('consulta por ID aunque los envíos estén deshabilitados', async () => {
  const s = setup(async () => json({ id: 'yc_out_0001', status: 'read' }), { sendEnabled: false });
  assert.deepEqual(await s.client.getMessage({ id: 'yc_out_0001' }), { providerId: 'yc_out_0001', status: 'read' });
  assert.equal(s.calls[0].url, 'https://api.ycloud.com/v2/whatsapp/messages/yc_out_0001');
  assert.equal(s.calls[0].init.method, 'GET');
  assert.equal(s.calls[0].init.body, undefined);
  assert.equal(s.calls[0].init.redirect, 'manual');
});

for (const id of ['', '../balance', 'id?key=private-detail', 'id%2fother', 'x'.repeat(129), null]) {
  test('consulta rechaza IDs que podrían cambiar la ruta o exceder límites', async () => {
    const s = setup();
    await assert.rejects(s.client.getMessage({ id }), errorIs('invalid_request', 'not_sent'));
    assert.equal(s.calls.length, 0);
  });
}

for (const [status, code, state] of [
  [400, 'provider_rejected', 'rejected'], [401, 'provider_rejected', 'rejected'],
  [429, 'provider_rejected', 'rejected'], [408, 'provider_unavailable', 'uncertain'],
  [500, 'provider_unavailable', 'uncertain'], [503, 'provider_unavailable', 'uncertain'],
  [301, 'provider_redirect', 'uncertain'], [307, 'provider_redirect', 'uncertain'],
]) {
  test(`HTTP ${status} no reintenta ni revela el cuerpo`, async () => {
    const s = setup(async () => new Response('private-detail synthetic-key', {
      status, headers: { Location: 'https://other.invalid/' },
    }));
    await assert.rejects(s.client.sendText(message), errorIs(code, state));
    assert.equal(s.calls.length, 1);
  });
}

for (const value of [null, [], {}, { id: 'yc_out_0001' }, { status: 'accepted' },
  { id: 'yc_out_0001', status: 'private-detail' }, { id: '../bad', status: 'accepted' },
  { id: 'x'.repeat(129), status: 'accepted' },
  { id: 'yc_out_0001', status: 'accepted', externalId: 'different' },
  { id: 'yc_out_0001', status: 'accepted', from: '+12025550199' },
  { id: 'yc_out_0001', status: 'accepted', to: '+12025550199' },
]) {
  test('respuesta exitosa sin identidad, estado o correlación válidos queda incierta', async () => {
    const s = setup(async () => json(value));
    await assert.rejects(s.client.sendText(message), errorIs('invalid_response', 'uncertain'));
    assert.equal(s.calls.length, 1);
  });
}

test('consulta comprueba el ID devuelto y el remitente si aparece', async () => {
  for (const value of [{ id: 'other', status: 'sent' },
    { id: 'yc_out_0001', status: 'sent', from: '+12025550199' }]) {
    const s = setup(async () => json(value));
    await assert.rejects(s.client.getMessage({ id: 'yc_out_0001' }), errorIs('invalid_response', 'uncertain'));
  }
});

for (const make of [
  () => new Response('private-detail', { headers: { 'Content-Type': 'text/html' } }),
  () => new Response('{private-detail', { headers: { 'Content-Type': 'application/json' } }),
  () => new Response(new Uint8Array([0xff]), { headers: { 'Content-Type': 'application/json' } }),
]) {
  test('cuerpo ilegible o tipo incorrecto nunca se convierte en un envío confirmado', async () => {
    const s = setup(async () => make());
    await assert.rejects(s.client.sendText(message), errorIs('invalid_response', 'uncertain'));
    assert.equal(s.calls.length, 1);
  });
}

test('limita a 64 KiB reales aunque Content-Length mienta y cancela el stream', async () => {
  let cancelled = false;
  const s = setup(async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(65537)); },
    cancel() { cancelled = true; },
  }), { headers: { 'Content-Type': 'application/json', 'Content-Length': '1' } }));
  await assert.rejects(s.client.sendText(message), errorIs('response_too_large', 'uncertain'));
  assert.equal(cancelled, true);
  assert.equal(s.calls.length, 1);
});

test('acepta cuerpo válido de exactamente 64 KiB', async () => {
  const body = JSON.stringify({ id: 'yc_out_0001', status: 'accepted' });
  const s = setup(async () => new Response(body + ' '.repeat(65536 - body.length), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  }));
  assert.deepEqual(await s.client.sendText(message), { providerId: 'yc_out_0001', status: 'accepted' });
});

test('fallo de red no reintenta y sustituye detalles arbitrarios', async () => {
  const s = setup(async () => { throw new Error('private-detail synthetic-key'); });
  await assert.rejects(s.client.sendText(message), errorIs('network_error', 'uncertain'));
  assert.equal(s.calls.length, 1);
});

test('aborto previo no inicia envío', async () => {
  const controller = new AbortController();
  controller.abort('private-detail');
  const s = setup();
  await assert.rejects(s.client.sendText({ ...message, signal: controller.signal }), errorIs('cancelled', 'not_sent'));
  assert.equal(s.calls.length, 0);
});

test('aborto en vuelo finaliza aunque fetch ignore la señal', { timeout: 2000 }, async () => {
  const controller = new AbortController();
  const s = setup(async () => new Promise(() => {}));
  const pending = s.client.sendText({ ...message, signal: controller.signal });
  controller.abort('private-detail');
  await assert.rejects(pending, errorIs('cancelled', 'uncertain'));
  assert.equal(s.calls[0].init.signal.aborted, true);
  assert.equal(s.calls.length, 1);
});

test('timeout total acota fetch que ignora AbortSignal', { timeout: 2000 }, async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const s = setup(async () => new Promise(() => {}), { timeoutMs: 100 });
  const pending = s.client.sendText(message);
  t.mock.timers.tick(100);
  await assert.rejects(pending, errorIs('timeout', 'uncertain'));
  assert.equal(s.calls[0].init.signal.aborted, true);
  assert.equal(s.calls.length, 1);
});

test('timeout incluye cuerpo pendiente y cancela su lector', { timeout: 2000 }, async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let cancelled = false;
  let reading;
  const started = new Promise(resolve => { reading = resolve; });
  const s = setup(async () => new Response(new ReadableStream({
    pull() { reading(); return new Promise(() => {}); },
    cancel() { cancelled = true; },
  }), { headers: { 'Content-Type': 'application/json' } }), { timeoutMs: 100 });
  const pending = s.client.sendText(message);
  await started;
  await Promise.resolve();
  t.mock.timers.tick(100);
  await assert.rejects(pending, errorIs('timeout', 'uncertain'));
  assert.equal(cancelled, true);
  assert.equal(s.calls.length, 1);
});
