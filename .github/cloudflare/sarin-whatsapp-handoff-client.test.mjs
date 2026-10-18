import test from 'node:test';
import assert from 'node:assert/strict';
const module = await import('../../server/sarin/whatsapp/handoff-client.js').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
  throw error;
});
const config = { apiKey: 'synthetic-handoff-key', businessPhone: '+12025550101', ownerPhone: '+12025550102', sendEnabled: true };
const input = { to: '+12025550102', contactLabel: '*** 0199',
  panelUrl: 'https://www.alsdevstudio.com/control-sarin/#whatsapp=' + 'a'.repeat(64), externalId: 'handoff-test-1' };
const template = { ...input, templateName: 'als_atencion_humana_v1', templateLanguage: 'es' };
const json = (body, options = {}) => new Response(JSON.stringify(body), {
  ...options, headers: { 'Content-Type': 'application/json', ...options.headers },
});
function setup(fetcher = async () => json({ id: 'yc_notice_1', status: 'accepted' }), options = {}) {
  assert.equal(typeof module.createWhatsAppHandoffClient, 'function', 'falta el cliente de avisos');
  const calls = [];
  const client = module.createWhatsAppHandoffClient({ ...config, ...options, fetcher: (url, init) => {
    calls.push({ url, init }); return fetcher(url, init);
  } });
  return { client, calls };
}
const errorIs = (code, state) => error => {
  assert.ok(error instanceof module.HandoffClientError);
  assert.equal(error.code, code);
  assert.equal(error.message, code);
  assert.equal(error.deliveryState, state);
  assert.equal(error.cause, undefined);
  assert.doesNotMatch(JSON.stringify(error), /synthetic-handoff-key|private-detail|12025550102/);
  return true;
};

test('texto administrativo identifica el contacto y envía una sola vez al dueño configurado', async () => {
  const s = setup();
  assert.deepEqual(await s.client.sendText(input), { providerId: 'yc_notice_1', status: 'accepted' });
  assert.equal(s.calls.length, 1);
  const { url, init } = s.calls[0], body = JSON.parse(init.body);
  assert.equal(url, 'https://api.ycloud.com/v2/whatsapp/messages');
  assert.equal(init.method, 'POST'); assert.equal(init.redirect, 'manual');
  assert.deepEqual(init.headers, { 'Content-Type': 'application/json', 'X-API-Key': config.apiKey });
  assert.equal(body.from, config.businessPhone); assert.equal(body.to, config.ownerPhone);
  assert.equal(body.type, 'text'); assert.equal(body.externalId, input.externalId);
  assert.equal(body.text.preview_url, false);
  assert.match(body.text.body, /ALS Dev Studio/);
  assert.match(body.text.body, /\*\*\* 0199/);
  assert.match(body.text.body, /hablar con Andrés/);
  assert.match(body.text.body, /Sarin.*pausado/);
  assert.ok(body.text.body.includes(input.panelUrl));
  assert.ok(body.text.body.length <= 1200);
});

test('plantilla usa nombre e idioma explícitos y solo dos variables BODY', async () => {
  const s = setup(async () => json({ id: 'yc_notice_1', status: 'sent', from: config.businessPhone,
    to: input.to, externalId: input.externalId, wamid: 'wamid.synthetic+/=' }));
  assert.deepEqual(await s.client.sendTemplate(template), { providerId: 'yc_notice_1', status: 'sent', wamid: 'wamid.synthetic+/=' });
  assert.deepEqual(JSON.parse(s.calls[0].init.body), {
    from: config.businessPhone, to: config.ownerPhone, type: 'template', externalId: input.externalId,
    template: { name: 'als_atencion_humana_v1', language: { code: 'es' },
      components: [{ type: 'body', parameters: [{ type: 'text', text: '*** 0199' }, { type: 'text', text: input.panelUrl }] }] },
  });
});

test('contacto corto conserva etiqueta oculta sin revelar todos sus dígitos', async () => {
  const s = setup(); await s.client.sendText({ ...input, contactLabel: '***' });
  const body = JSON.parse(s.calls[0].init.body); assert.match(body.text.body, /contacto \*\*\* solicitó/);
});

for (const sendEnabled of [undefined, false, 'true', 1]) test('ambos modos necesitan permiso booleano de envío: ' + String(sendEnabled), async () => {
  const s = setup(undefined, { sendEnabled });
  await assert.rejects(s.client.sendText(input), errorIs('send_disabled', 'not_sent'));
  await assert.rejects(s.client.sendTemplate(template), errorIs('send_disabled', 'not_sent'));
  assert.equal(s.calls.length, 0);
});

for (const invalid of [
  { apiKey: '' }, { apiKey: 'bad\r\nkey' }, { apiKey: 'x'.repeat(4097) },
  { businessPhone: '12025550101' }, { ownerPhone: '+0123' }, { ownerPhone: config.businessPhone },
  { timeoutMs: 0 }, { timeoutMs: 30001 }, { timeoutMs: 1.5 },
]) test('configuración inválida queda cerrada: ' + JSON.stringify(Object.keys(invalid)), () => {
  assert.equal(typeof module.createWhatsAppHandoffClient, 'function', 'falta el cliente de avisos');
  assert.throws(() => module.createWhatsAppHandoffClient({ ...config, ...invalid }), errorIs('invalid_config', 'not_sent'));
});

for (const invalid of [
  { to: '+12025550199' }, { to: '+0123' }, { contactLabel: '+12025550199' },
  { contactLabel: '*** 0199\nprivate-detail' }, { contactLabel: '*** 01999' },
  { panelUrl: 'https://evil.invalid/control-sarin/#whatsapp=' + 'a'.repeat(64) },
  { panelUrl: 'https://www.alsdevstudio.com.evil.invalid/control-sarin/#whatsapp=' + 'a'.repeat(64) },
  { panelUrl: 'http://www.alsdevstudio.com/control-sarin/#whatsapp=' + 'a'.repeat(64) },
  { panelUrl: 'https://www.alsdevstudio.com/control-sarin/?secret=private-detail#whatsapp=' + 'a'.repeat(64) },
  { panelUrl: 'https://www.alsdevstudio.com/control-sarin/#whatsapp=private-detail' },
  { externalId: 'private-detail\n' }, { externalId: 'x'.repeat(129) }, { text: 'private-detail' },
]) test('entrada alterada no puede cambiar destinatario, filtrar texto ni cambiar enlace: ' + Object.keys(invalid)[0], async () => {
  const s = setup();
  await assert.rejects(s.client.sendText({ ...input, ...invalid }), errorIs('invalid_request', 'not_sent'));
  await assert.rejects(s.client.sendTemplate({ ...template, ...invalid }), errorIs('invalid_request', 'not_sent'));
  assert.equal(s.calls.length, 0);
});

for (const invalid of [{ templateName: '' }, { templateName: 'Marketing Name' }, { templateName: 'x'.repeat(513) },
  { templateLanguage: '' }, { templateLanguage: 'es\n' }, { templateLanguage: 'Spanish' }]) test('plantilla exige identificadores válidos: ' + Object.keys(invalid)[0], async () => {
  const s = setup();
  await assert.rejects(s.client.sendTemplate({ ...template, ...invalid }), errorIs('invalid_request', 'not_sent'));
  assert.equal(s.calls.length, 0);
});

for (const [status, code, state] of [[400, 'provider_rejected', 'rejected'], [429, 'provider_rejected', 'rejected'],
  [408, 'provider_unavailable', 'uncertain'], [500, 'provider_unavailable', 'uncertain'], [307, 'provider_redirect', 'uncertain']]) {
  test('HTTP ' + status + ' no reintenta ni revela el cuerpo', async () => {
    const s = setup(async () => new Response('private-detail', { status, headers: { Location: 'https://evil.invalid/' } }));
    await assert.rejects(s.client.sendTemplate(template), errorIs(code, state)); assert.equal(s.calls.length, 1);
  });
}

for (const body of [null, [], {}, { id: '../bad', status: 'accepted' }, { id: 'yc_notice_1', status: 'pending' },
  { id: 'yc_notice_1', status: 'accepted', from: '+12025550199' }, { id: 'yc_notice_1', status: 'accepted', to: '+12025550199' },
  { id: 'yc_notice_1', status: 'accepted', externalId: 'other' }, { id: 'yc_notice_1', status: 'accepted', wamid: 'bad\n' }]) {
  test('resultado sin identidad o correlación válida queda incierto', async () => {
    const s = setup(async () => json(body));
    await assert.rejects(s.client.sendTemplate(template), errorIs('invalid_response', 'uncertain')); assert.equal(s.calls.length, 1);
  });
}

test('solo devuelve estado y correlación permitidos, nunca campos privados del proveedor', async () => {
  const s = setup(async () => json({ id: 'yc_notice_1', status: 'delivered', text: 'private-detail', secret: config.apiKey }));
  assert.deepEqual(await s.client.sendText(input), { providerId: 'yc_notice_1', status: 'delivered' });
});

for (const response of [
  () => new Response('private-detail', { headers: { 'Content-Type': 'text/html' } }),
  () => new Response('{bad', { headers: { 'Content-Type': 'application/json' } }),
  () => new Response(new Uint8Array([255]), { headers: { 'Content-Type': 'application/json' } }),
]) test('respuesta ilegible no confirma envío', async () => {
  const s = setup(async () => response());
  await assert.rejects(s.client.sendText(input), errorIs('invalid_response', 'uncertain')); assert.equal(s.calls.length, 1);
});

test('limita bytes reales y cancela el cuerpo cuando supera 64 KiB', async () => {
  let cancelled = false;
  const s = setup(async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(65537)); }, cancel() { cancelled = true; },
  }), { headers: { 'Content-Type': 'application/json', 'Content-Length': '1' } }));
  await assert.rejects(s.client.sendTemplate(template), errorIs('response_too_large', 'uncertain'));
  assert.equal(cancelled, true); assert.equal(s.calls.length, 1);
});

test('fallo de red no reintenta ni muestra causas externas', async () => {
  const s = setup(async () => { throw new Error('private-detail synthetic-handoff-key'); });
  await assert.rejects(s.client.sendText(input), errorIs('network_error', 'uncertain')); assert.equal(s.calls.length, 1);
});

test('cancelación previa impide el POST', async () => {
  const controller = new AbortController(); controller.abort('private-detail'); const s = setup();
  await assert.rejects(s.client.sendText({ ...input, signal: controller.signal }), errorIs('cancelled', 'not_sent'));
  assert.equal(s.calls.length, 0);
});

test('cancelación en vuelo finaliza aunque fetch ignore AbortSignal', { timeout: 2000 }, async () => {
  const controller = new AbortController(), s = setup(async () => new Promise(() => {}));
  const pending = s.client.sendTemplate({ ...template, signal: controller.signal }); controller.abort('private-detail');
  await assert.rejects(pending, errorIs('cancelled', 'uncertain'));
  assert.equal(s.calls.length, 1); assert.equal(s.calls[0].init.signal.aborted, true);
});

test('timeout total incluye fetch que no responde', { timeout: 2000 }, async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); const s = setup(async () => new Promise(() => {}), { timeoutMs: 100 });
  const pending = s.client.sendText(input); t.mock.timers.tick(100);
  await assert.rejects(pending, errorIs('timeout', 'uncertain')); assert.equal(s.calls.length, 1);
});

test('timeout total incluye lectura de cuerpo que queda pendiente', { timeout: 2000 }, async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); let started, cancelled = false;
  const reading = new Promise(resolve => { started = resolve; });
  const s = setup(async () => new Response(new ReadableStream({
    pull() { started(); return new Promise(() => {}); }, cancel() { cancelled = true; },
  }), { headers: { 'Content-Type': 'application/json' } }), { timeoutMs: 100 });
  const pending = s.client.sendTemplate(template); await reading; await Promise.resolve(); t.mock.timers.tick(100);
  await assert.rejects(pending, errorIs('timeout', 'uncertain')); assert.equal(cancelled, true); assert.equal(s.calls.length, 1);
});
