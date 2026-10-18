import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { getEventListeners } from 'node:events';
import { createYCloudClient } from '../../server/sarin/whatsapp/ycloud-client.js';

const implementation = await import('../../server/sarin/whatsapp/ycloud-webhook.js').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return null;
  throw error;
});
const NOW = Date.UTC(2026, 9, 17, 12);
const SECRET = 'synthetic-endpoint-secret-never-used-remotely';
const URL = 'https://www.alsdevstudio.com/api/sarin/whatsapp';
const encoder = new TextEncoder();
const options = { secret: SECRET, now: () => NOW };
const incoming = () => ({
  id: 'evt_inbound_synthetic', type: 'whatsapp.inbound_message.received',
  apiVersion: 'v2', createTime: '2026-10-17T12:00:00.000Z',
  whatsappInboundMessage: {
    id: 'inbound_synthetic', wamid: 'wamid.synthetic+/=', wabaId: '123456789012345',
    from: '+573000000001', to: '+573000000002', sendTime: '2026-10-17T11:59:58Z',
    type: 'text', text: { body: 'Necesito una tienda para mi café.' },
    customerProfile: { name: 'PERSONAL_DATA_NOT_FOR_NORMALIZATION' },
  },
});
const expected = {
  kind: 'inbound', eventId: 'evt_inbound_synthetic', createdAt: NOW,
  messageId: 'inbound_synthetic', wamid: 'wamid.synthetic+/=', wabaId: '123456789012345',
  from: '+573000000001', to: '+573000000002', sentAt: NOW - 2000,
  mediaType: 'text', text: 'Necesito una tienda para mi café.',
};
const bytes = value => value instanceof Uint8Array ? value : encoder.encode(typeof value === 'string' ? value : JSON.stringify(value));
function signature(body, timestamp = String(NOW / 1000), secret = SECRET) {
  return `t=${timestamp},s=${createHmac('sha256', secret).update(`${timestamp}.`).update(bytes(body)).digest('hex')}`;
}
function signed(body = incoming(), { timestamp, secret, headers = {}, signal, raw, method = 'POST' } = {}) {
  const payload = bytes(body);
  return new Request(URL, { method, headers: {
    'Content-Type': 'application/json', 'YCloud-Signature': signature(payload, timestamp, secret), ...headers,
  }, ...(method === 'GET' ? {} : { body: raw ?? payload }), signal, ...(raw ? { duplex: 'half' } : {}) });
}
function read(request, config = options) {
  assert.equal(typeof implementation?.readYCloudWebhook, 'function', 'Falta implementar readYCloudWebhook');
  return implementation.readYCloudWebhook(request, config);
}
const rejected = (request, status, code, config) => assert.rejects(() => read(request, config), error => {
  assert.equal(error.status, status); assert.equal(error.code, code);
  assert.equal(error.message, code); assert.equal(error.cause, undefined);
  return true;
});

test('normaliza un entrante firmado y descarta campos privados adicionales', async () => {
  const result = await read(signed());
  assert.deepEqual(result, expected);
  assert.equal(JSON.stringify(result).includes('PERSONAL_DATA'), false);
});

test('firma los bytes originales con espacios y Unicode, también en lectura fragmentada', async () => {
  const raw = ` \n${JSON.stringify(incoming(), null, 2)}\n`;
  const data = bytes(raw);
  const stream = new ReadableStream({ start(controller) {
    for (let i = 0; i < data.length; i += 7) controller.enqueue(data.slice(i, i + 7));
    controller.close();
  } });
  assert.deepEqual(await read(signed(raw, { raw: stream })), expected);
  await rejected(signed(raw, { headers: { 'YCloud-Signature': signature(JSON.stringify(incoming())) } }), 401, 'invalid_signature');
});

test('firma inválida se rechaza antes de interpretar JSON', async () => {
  await rejected(signed('{not-json', { secret: 'different-test-secret' }), 401, 'invalid_signature');
  await rejected(signed(incoming(), { secret: 'different-test-secret' }), 401, 'invalid_signature');
  const changed = incoming(); changed.whatsappInboundMessage.text.body = 'Cambió el contenido.';
  await rejected(signed(changed, { headers: { 'YCloud-Signature': signature(incoming()) } }), 401, 'invalid_signature');
});

for (const header of ['', 't=abc,s=' + 'a'.repeat(64), 't=1e9,s=' + 'a'.repeat(64),
  `t=${NOW / 1000},s=xyz`, signature(incoming()) + ',t=1', signature(incoming()) + ',s=' + 'b'.repeat(64),
  signature(incoming()) + ',extra=value', 'x'.repeat(1025)]) {
  test('rechaza encabezado de firma ausente, ambiguo o mal formado: ' + header.slice(0, 32), async () => {
    await rejected(signed(incoming(), { headers: { 'YCloud-Signature': header } }), 401, 'invalid_signature');
  });
}

test('acepta firma con parámetros invertidos y espacios sin cambiar el mensaje firmado', async () => {
  const [timestamp, digest] = signature(incoming()).split(',');
  assert.deepEqual(await read(signed(incoming(), { headers: { 'YCloud-Signature': `${digest}, ${timestamp}` } })), expected);
});

for (const seconds of [-28800, -20140, 300]) {
  test(`acepta la política temporal en ${seconds} segundos`, async () => {
    assert.equal((await read(signed(incoming(), { timestamp: String(NOW / 1000 + seconds) }))).kind, 'inbound');
  });
}
for (const seconds of [-28801, 301]) {
  test(`rechaza firma fuera de la política temporal en ${seconds} segundos`, async () => {
    await rejected(signed(incoming(), { timestamp: String(NOW / 1000 + seconds) }), 401, 'signature_expired');
  });
}

for (const secret of [undefined, '', ' ', 1, 'x'.repeat(4097)]) {
  test(`rechaza configuración del secreto ${typeof secret}/${String(secret).length}`, async () => {
    await rejected(signed(), 503, 'invalid_config', { secret, now: () => NOW });
  });
}
for (const now of [() => NaN, () => -1, () => Infinity, () => NOW + 0.5, 42, () => { throw new Error('PRIVATE_CONFIGURATION'); }]) {
  test('rechaza reloj inválido sin filtrar el error interno ' + String(now), async () => {
    await rejected(signed(), 503, 'invalid_config', { secret: SECRET, now });
  });
}

test('usa Date.now cuando no se inyecta reloj', async () => {
  assert.equal((await read(signed(incoming(), { timestamp: String(Math.floor(Date.now() / 1000)) }), { secret: SECRET })).kind, 'inbound');
});

test('rechaza método, tipo de contenido y compresión antes de leer el cuerpo', async () => {
  await rejected(signed(incoming(), { method: 'GET' }), 405, 'method_not_allowed');
  for (const contentType of ['', 'text/plain', 'application/jsonp', 'application/json; charset=iso-8859-1']) {
    await rejected(signed(incoming(), { headers: { 'Content-Type': contentType } }), 415, 'invalid_content_type');
  }
  await rejected(signed(incoming(), { headers: { 'Content-Encoding': 'gzip' } }), 415, 'invalid_content_type');
  assert.equal((await read(signed(incoming(), { headers: { 'Content-Type': 'application/json; charset=UTF-8' } }))).kind, 'inbound');
});

test('límite exacto de 64 KiB se acepta y exceso por un byte se rechaza', async () => {
  const base = { id: 'evt_ignored', type: 'unhandled.future', apiVersion: 'v2', createTime: '2026-10-17T12:00:00Z', padding: '' };
  const size = bytes(base).length;
  base.padding = 'x'.repeat(65536 - size);
  assert.deepEqual(await read(signed(base)), { kind: 'ignored' });
  base.padding += 'x';
  await rejected(signed(base, { headers: { 'Content-Length': '1' } }), 413, 'body_too_large');
  await rejected(signed(incoming(), { headers: { 'Content-Length': '65537' } }), 413, 'body_too_large');
  await rejected(signed(incoming(), { headers: { 'Content-Length': 'not-a-number' } }), 400, 'invalid_request');
});

test('límite cuenta bytes UTF-8 y cancela el stream al excederlo', async () => {
  let cancelled = false;
  const raw = new ReadableStream({ start(controller) { controller.enqueue(bytes('á'.repeat(32769))); }, cancel() { cancelled = true; } });
  await rejected(signed('á'.repeat(32769), { raw }), 413, 'body_too_large');
  assert.equal(cancelled, true);
});

test('rechaza JSON mal formado y UTF-8 inválido aunque tengan firma auténtica', async () => {
  for (const raw of ['', '{', new Uint8Array([0xc3, 0x28])]) await rejected(signed(raw), 400, 'invalid_json');
});

test('cancelación previa y durante lectura termina sin esperar más bytes', { timeout: 1000 }, async () => {
  const already = new AbortController(); already.abort();
  await rejected(signed(incoming(), { signal: already.signal }), 408, 'request_aborted');
  const controller = new AbortController(); let cancelled = false;
  const stream = new ReadableStream({ cancel() { cancelled = true; } });
  const pending = rejected(signed(incoming(), { signal: controller.signal, raw: stream }), 408, 'request_aborted');
  setImmediate(() => controller.abort());
  await pending;
  assert.equal(cancelled, true);
});

for (const readTimeoutMs of [0, -1, 3001, 1.5, NaN, Infinity, '30', null]) {
  test(`rechaza plazo de lectura inválido ${String(readTimeoutMs)}`, async () => {
    await rejected(signed(), 503, 'invalid_config', { ...options, readTimeoutMs });
  });
}

test('acepta los extremos del plazo permitido sin tratarlos como configuración inválida', async () => {
  for (const readTimeoutMs of [1, 3000]) {
    const request = new Request(URL, { method: 'POST', headers: {
      'Content-Type': 'application/json', 'YCloud-Signature': signature(''),
    } });
    await rejected(request, 400, 'invalid_json', { ...options, readTimeoutMs });
  }
});

test('el plazo predeterminado vence sin depender de la cancelación del cliente', { timeout: 4500 }, async () => {
  const controller = new AbortController();
  const request = signed(incoming(), { signal: controller.signal, raw: new ReadableStream() });
  const guard = setTimeout(() => controller.abort(), 3500);
  try { await rejected(request, 408, 'body_timeout'); }
  finally { clearTimeout(guard); }
  assert.equal(controller.signal.aborted, false);
});

test('el plazo es total aunque el stream entregue fragmentos regularmente', { timeout: 1000 }, async () => {
  const payload = bytes(incoming());
  let timer;
  let offset = 0;
  const raw = new ReadableStream({
    start(controller) {
      timer = setInterval(() => {
        const end = Math.min(payload.length, offset + Math.ceil(payload.length / 8));
        controller.enqueue(payload.slice(offset, end));
        offset = end;
        if (offset === payload.length) { clearInterval(timer); controller.close(); }
      }, 15);
    },
    cancel() { clearInterval(timer); },
  });
  try { await rejected(signed(incoming(), { raw }), 408, 'body_timeout', { ...options, readTimeoutMs: 50 }); }
  finally { clearInterval(timer); }
  assert.ok(offset > 0 && offset < payload.length, 'Debe cortar antes de recibir todo el cuerpo');
  assert.equal(raw.locked, false);
});

test('un cancel pendiente no retrasa el rechazo por timeout', { timeout: 1000 }, async () => {
  const controller = new AbortController();
  let cancellations = 0;
  const raw = new ReadableStream({ cancel() { cancellations++; return new Promise(() => {}); } });
  const request = signed(incoming(), { signal: controller.signal, raw });
  const guard = setTimeout(() => controller.abort(), 200);
  try { await rejected(request, 408, 'body_timeout', { ...options, readTimeoutMs: 20 }); }
  finally { clearTimeout(guard); }
  assert.equal(controller.signal.aborted, false);
  assert.equal(cancellations, 1);
  assert.equal(raw.locked, false);
  assert.equal(getEventListeners(request.signal, 'abort').length, 0);
});

test('fragmentos vacíos inmediatos no impiden aplicar el plazo total', { timeout: 1000 }, async () => {
  const started = performance.now();
  const raw = new ReadableStream({ pull(controller) {
    if (performance.now() - started < 100) controller.enqueue(new Uint8Array(0));
    else controller.close();
  } }, { highWaterMark: 0 });
  await rejected(signed(incoming(), { raw }), 408, 'body_timeout', { ...options, readTimeoutMs: 20 });
  assert.equal(raw.locked, false);
});

test('una lectura que termina tarde no reactiva el bucle tras el timeout', { timeout: 1000 }, async () => {
  let finishRead;
  let reads = 0;
  let releases = 0;
  const controller = new AbortController();
  const request = signed(incoming(), { signal: controller.signal });
  const delayedRead = new Promise(resolve => { finishRead = resolve; });
  // Emula sólo el límite externo: un productor que ignora cancelación.
  const reader = {
    read() { reads++; return delayedRead; },
    cancel() { return new Promise(() => {}); },
    releaseLock() { releases++; },
  };
  Object.defineProperty(request, 'body', { value: { locked: true, getReader: () => reader } });
  const guard = setTimeout(() => controller.abort(), 200);
  try { await rejected(request, 408, 'body_timeout', { ...options, readTimeoutMs: 20 }); }
  finally { clearTimeout(guard); }
  finishRead({ done: false, value: bytes(incoming()) });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(reads, 1);
  assert.equal(releases, 1);
  assert.equal(getEventListeners(request.signal, 'abort').length, 0);
});

test('libera timer y listener al completar, fallar o cancelar la lectura', async t => {
  const schedule = globalThis.setTimeout;
  const unschedule = globalThis.clearTimeout;
  const pendingTimers = new Set();
  t.mock.method(globalThis, 'setTimeout', (callback, delay, ...args) => {
    const timer = schedule(() => { pendingTimers.delete(timer); callback(...args); }, delay);
    pendingTimers.add(timer);
    return timer;
  });
  t.mock.method(globalThis, 'clearTimeout', timer => { pendingTimers.delete(timer); unschedule(timer); });
  const success = signed();
  assert.deepEqual(await read(success, { ...options, readTimeoutMs: 100 }), expected);
  assert.equal(pendingTimers.size, 0);
  assert.equal(getEventListeners(success.signal, 'abort').length, 0);

  const failed = signed(incoming(), { raw: new ReadableStream({ pull(controller) { controller.error(new Error('PRIVATE')); } }) });
  await rejected(failed, 400, 'invalid_request', { ...options, readTimeoutMs: 100 });
  assert.equal(pendingTimers.size, 0);
  assert.equal(getEventListeners(failed.signal, 'abort').length, 0);

  const controller = new AbortController();
  const cancelled = signed(incoming(), { signal: controller.signal, raw: new ReadableStream() });
  const pending = rejected(cancelled, 408, 'request_aborted', { ...options, readTimeoutMs: 100 });
  assert.equal(pendingTimers.size, 1, 'Una lectura pendiente debe tener plazo activo');
  controller.abort('PRIVATE_ABORT_REASON');
  await pending;
  assert.equal(pendingTimers.size, 0);
  assert.equal(getEventListeners(cancelled.signal, 'abort').length, 0);
});

test('un fallo del stream no filtra detalles privados', async () => {
  const stream = new ReadableStream({ pull(controller) { controller.error(new Error('PRIVATE_STREAM_DATA')); } });
  await rejected(signed(incoming(), { raw: stream }), 400, 'invalid_request');
});

for (const change of [value => { value.id = ''; }, value => { value.id = 'x'.repeat(257); },
  value => { value.type = []; }, value => { value.apiVersion = 'v1'; },
  value => { value.createTime = '2026-02-30T12:00:00Z'; }, value => { value.createTime = 'tomorrow'; },
  value => { value.createTime = '2026-10-17T12:00:00'; }, value => { value.createTime = '2026-10-17T24:00:00Z'; },
  value => { value.whatsappInboundMessage = null; },
  value => { value.whatsappInboundMessage.id = 'id\nsecret'; },
  value => { value.whatsappInboundMessage.wamid = 'x'.repeat(513); },
  value => { value.whatsappInboundMessage.wabaId = 'not-numeric'; },
  value => { value.whatsappInboundMessage.from = '573000000001'; },
  value => { value.whatsappInboundMessage.to = '+01234'; },
  value => { value.whatsappInboundMessage.to = '+1234567890123456'; },
  value => { value.whatsappInboundMessage.sendTime = '2026-10-17T12:60:00Z'; },
  value => { value.whatsappInboundMessage.type = 'TEXT\n'; },
  value => { value.whatsappInboundMessage.text = {}; },
  value => { value.whatsappInboundMessage.text.body = ' '; },
  value => { value.whatsappInboundMessage.text.body = 'x'.repeat(1201); },
  value => { value.whatsappInboundMessage.text.body = 'hola\u0000'; }]) {
  test('rechaza evento inválido: ' + String(change), async () => {
    const value = incoming(); change(value);
    await rejected(signed(value), 400, 'invalid_event');
  });
}
for (const value of [null, [], 1, 'text']) {
  test('rechaza envelope no objeto: ' + JSON.stringify(value), async () => {
    await rejected(signed(JSON.stringify(value)), 400, 'invalid_event');
  });
}

test('texto conserva contenido exacto y máximo de 1200 unidades como Sarin', async () => {
  const value = incoming(); value.whatsappInboundMessage.text.body = ' á\n' + 'x'.repeat(1197);
  assert.equal((await read(signed(value))).text, value.whatsappInboundMessage.text.body);
});

test('fechas con zona explícita se normalizan a milisegundos', async () => {
  const value = incoming(); value.createTime = '2026-10-17T07:00:00-05:00';
  assert.equal((await read(signed(value))).createdAt, NOW);
  value.createTime = '2024-02-29T12:00:00Z';
  assert.equal((await read(signed(value))).createdAt, Date.UTC(2024, 1, 29, 12));
});

test('normaliza eco sin invertir el remitente y destinatario', async () => {
  const value = incoming(); value.type = 'whatsapp.smb.message.echoes';
  value.whatsappMessage = { ...value.whatsappInboundMessage, from: '+573000000002', to: '+573000000001' };
  delete value.whatsappInboundMessage;
  assert.deepEqual(await read(signed(value)), { ...expected, kind: 'echo', from: '+573000000002', to: '+573000000001' });
});

for (const type of ['image', 'audio', 'document', 'video', 'sticker', 'interactive', 'location']) {
  test(`medio ${type} conserva metadata y descarta contenido y URL`, async () => {
    const value = incoming(); value.whatsappInboundMessage.type = type;
    value.whatsappInboundMessage[type] = { link: 'https://private.invalid/file', caption: 'PRIVATE_CAPTION' };
    assert.deepEqual(await read(signed(value)), {
      kind: 'inbound', eventId: expected.eventId, createdAt: NOW, messageId: expected.messageId,
      wamid: expected.wamid, wabaId: expected.wabaId, from: expected.from, to: expected.to,
      sentAt: expected.sentAt, mediaType: type,
    });
  });
}

for (const status of ['read', 'accepted', 'failed', 'sent', 'delivered', 'read']) {
  test(`estado ${status} sin from/to/text ni dependencia del orden`, async () => {
    const value = { id: 'evt_status', type: 'whatsapp.message.updated', apiVersion: 'v2',
      createTime: '2026-10-17T12:00:00Z', whatsappMessage: { id: 'message_synthetic', status,
        errors: [{ message: 'PRIVATE_PROVIDER_DETAIL' }] } };
    assert.deepEqual(await read(signed(value)), { kind: 'status', eventId: 'evt_status', createdAt: NOW, messageId: 'message_synthetic', status });
  });
}

test('estado conserva sólo correlación opcional válida', async () => {
  const value = { id: 'evt_status', type: 'whatsapp.message.updated', apiVersion: 'v2', createTime: '2026-10-17T12:00:00Z',
    whatsappMessage: { id: 'message_synthetic', status: 'sent', wamid: 'wamid.test', externalId: 'outbox:synthetic' } };
  assert.deepEqual(await read(signed(value)), { kind: 'status', eventId: 'evt_status', createdAt: NOW,
    messageId: 'message_synthetic', status: 'sent', wamid: 'wamid.test', externalId: 'outbox:synthetic' });
  for (const change of [{ status: 'queued' }, { wamid: null }, { externalId: 'x'.repeat(129) }, { id: '' },
    ...['', null, 3, ' pedido', 'pedido ', '\u00a0pedido', 'pedido\u00a0', 'pedido\n1', 'pedido\u007f1', 'pedido\u009f1'].map(externalId => ({ externalId }))]) {
    await rejected(signed({ ...value, whatsappMessage: { ...value.whatsappMessage, ...change } }), 400, 'invalid_event');
  }
});

test('externalId Unicode con espacio interno vuelve intacto desde envío hasta webhook firmado', async () => {
  let submitted;
  const client = createYCloudClient({ apiKey: 'synthetic-key', businessPhone: '+573000000002', sendEnabled: true,
    fetcher: async (_url, init) => {
      submitted = JSON.parse(init.body);
      return new Response(JSON.stringify({ id: 'message_round_trip', status: 'accepted', externalId: submitted.externalId }),
        { headers: { 'Content-Type': 'application/json' } });
    } });
  const sent = await client.sendText({ to: '+573000000001', text: 'Podemos orientar tu tienda.', externalId: 'pedido café' });
  const normalized = await read(signed({ id: 'evt_round_trip', type: 'whatsapp.message.updated', apiVersion: 'v2',
    createTime: '2026-10-17T12:00:00Z', whatsappMessage: {
      id: sent.providerId, status: 'delivered', externalId: submitted.externalId,
    } }));
  assert.deepEqual(normalized, { kind: 'status', eventId: 'evt_round_trip', createdAt: NOW,
    messageId: 'message_round_trip', status: 'delivered', externalId: 'pedido café' });
});

test('externalId acepta Unicode de 1 a 128 unidades sin recortar la referencia', async () => {
  for (const externalId of ['é', 'é'.repeat(128)]) {
    const event = { id: 'evt_reference', type: 'whatsapp.message.updated', apiVersion: 'v2', createTime: '2026-10-17T12:00:00Z',
      whatsappMessage: { id: 'message_synthetic', status: 'sent', externalId } };
    assert.equal((await read(signed(event))).externalId, externalId);
  }
});

test('evento desconocido sólo produce ignored sin datos personales', async () => {
  const value = incoming(); value.type = 'future.private_event'; value.privateData = 'DO_NOT_RETURN';
  assert.deepEqual(await read(signed(value)), { kind: 'ignored' });
});

test('status_optional_identities_are_preserved_and_validated',async()=>{
 const payload={id:'status_identity',type:'whatsapp.message.updated',apiVersion:'v2',createTime:new Date(NOW).toISOString(),whatsappMessage:{id:'provider_id',status:'delivered',from:'+573000000002',to:'+573000000001',wabaId:'12345',externalId:'synthetic-reference',wamid:'wamid.synthetic+/='}};
 const got=await read(signed(payload));assert.equal(got.from,'+573000000002');assert.equal(got.to,'+573000000001');assert.equal(got.wabaId,'12345');
 for(const change of [{from:null},{to:'bad'},{wabaId:'0'}])await rejected(signed({...payload,whatsappMessage:{...payload.whatsappMessage,...change}}),400,'invalid_event');
});
